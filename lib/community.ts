import {
  APPWRITE_CONFIG,
  COLLECTIONS,
  createAppwriteContentError,
  createAppwritePermissionMessage,
  DB_ID,
  ExecutionMethod,
  getAppwriteConfigurationError,
  ID,
  isAppwriteUnauthorizedError,
  Permission,
  Query,
  Role,
  functions,
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

const COMMUNITY_POST_PAGE_SIZE = 25
const COMMUNITY_RELATION_PAGE_SIZE = 100
const COMMUNITY_QUERY_VALUE_CHUNK_SIZE = 100
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

export type CommunityFeedPage = CommunityFeed & {
  hasMore: boolean
  nextCursor: string | null
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

function chunkValues(values: string[], size: number) {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)))
  const chunks: string[][] = []

  for (let index = 0; index < uniqueValues.length; index += size) {
    chunks.push(uniqueValues.slice(index, index + size))
  }

  return chunks
}

/**
 * Builds a deterministic row ID for a post_like record.
 * Encoding (postId, userId) into the ID makes the row naturally unique
 * at the application level — concurrent like requests for the same pair
 * will collide on insert (409) rather than creating duplicate rows.
 */
function buildDeterministicLikeRowId(postId: string, userId: string): string {
  // FNV-1a 32-bit hash — same algorithm used in progress/utils.ts
  const input = `${postId}|${userId}`
  let hash = 0x811c9dc5

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return `like_${(hash >>> 0).toString(36).padStart(7, "0")}`
}

function isAppwriteNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 404
  )
}

function isAppwriteConflictError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 409
  )
}

async function listPaginatedRowsSafe<T extends { $id: string }>(
  tableId: string,
  queries: string[],
  pageSize = COMMUNITY_RELATION_PAGE_SIZE
) {
  const rows: T[] = []
  let cursorAfterId: string | null = null

  while (true) {
    const page: T[] = await listRowsSafe<T>(tableId, [
      ...queries,
      Query.limit(pageSize),
      ...(cursorAfterId ? [Query.cursorAfter(cursorAfterId)] : []),
    ])

    rows.push(...page)

    if (page.length < pageSize) {
      return rows
    }

    cursorAfterId = page[page.length - 1]?.$id ?? null

    if (!cursorAfterId) {
      return rows
    }
  }
}

async function listRowsByFieldValues<T extends { $id: string }>(
  tableId: string,
  field: string,
  values: string[],
  queries: string[],
  options?: {
    pageSize?: number
    fallbackValue?: T[]
  }
) {
  const valueChunks = chunkValues(values, COMMUNITY_QUERY_VALUE_CHUNK_SIZE)

  if (valueChunks.length === 0) {
    return [] as T[]
  }

  const results = await Promise.all(
    valueChunks.map((chunk) =>
      listPaginatedRowsSafe<T>(
        tableId,
        [Query.equal(field, chunk), ...queries],
        options?.pageSize
      ).catch((error) => {
        if (options?.fallbackValue) {
          return options.fallbackValue
        }

        throw error
      })
    )
  )

  return results.flat()
}

type CommunityFeedRows = {
  posts: PostDocument[]
  comments: CommentDocument[]
  replies: ReplyDocument[]
  postLikesByPostId: Map<string, Set<string>>
  likedPostIds: Set<string>
  subjects: SubjectDocument[]
  flaggedItems: FlaggedContentDocument[]
  hasMore: boolean
  nextCursor: string | null
}

type HiddenCommunityContent = {
  hiddenPostIds: Set<string>
  hiddenCommentIds: Set<string>
  hiddenReplyIds: Set<string>
}

type CommunityPostMappingContext = {
  commentsByPostId: Map<string, CommunityCommentItem[]>
  postLikesByPostId: Map<string, Set<string>>
  likedPostIds: Set<string>
  subjectMap: Map<string, string>
  profileMap: Map<string, UserProfileDocument>
  currentUserId?: string
}

