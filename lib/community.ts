import {
  APPWRITE_CONFIG,
  COLLECTIONS,
  createAppwriteContentError,
  createAppwritePermissionMessage,
  DB_ID,
  getAppwriteConfigurationError,
  ID,
  isAppwriteUnauthorizedError,
  Permission,
  Query,
  Role,
  storage,
  tablesDB,
} from "./appwrite"
import {
  type CommentDocument,
  type FlaggedContentDocument,
  type PostDocument,
  type PostLikeDocument,
  type ReplyDocument,
  type SubjectDocument,
  type UserProfileDocument,
} from "./schema"

const COMMUNITY_LIMIT = 200
const MAX_THREAD_PHOTO_SIZE_BYTES = 8 * 1024 * 1024
const UNKNOWN_POST_ATTRIBUTE_PATTERN =
  /unknown attribute|attribute not found|Invalid document structure/i

export type CommunityAuthor = {
  id: string
  name: string
  subtitle: string
  avatarSeed: string
  avatarUrl: string | null
}

export type CommunityReplyItem = {
  id: string
  commentId: string
  content: string
  createdAt: string
  createdAtLabel: string
  author: CommunityAuthor
}

export type CommunityCommentItem = {
  id: string
  postId: string
  content: string
  createdAt: string
  createdAtLabel: string
  author: CommunityAuthor
  replies: CommunityReplyItem[]
}

export type CommunityPostItem = {
  id: string
  userId: string
  title: string
  content: string
  category: string
  subjectId: string | null
  subjectName: string | null
  photoUrl: string | null
  createdAt: string
  createdAtLabel: string
  likesCount: number
  commentsCount: number
  repliesCount: number
  isLiked: boolean
  author: CommunityAuthor
  comments: CommunityCommentItem[]
}

export type CommunityFeed = {
  posts: CommunityPostItem[]
  stats: {
    activeLearners: number
    openTopics: number
    answeredToday: number
  }
}

export type CreateCommunityPostInput = {
  userId: string
  title: string
  content: string
  category: "question" | "discussion" | "tip"
  subjectId?: string
  photoUrl?: string
  author?: CommunityAuthor
}

export type UploadCommunityPostPhotoInput = {
  uri: string
  name: string
  type: string
  size: number
}

function getCommunityPostImagesBucketId() {
  const configured = APPWRITE_CONFIG.communityPostImagesBucketId.trim()

  if (configured) {
    return configured
  }

  const fallback = APPWRITE_CONFIG.profileImagesBucketId.trim()
  if (fallback) {
    return fallback
  }

  throw createAppwriteContentError(
    "config",
    "Missing EXPO_PUBLIC_APPWRITE_COMMUNITY_POST_IMAGES_BUCKET_ID."
  )
}

function ensureCommunityConfigured() {
  const configError = getAppwriteConfigurationError()

  if (configError) {
    throw createAppwriteContentError(
      "config",
      `${configError} Community now loads only from Appwrite.`
    )
  }
}

function toCommunityError(error: unknown, fallback: string) {
  if (isAppwriteUnauthorizedError(error)) {
    return createAppwriteContentError(
      "request",
      createAppwritePermissionMessage([
        COLLECTIONS.POSTS,
        COLLECTIONS.COMMENTS,
        COLLECTIONS.REPLIES,
        COLLECTIONS.POST_LIKES,
      ])
    )
  }

  if (error instanceof Error && error.message) {
    return createAppwriteContentError("request", error.message)
  }

  return createAppwriteContentError("request", fallback)
}

function normalizePhotoUrl(value?: string): string | null {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    throw createAppwriteContentError(
      "request",
      "Photo URL must start with http:// or https://"
    )
  }

  return trimmed
}