async function listCommunityFeedRows(
  currentUserId?: string,
  cursorAfter?: string | null
): Promise<CommunityFeedRows> {
  const rows = await listRowsSafe<PostDocument>(COLLECTIONS.POSTS, [
    Query.orderDesc("createdAt"),
    Query.limit(COMMUNITY_POST_PAGE_SIZE + 1),
    ...(cursorAfter ? [Query.cursorAfter(cursorAfter)] : []),
  ])
  const hasMore = rows.length > COMMUNITY_POST_PAGE_SIZE
  const posts = rows.slice(0, COMMUNITY_POST_PAGE_SIZE)
  const nextCursor = hasMore ? posts[posts.length - 1]?.$id ?? null : null

  const postIds = posts.map((post) => post.$id)
  const postFlags = await listRowsByFieldValues<FlaggedContentDocument>(
    COLLECTIONS.FLAGGED_CONTENT,
    "contentId",
    postIds,
    [Query.equal("contentType", "post")],
    { fallbackValue: [] }
  )
  const hiddenPostIds = buildHiddenCommunityContent(postFlags).hiddenPostIds
  const visiblePostIds = posts
    .filter((post) => !hiddenPostIds.has(post.$id))
    .map((post) => post.$id)

  if (visiblePostIds.length === 0) {
    return {
      posts,
      comments: [],
      replies: [],
      postLikesByPostId: new Map<string, Set<string>>(),
      likedPostIds: new Set<string>(),
      subjects: [],
      flaggedItems: postFlags,
      hasMore,
      nextCursor,
    }
  }

  const [comments, subjects, postLikes] = await Promise.all([
    listRowsByFieldValues<CommentDocument>(
      COLLECTIONS.COMMENTS,
      "postId",
      visiblePostIds,
      [Query.orderAsc("createdAt")]
    ),
    listRowsByFieldValues<SubjectDocument>(
      COLLECTIONS.SUBJECTS,
      "$id",
      posts
        .map((post) => post.subjectId)
        .filter((subjectId): subjectId is string => Boolean(subjectId)),
      [Query.orderAsc("order")],
      { fallbackValue: [] }
    ),
    listRowsByFieldValues<PostLikeDocument>(
      COLLECTIONS.POST_LIKES,
      "postId",
      visiblePostIds,
      [],
      {
        fallbackValue: [],
        pageSize: COMMUNITY_RELATION_PAGE_SIZE,
      }
    ),
  ])

  const commentIds = comments.map((comment) => comment.$id)
  const [commentFlags, replies] = await Promise.all([
    listRowsByFieldValues<FlaggedContentDocument>(
      COLLECTIONS.FLAGGED_CONTENT,
      "contentId",
      commentIds,
      [Query.equal("contentType", "comment")],
      { fallbackValue: [] }
    ),
    listRowsByFieldValues<ReplyDocument>(
      COLLECTIONS.REPLIES,
      "commentId",
      commentIds,
      [Query.orderAsc("createdAt")]
    ),
  ])

  const replyFlags = await listRowsByFieldValues<FlaggedContentDocument>(
    COLLECTIONS.FLAGGED_CONTENT,
    "contentId",
    replies.map((reply) => reply.$id),
    [Query.equal("contentType", "reply")],
    { fallbackValue: [] }
  )

  const postLikesByPostId = new Map<string, Set<string>>()
  for (const like of postLikes) {
    const users = postLikesByPostId.get(like.postId) ?? new Set<string>()
    users.add(like.userId)
    postLikesByPostId.set(like.postId, users)
  }

  return {
    posts,
    comments,
    replies,
    postLikesByPostId,
    likedPostIds: currentUserId
      ? new Set(
          postLikes
            .filter((like) => like.userId === currentUserId)
            .map((like) => like.postId)
        )
      : new Set<string>(),
    subjects,
    flaggedItems: [...postFlags, ...commentFlags, ...replyFlags],
    hasMore,
    nextCursor,
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

function buildSubjectMap(subjects: SubjectDocument[]) {
  return new Map(subjects.map((subject) => [subject.$id, subject.name]))
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
    likesCount: likedUsers.size,
    commentsCount: threadComments.length,
    repliesCount,
    isLiked: context.currentUserId
      ? context.likedPostIds.has(post.$id)
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

export async function listCommunityFeedPage(options: {
  currentUserId?: string
  cursorAfter?: string | null
} = {}): Promise<CommunityFeedPage> {
  ensureCommunityConfigured()

  try {
    const {
      posts,
      comments,
      replies,
      postLikesByPostId,
      likedPostIds,
      subjects,
      flaggedItems,
      hasMore,
      nextCursor,
    } = await listCommunityFeedRows(
      options.currentUserId,
      options.cursorAfter
    )

    const hiddenContent = buildHiddenCommunityContent(flaggedItems)
    const profileMap = new Map<string, UserProfileDocument>()
    const subjectMap = buildSubjectMap(subjects)
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
          likedPostIds,
          subjectMap,
          profileMap,
          currentUserId: options.currentUserId,
        })
      )

    return {
      posts: mappedPosts,
      stats: buildCommunityFeedStats(mappedPosts),
      hasMore,
      nextCursor,
    }
  } catch (error) {
    throw toCommunityError(
      error,
      "Unable to load community posts from Appwrite."
    )
  }
}