function validateUploadCommunityPostPhotoInput(
  input: UploadCommunityPostPhotoInput
) {
  if (!input.uri.trim()) {
    throw createAppwriteContentError(
      "request",
      "Selected image is missing a valid local URI."
    )
  }

  if (!input.type.trim().startsWith("image/")) {
    throw createAppwriteContentError(
      "request",
      "Only image uploads are allowed for thread photos."
    )
  }

  if (input.size <= 0) {
    throw createAppwriteContentError(
      "request",
      "Unable to determine the selected image size."
    )
  }

  if (input.size > MAX_THREAD_PHOTO_SIZE_BYTES) {
    throw createAppwriteContentError(
      "request",
      "Thread photos must be 8 MB or smaller."
    )
  }
}

export async function uploadCommunityPostPhoto(
  input: UploadCommunityPostPhotoInput
): Promise<string> {
  ensureCommunityConfigured()

  const bucketId = getCommunityPostImagesBucketId()
  validateUploadCommunityPostPhotoInput(input)

  const uploadedFile = await storage.createFile({
    bucketId,
    fileId: ID.unique(),
    file: {
      uri: input.uri,
      name: input.name,
      type: input.type,
      size: input.size,
    },
    permissions: [Permission.read(Role.any())],
  })

  return storage
    .getFilePreviewURL(bucketId, uploadedFile.$id, 1200, 1200)
    .toString()
}

function getOwnerPermissions(userId: string) {
  const userRole = Role.user(userId)

  return [
    Permission.read(userRole),
    Permission.update(userRole),
    Permission.delete(userRole),
  ]
}

function toAvatarSeed(name: string) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return initials || "RV"
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return "Just now"
  }

  const deltaMs = Math.max(0, Date.now() - timestamp)
  const deltaMinutes = Math.floor(deltaMs / 60000)

  if (deltaMinutes < 1) {
    return "Just now"
  }

  if (deltaMinutes < 60) {
    return `${deltaMinutes} min ago`
  }

  const deltaHours = Math.floor(deltaMinutes / 60)
  if (deltaHours < 24) {
    return `${deltaHours} hr${deltaHours === 1 ? "" : "s"} ago`
  }

  const deltaDays = Math.floor(deltaHours / 24)
  return `${deltaDays} day${deltaDays === 1 ? "" : "s"} ago`
}

function mapAuthor(
  userId: string,
  profileMap: Map<string, UserProfileDocument>,
  snapshot?: CommunityAuthorSnapshot | null
): CommunityAuthor {
  const profile = profileMap.get(userId)
  const name =
    snapshot?.name ?? profile?.fullName ?? `User ${userId.slice(0, 6)}`
  const avatarUrl = snapshot?.avatarUrl ?? profile?.avatarUrl?.trim() ?? null

  return {
    id: userId,
    name,
    subtitle:
      snapshot?.subtitle ??
      profile?.reviewType ??
      profile?.email ??
      "Community member",
    avatarSeed: toAvatarSeed(name),
    avatarUrl,
  }
}

async function listRowsSafe<T>(tableId: string, queries: string[]) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId,
    queries,
  })

  return rows as unknown as T[]
}

type CommunityFeedRows = {
  posts: PostDocument[]
  comments: CommentDocument[]
  replies: ReplyDocument[]
  postLikes: PostLikeDocument[]
  profiles: UserProfileDocument[]
  subjects: SubjectDocument[]
  flaggedItems: FlaggedContentDocument[]
}

type HiddenCommunityContent = {
  hiddenPostIds: Set<string>
  hiddenCommentIds: Set<string>
  hiddenReplyIds: Set<string>
}

type CommunityPostMappingContext = {
  commentsByPostId: Map<string, CommunityCommentItem[]>
  postLikesByPostId: Map<string, Set<string>>
  subjectMap: Map<string, string>
  profileMap: Map<string, UserProfileDocument>
  currentUserId?: string
}

async function listCommunityFeedRows(): Promise<CommunityFeedRows> {
  const [
    posts,
    comments,
    replies,
    postLikes,
    profiles,
    subjects,
    flaggedItems,
  ] = await Promise.all([
    listRowsSafe<PostDocument>(COLLECTIONS.POSTS, [
      Query.orderDesc("createdAt"),
      Query.limit(COMMUNITY_LIMIT),
    ]),
    listRowsSafe<CommentDocument>(COLLECTIONS.COMMENTS, [
      Query.orderAsc("createdAt"),
      Query.limit(COMMUNITY_LIMIT),
    ]),
    listRowsSafe<ReplyDocument>(COLLECTIONS.REPLIES, [
      Query.orderAsc("createdAt"),
      Query.limit(COMMUNITY_LIMIT),
    ]),
    listRowsSafe<PostLikeDocument>(COLLECTIONS.POST_LIKES, [
      Query.limit(COMMUNITY_LIMIT),
    ]),
    listRowsSafe<UserProfileDocument>(COLLECTIONS.USER_PROFILES, [
      Query.limit(COMMUNITY_LIMIT),
    ]).catch(() => []),
    listRowsSafe<SubjectDocument>(COLLECTIONS.SUBJECTS, [
      Query.orderAsc("order"),
      Query.limit(COMMUNITY_LIMIT),
    ]).catch(() => []),
    listRowsSafe<FlaggedContentDocument>(COLLECTIONS.FLAGGED_CONTENT, [
      Query.limit(COMMUNITY_LIMIT),
    ]).catch(() => []),
  ])

  return {
    posts,
    comments,
    replies,
    postLikes,
    profiles,
    subjects,
    flaggedItems,
  }
}

function buildHiddenCommunityContent(
  flaggedItems: FlaggedContentDocument[]
): HiddenCommunityContent {
  const activeFlags = flaggedItems.filter((flag) => flag.status !== "dismissed")

  return {
    hiddenPostIds: new Set(
      activeFlags
        .filter((flag) => flag.contentType === "post")
        .map((flag) => flag.contentId)
    ),
    hiddenCommentIds: new Set(
      activeFlags
        .filter((flag) => flag.contentType === "comment")
        .map((flag) => flag.contentId)
    ),
    hiddenReplyIds: new Set(
      activeFlags
        .filter((flag) => flag.contentType === "reply")
        .map((flag) => flag.contentId)
    ),
  }
}

function buildProfileMap(profiles: UserProfileDocument[]) {
  return new Map(profiles.map((profile) => [profile.userId, profile]))
}

function buildSubjectMap(subjects: SubjectDocument[]) {
  return new Map(subjects.map((subject) => [subject.$id, subject.name]))
}

function buildPostLikesByPostId(postLikes: PostLikeDocument[]) {
  const postLikesByPostId = new Map<string, Set<string>>()

  for (const like of postLikes) {
    const users = postLikesByPostId.get(like.postId) ?? new Set<string>()
    users.add(like.userId)
    postLikesByPostId.set(like.postId, users)
  }

  return postLikesByPostId
}

function shouldHideReply(
  reply: ReplyDocument,
  hiddenContent: HiddenCommunityContent
) {
  return (
    hiddenContent.hiddenReplyIds.has(reply.$id) ||
    hiddenContent.hiddenCommentIds.has(reply.commentId)
  )
}

function toCommunityReplyItem(
  reply: ReplyDocument,
  profileMap: Map<string, UserProfileDocument>
): CommunityReplyItem {
  return {
    id: reply.$id,
    commentId: reply.commentId,
    content: reply.content,
    createdAt: reply.createdAt,
    createdAtLabel: formatRelativeTime(reply.createdAt),
    author: mapAuthor(reply.userId, profileMap, readAuthorSnapshot(reply)),
  }
}

function buildRepliesByCommentId(
  replies: ReplyDocument[],
  hiddenContent: HiddenCommunityContent,
  profileMap: Map<string, UserProfileDocument>
) {
  const repliesByCommentId = new Map<string, CommunityReplyItem[]>()

  for (const reply of replies) {
    if (shouldHideReply(reply, hiddenContent)) {
      continue
    }

    const current = repliesByCommentId.get(reply.commentId) ?? []
    current.push(toCommunityReplyItem(reply, profileMap))
    repliesByCommentId.set(reply.commentId, current)
  }

  return repliesByCommentId
}