export async function listCommunityFeed(
  currentUserId?: string
): Promise<CommunityFeed> {
  const page = await listCommunityFeedPage({ currentUserId })

  return {
    posts: page.posts,
    stats: page.stats,
  }
}

type ToggleCommunityPostLikeFunctionResponse = {
  ok?: boolean
  postId?: string
  userId?: string
  isLiked?: boolean
  likesCount?: number
  message?: string
}

export type ToggleCommunityPostLikeResult = {
  isLiked: boolean
  likesCount: number
}

async function executeCommunityPostLikeFunction(input: {
  postId: string
  currentlyLiked: boolean
}) {
  const functionId = APPWRITE_CONFIG.communityPostLikeFunctionId

  if (!functionId) {
    return null
  }

  try {
    return await functions.createExecution({
      functionId,
      body: JSON.stringify(input),
      async: false,
      xpath: "/",
      method: ExecutionMethod.POST,
      headers: {
        "content-type": "application/json",
      },
    })
  } catch {
    return null
  }
}

function parseToggleCommunityPostLikePayload(responseBody: string) {
  if (!responseBody) {
    return null
  }

  try {
    return JSON.parse(responseBody) as ToggleCommunityPostLikeFunctionResponse
  } catch {
    return null
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
}): Promise<ToggleCommunityPostLikeResult> {
  ensureCommunityConfigured()

  try {
    const functionExecution = await executeCommunityPostLikeFunction({
      postId: input.postId,
      currentlyLiked: input.currentlyLiked,
    })

    const functionPayload = parseToggleCommunityPostLikePayload(
      functionExecution?.responseBody ?? ""
    )

    if (
      functionExecution &&
      functionExecution.responseStatusCode < 400 &&
      functionPayload?.ok !== false &&
      typeof functionPayload?.isLiked === "boolean" &&
      typeof functionPayload?.likesCount === "number"
    ) {
      return {
        isLiked: functionPayload.isLiked,
        likesCount: functionPayload.likesCount,
      }
    }

    // Fallback path (when Appwrite Function is unavailable).
    // Uses a deterministic row ID so concurrent like requests from the
    // same user can never create duplicate post_like rows.
    const likeRowId = buildDeterministicLikeRowId(input.postId, input.userId)

    if (input.currentlyLiked) {
      // Unlike: delete the like row; ignore 404 (already unliked)
      try {
        await tablesDB.deleteRow({
          databaseId: DB_ID,
          tableId: COLLECTIONS.POST_LIKES,
          rowId: likeRowId,
        })
      } catch (error) {
        if (!isAppwriteNotFoundError(error)) {
          throw error
        }
      }
    } else {
      // Like: create the like row; ignore 409 (already liked)
      try {
        await tablesDB.createRow({
          databaseId: DB_ID,
          tableId: COLLECTIONS.POST_LIKES,
          rowId: likeRowId,
          data: {
            postId: input.postId,
            userId: input.userId,
          },
          permissions: getOwnerPermissions(input.userId),
        })
      } catch (error) {
        if (!isAppwriteConflictError(error)) {
          throw error
        }
      }
    }

    // Derive likesCount from the source of truth (post_likes rows)
    // instead of reading post.likesCount and incrementing — avoids the
    // read-modify-write race condition under concurrent users.
    const { total: likesCount } = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: COLLECTIONS.POST_LIKES,
      queries: [
        Query.equal("postId", input.postId),
        Query.limit(1),
      ],
    })

    await tablesDB.updateRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.POSTS,
      rowId: input.postId,
      data: {
        likesCount: Math.max(0, likesCount),
      },
    })

    return {
      isLiked: !input.currentlyLiked,
      likesCount: Math.max(0, likesCount),
    }
  } catch (error) {
    throw toCommunityError(error, "Unable to update the post like.")
  }
}