function shouldHideComment(
  comment: CommentDocument,
  hiddenContent: HiddenCommunityContent
) {
  return (
    hiddenContent.hiddenCommentIds.has(comment.$id) ||
    hiddenContent.hiddenPostIds.has(comment.postId)
  )
}

function toCommunityCommentItem(
  comment: CommentDocument,
  profileMap: Map<string, UserProfileDocument>,
  repliesByCommentId: Map<string, CommunityReplyItem[]>
): CommunityCommentItem {
  return {
    id: comment.$id,
    postId: comment.postId,
    content: comment.content,
    createdAt: comment.createdAt,
    createdAtLabel: formatRelativeTime(comment.createdAt),
    author: mapAuthor(comment.userId, profileMap, readAuthorSnapshot(comment)),
    replies: repliesByCommentId.get(comment.$id) ?? [],
  }
}

function buildCommentsByPostId(
  comments: CommentDocument[],
  hiddenContent: HiddenCommunityContent,
  profileMap: Map<string, UserProfileDocument>,
  repliesByCommentId: Map<string, CommunityReplyItem[]>
) {
  const commentsByPostId = new Map<string, CommunityCommentItem[]>()

  for (const comment of comments) {
    if (shouldHideComment(comment, hiddenContent)) {
      continue
    }

    const current = commentsByPostId.get(comment.postId) ?? []
    current.push(
      toCommunityCommentItem(comment, profileMap, repliesByCommentId)
    )
    commentsByPostId.set(comment.postId, current)
  }

  return commentsByPostId
}

function mapCommunityPost(
  post: PostDocument,
  context: CommunityPostMappingContext
): CommunityPostItem {
  const threadComments = context.commentsByPostId.get(post.$id) ?? []
  const repliesCount = threadComments.reduce(
    (count, comment) => count + comment.replies.length,
    0
  )
  const likedUsers =
    context.postLikesByPostId.get(post.$id) ?? new Set<string>()

  return {
    id: post.$id,
    userId: post.userId,
    title: post.title,
    content: post.content,
    category: post.category,
    subjectId: post.subjectId ?? null,
    subjectName: post.subjectId
      ? (context.subjectMap.get(post.subjectId) ?? null)
      : null,
    photoUrl: post.photoUrl?.trim() || null,
    createdAt: post.createdAt,
    createdAtLabel: formatRelativeTime(post.createdAt),
    likesCount: likedUsers.size || post.likesCount,
    commentsCount: threadComments.length,
    repliesCount,
    isLiked: context.currentUserId
      ? likedUsers.has(context.currentUserId)
      : false,
    author: mapAuthor(
      post.userId,
      context.profileMap,
      readAuthorSnapshot(post)
    ),
    comments: threadComments,
  }
}

function buildCommunityFeedStats(
  posts: CommunityPostItem[]
): CommunityFeed["stats"] {
  return {
    activeLearners: new Set(posts.map((post) => post.userId)).size,
    openTopics: posts.length,
    answeredToday: posts.filter((post) => post.commentsCount > 0).length,
  }
}

export async function listCommunityFeed(
  currentUserId?: string
): Promise<CommunityFeed> {
  ensureCommunityConfigured()

  try {
    const {
      posts,
      comments,
      replies,
      postLikes,
      profiles,
      subjects,
      flaggedItems,
    } = await listCommunityFeedRows()

    const hiddenContent = buildHiddenCommunityContent(flaggedItems)
    const profileMap = buildProfileMap(profiles)
    const subjectMap = buildSubjectMap(subjects)
    const postLikesByPostId = buildPostLikesByPostId(postLikes)
    const repliesByCommentId = buildRepliesByCommentId(
      replies,
      hiddenContent,
      profileMap
    )
    const commentsByPostId = buildCommentsByPostId(
      comments,
      hiddenContent,
      profileMap,
      repliesByCommentId
    )

    const mappedPosts = posts
      .filter((post) => !hiddenContent.hiddenPostIds.has(post.$id))
      .map((post) =>
        mapCommunityPost(post, {
          commentsByPostId,
          postLikesByPostId,
          subjectMap,
          profileMap,
          currentUserId,
        })
      )

    return {
      posts: mappedPosts,
      stats: buildCommunityFeedStats(mappedPosts),
    }
  } catch (error) {
    throw toCommunityError(
      error,
      "Unable to load community posts from Appwrite."
    )
  }
}

type CommunityPostPayload = {
  userId: string
  title: string
  content: string
  category: CreateCommunityPostInput["category"]
  likesCount: number
  createdAt: string
  subjectId?: string
  photoUrl?: string
  authorName?: string
  authorSubtitle?: string
  authorAvatarUrl?: string
}

type CreateCommunityPostRetryPayload = Omit<
  CommunityPostPayload,
  "photoUrl" | "authorName" | "authorSubtitle" | "authorAvatarUrl"
>

type CommunityAuthorSnapshot = {
  name: string
  subtitle: string
  avatarUrl: string | null
}

function readAuthorSnapshot(row: unknown): CommunityAuthorSnapshot | null {
  if (!row || typeof row !== "object") {
    return null
  }

  const record = row as Record<string, unknown>
  const name =
    typeof record.authorName === "string" ? record.authorName.trim() : ""
  const subtitle =
    typeof record.authorSubtitle === "string"
      ? record.authorSubtitle.trim()
      : ""
  const avatarUrl =
    typeof record.authorAvatarUrl === "string"
      ? record.authorAvatarUrl.trim() || null
      : null

  if (!name) {
    return null
  }

  return {
    name,
    subtitle: subtitle || "Community member",
    avatarUrl,
  }
}

async function createCommunityPostRow(
  payload: CommunityPostPayload | CreateCommunityPostRetryPayload,
  userId: string
) {
  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.POSTS,
    rowId: ID.unique(),
    data: payload,
    permissions: getOwnerPermissions(userId),
  })
}

function isUnknownPostAttributeError(error: unknown) {
  return (
    error instanceof Error && UNKNOWN_POST_ATTRIBUTE_PATTERN.test(error.message)
  )
}

function shouldRetryCreatePostWithoutOptionalFields(
  payload: CommunityPostPayload,
  error: unknown
) {
  return (
    isUnknownPostAttributeError(error) &&
    Boolean(
      payload.photoUrl ||
      payload.authorName ||
      payload.authorSubtitle ||
      payload.authorAvatarUrl
    )
  )
}

export async function createCommunityPost(input: CreateCommunityPostInput) {
  ensureCommunityConfigured()

  const photoUrl = normalizePhotoUrl(input.photoUrl)

  const payload: CommunityPostPayload = {
    userId: input.userId,
    title: input.title,
    content: input.content,
    category: input.category,
    ...(input.subjectId ? { subjectId: input.subjectId } : {}),
    ...(photoUrl ? { photoUrl } : {}),
    ...(input.author
      ? {
          authorName: input.author.name,
          authorSubtitle: input.author.subtitle,
          ...(input.author.avatarUrl
            ? { authorAvatarUrl: input.author.avatarUrl }
            : {}),
        }
      : {}),
    likesCount: 0,
    createdAt: new Date().toISOString(),
  }

  try {
    await createCommunityPostRow(payload, input.userId)
  } catch (error) {
    // If Appwrite posts schema has not yet been updated with optional fields,
    // retry once without them so posting still works.
    if (shouldRetryCreatePostWithoutOptionalFields(payload, error)) {
      try {
        const {
          photoUrl: _photoUrl,
          authorName: _authorName,
          authorSubtitle: _authorSubtitle,
          authorAvatarUrl: _authorAvatarUrl,
          ...payloadWithoutPhoto
        } = payload
        await createCommunityPostRow(payloadWithoutPhoto, input.userId)
        return
      } catch {
        // Fall through to canonical error handling below.
      }
    }

    throw toCommunityError(error, "Unable to create the discussion post.")
  }
}

type CreateCommunityThreadEntryInput = {
  tableId: string
  userId: string
  content: string
  parentField: "postId" | "commentId"
  parentId: string
  fallbackMessage: string
  author?: CommunityAuthor
}

async function createCommunityThreadEntry(
  input: CreateCommunityThreadEntryInput
) {
  try {
    await tablesDB.createRow({
      databaseId: DB_ID,
      tableId: input.tableId,
      rowId: ID.unique(),
      data: {
        [input.parentField]: input.parentId,
        userId: input.userId,
        content: input.content,
        ...(input.author
          ? {
              authorName: input.author.name,
              authorSubtitle: input.author.subtitle,
              ...(input.author.avatarUrl
                ? { authorAvatarUrl: input.author.avatarUrl }
                : {}),
            }
          : {}),
        likesCount: 0,
        createdAt: new Date().toISOString(),
      },
      permissions: getOwnerPermissions(input.userId),
    })
  } catch (error) {
    if (
      error instanceof Error &&
      UNKNOWN_POST_ATTRIBUTE_PATTERN.test(error.message)
    ) {
      try {
        await tablesDB.createRow({
          databaseId: DB_ID,
          tableId: input.tableId,
          rowId: ID.unique(),
          data: {
            [input.parentField]: input.parentId,
            userId: input.userId,
            content: input.content,
            likesCount: 0,
            createdAt: new Date().toISOString(),
          },
          permissions: getOwnerPermissions(input.userId),
        })
        return
      } catch (retryError) {
        throw toCommunityError(retryError, input.fallbackMessage)
      }
    }
    throw toCommunityError(error, input.fallbackMessage)
  }
}

export async function createCommunityComment(input: {
  userId: string
  postId: string
  content: string
  author?: CommunityAuthor
}) {
  ensureCommunityConfigured()

  await createCommunityThreadEntry({
    tableId: COLLECTIONS.COMMENTS,
    userId: input.userId,
    content: input.content,
    parentField: "postId",
    parentId: input.postId,
    fallbackMessage: "Unable to add the comment.",
    author: input.author,
  })
}

export async function createCommunityReply(input: {
  userId: string
  commentId: string
  content: string
  author?: CommunityAuthor
}) {
  ensureCommunityConfigured()

  await createCommunityThreadEntry({
    tableId: COLLECTIONS.REPLIES,
    userId: input.userId,
    content: input.content,
    parentField: "commentId",
    parentId: input.commentId,
    fallbackMessage: "Unable to add the reply.",
    author: input.author,
  })
}

export async function toggleCommunityPostLike(input: {
  userId: string
  postId: string
  currentlyLiked: boolean
}) {
  ensureCommunityConfigured()

  try {
    const existingLikes = await listRowsSafe<PostLikeDocument>(
      COLLECTIONS.POST_LIKES,
      [
        Query.equal("postId", input.postId),
        Query.equal("userId", input.userId),
        Query.limit(1),
      ]
    )

    if (input.currentlyLiked && existingLikes[0]) {
      await tablesDB.deleteRow({
        databaseId: DB_ID,
        tableId: COLLECTIONS.POST_LIKES,
        rowId: existingLikes[0].$id,
      })
    } else if (!input.currentlyLiked) {
      await tablesDB.createRow({
        databaseId: DB_ID,
        tableId: COLLECTIONS.POST_LIKES,
        rowId: ID.unique(),
        data: {
          postId: input.postId,
          userId: input.userId,
        },
        permissions: getOwnerPermissions(input.userId),
      })
    }

    const post = (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.POSTS,
      rowId: input.postId,
    })) as unknown as PostDocument

    const nextLikesCount = Math.max(
      0,
      post.likesCount + (input.currentlyLiked ? -1 : 1)
    )

    await tablesDB.updateRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.POSTS,
      rowId: input.postId,
      data: {
        likesCount: nextLikesCount,
      },
    })
  } catch (error) {
    throw toCommunityError(error, "Unable to update the post like.")
  }
}
