import {
  APPWRITE_CONFIG,
  COLLECTIONS,
  createAppwriteContentError,
  createAppwritePermissionMessage,
  DB_ID,
  ExecutionMethod,
  getAppwriteConfigurationError,
  ID,
  isAppwriteConflictError,
  isAppwriteInvalidStructureError,
  isAppwriteNotFoundError,
  isAppwriteUnauthorizedError,
  Permission,
  Query,
  Role,
  functions,
  storage,
  tablesDB,
} from "../appwrite"
import {
  ownedRowPermissions,
  type CommentDocument,
  type PostDocument,
  type PostLikeDocument,
  type ReplyDocument,
  type SubjectDocument,
} from "../schema"
import {
  getAuthorsByIds,
  toCommunityAuthor,
  type CommunityAuthor,
} from "./authors"

// The v4 split. Each of these owns one idea, and each is testable without the
// feed: who wrote a row, who a member does not want to see, and whether a row
// is still visible.
export {
  getAuthor,
  getAuthorsByIds,
  toAvatarSeed,
  toCommunityAuthor,
} from "./authors"
export {
  blockMember,
  filterBlocked,
  listBlockedUserIds,
  unblockMember,
} from "./blocks"
export {
  restoreSoftDeleted,
  softDelete,
  VISIBLE_ONLY,
  type SoftDeletableTable,
} from "./visibility"
import { filterBlocked, listBlockedUserIds } from "./blocks"
import { VISIBLE_ONLY } from "./visibility"

const COMMUNITY_POST_PAGE_SIZE = 25
const COMMUNITY_RELATION_PAGE_SIZE = 100
const COMMUNITY_QUERY_VALUE_CHUNK_SIZE = 100
/** Ceiling for cursor paging of a single relation set (100 × 50 = 5,000 rows). */
const COMMUNITY_MAX_RELATION_PAGES = 50
const MAX_THREAD_PHOTO_SIZE_BYTES = 8 * 1024 * 1024
const UNKNOWN_POST_ATTRIBUTE_PATTERN =
  /unknown attribute|attribute not found|Invalid document structure/i

export type { CommunityAuthor }

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

/**
 * The permissions a community row is created with.
 *
 * `posts`, `comments` and `replies` are `member_shared`: the table already
 * grants every member read and update — update is the price of a denormalised
 * `likesCount`, since Appwrite cannot scope a grant to one column. These row
 * permissions are what keep **delete** to the author.
 *
 * From the schema, so the app and the CMS cannot drift on what ownership means.
 */
function getOwnerPermissions(userId: string) {
  return ownedRowPermissions(userId)
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
 * Deterministic row ID for a post_like record.
 *
 * Encoding (postId, userId) into the ID makes the row unique at the application
 * level: concurrent likes for the same pair collide on insert (409) instead of
 * creating duplicate rows.
 *
 * Must stay byte-identical to `toLikeRowId` in
 * functions/community-post-like-toggle/src/main.js, or the two paths write the
 * same like under two different IDs and the count doubles. Kept in sync by
 * hand because the function bundle cannot import from lib/.
 */
const LIKE_HASH_OFFSET_BASES = [0x811c9dc5, 0x01000193, 0x9dc5811c]

function hashLikeKey(input: string, offsetBasis: number): string {
  let hash = offsetBasis

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(36).padStart(7, "0")
}

export function buildDeterministicLikeRowId(
  postId: string,
  userId: string
): string {
  // 96 bits (21 chars) rather than the original 32. These are row IDs, so a
  // collision silently blocked one user's like or unliked a different row —
  // 2^32 is only ~9,300 likes for a 1% chance of some collision.
  const input = `${postId}|${userId}`

  return `like_${LIKE_HASH_OFFSET_BASES.map((basis) =>
    hashLikeKey(input, basis)
  ).join("")}`
}

/** The pre-widening 32-bit ID. Reads and deletes fall back to it. */
function buildLegacyLikeRowId(postId: string, userId: string): string {
  return `like_${hashLikeKey(`${postId}|${userId}`, LIKE_HASH_OFFSET_BASES[0])}`
}

async function listPaginatedRowsSafe<T extends { $id: string }>(
  tableId: string,
  queries: string[],
  pageSize = COMMUNITY_RELATION_PAGE_SIZE
) {
  const rows: T[] = []
  let cursorAfterId: string | null = null

  // Bounded so a cursor that stops advancing (or a genuinely huge relation set)
  // can't spin forever or pull an unbounded result into memory. Hitting the
  // ceiling is reported rather than silently returning a partial list.
  for (let page = 0; page < COMMUNITY_MAX_RELATION_PAGES; page += 1) {
    const nextPage: T[] = await listRowsSafe<T>(tableId, [
      ...queries,
      Query.limit(pageSize),
      ...(cursorAfterId ? [Query.cursorAfter(cursorAfterId)] : []),
    ])

    rows.push(...nextPage)

    if (nextPage.length < pageSize) {
      return rows
    }

    const nextCursor = nextPage[nextPage.length - 1]?.$id ?? null

    // No cursor, or a cursor that didn't move: stop instead of re-requesting
    // the same page forever.
    if (!nextCursor || nextCursor === cursorAfterId) {
      return rows
    }

    cursorAfterId = nextCursor
  }

  console.warn(
    `[community] listPaginatedRowsSafe: ${tableId} hit the ${COMMUNITY_MAX_RELATION_PAGES}-page ceiling (${rows.length} rows). Results are truncated — narrow the query or paginate at the call site.`
  )

  return rows
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
  authorMap: Map<string, CommunityAuthor>
  currentUserId?: string
}

async function listCommunityFeedRows(
  currentUserId?: string,
  cursorAfter?: string | null
): Promise<CommunityFeedRows> {
  const rows = await listRowsSafe<PostDocument>(COLLECTIONS.POSTS, [
    // v4: removal is a flag, not a delete (section 21). Without this the feed
    // renders posts their authors already took down.
    ...VISIBLE_ONLY,
    Query.orderDesc("createdAt"),
    Query.limit(COMMUNITY_POST_PAGE_SIZE + 1),
    ...(cursorAfter ? [Query.cursorAfter(cursorAfter)] : []),
  ])
  const hasMore = rows.length > COMMUNITY_POST_PAGE_SIZE
  const posts = rows.slice(0, COMMUNITY_POST_PAGE_SIZE)
  const nextCursor = hasMore ? posts[posts.length - 1]?.$id ?? null : null

  const visiblePostIds = posts.map((post) => post.$id)

  if (visiblePostIds.length === 0) {
    return {
      posts,
      comments: [],
      replies: [],
      postLikesByPostId: new Map<string, Set<string>>(),
      likedPostIds: new Set<string>(),
      subjects: [],
      hasMore,
      nextCursor,
    }
  }

  const [comments, subjects, postLikes] = await Promise.all([
    listRowsByFieldValues<CommentDocument>(
      COLLECTIONS.COMMENTS,
      "postId",
      visiblePostIds,
      [...VISIBLE_ONLY, Query.orderAsc("createdAt")]
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
  const replies = await listRowsByFieldValues<ReplyDocument>(
    COLLECTIONS.REPLIES,
    "commentId",
    commentIds,
    [...VISIBLE_ONLY, Query.orderAsc("createdAt")]
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
    hasMore,
    nextCursor,
  }
}

/**
 * Nothing is hidden client-side.
 *
 * The feed used to query `flagged_content` and filter reported posts out here.
 * That could never have worked: the table is `member_submit` — create-only,
 * with **no read at all** — so those three requests 401'd on every feed load
 * and fell back to an empty list, which is the same answer this constant gives
 * for free. A member must not be able to see what has been reported, which is
 * exactly why the table is shaped that way (sections 10 and 11).
 *
 * Moderation is the dashboard's: the team unpublishes the post, and it stops
 * coming back from the query. The plumbing below stays because a server-side
 * hidden list is the shape a real fix would take.
 */
const NO_HIDDEN_CONTENT: HiddenCommunityContent = {
  hiddenPostIds: new Set(),
  hiddenCommentIds: new Set(),
  hiddenReplyIds: new Set(),
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
  authorMap: Map<string, CommunityAuthor>
): CommunityReplyItem {
  return {
    id: reply.$id,
    commentId: reply.commentId,
    content: reply.content,
    createdAt: reply.createdAt,
    createdAtLabel: formatRelativeTime(reply.createdAt),
    author: authorMap.get(reply.userId) ?? toCommunityAuthor(reply.userId),
  }
}

function buildRepliesByCommentId(
  replies: ReplyDocument[],
  hiddenContent: HiddenCommunityContent,
  authorMap: Map<string, CommunityAuthor>
) {
  const repliesByCommentId = new Map<string, CommunityReplyItem[]>()

  for (const reply of replies) {
    if (shouldHideReply(reply, hiddenContent)) {
      continue
    }

    const current = repliesByCommentId.get(reply.commentId) ?? []
    current.push(toCommunityReplyItem(reply, authorMap))
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
  authorMap: Map<string, CommunityAuthor>,
  repliesByCommentId: Map<string, CommunityReplyItem[]>
): CommunityCommentItem {
  return {
    id: comment.$id,
    postId: comment.postId,
    content: comment.content,
    createdAt: comment.createdAt,
    createdAtLabel: formatRelativeTime(comment.createdAt),
    author: authorMap.get(comment.userId) ?? toCommunityAuthor(comment.userId),
    replies: repliesByCommentId.get(comment.$id) ?? [],
  }
}

function buildCommentsByPostId(
  comments: CommentDocument[],
  hiddenContent: HiddenCommunityContent,
  authorMap: Map<string, CommunityAuthor>,
  repliesByCommentId: Map<string, CommunityReplyItem[]>
) {
  const commentsByPostId = new Map<string, CommunityCommentItem[]>()

  for (const comment of comments) {
    if (shouldHideComment(comment, hiddenContent)) {
      continue
    }

    const current = commentsByPostId.get(comment.postId) ?? []
    current.push(
      toCommunityCommentItem(comment, authorMap, repliesByCommentId)
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
    author:
      context.authorMap.get(post.userId) ?? toCommunityAuthor(post.userId),
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
      hasMore,
      nextCursor,
    } = await listCommunityFeedRows(
      options.currentUserId,
      options.cursorAfter
    )

    const hiddenContent = NO_HIDDEN_CONTENT
    const subjectMap = buildSubjectMap(subjects)

    // One batched read for every author on the page — posts, comments and
    // replies together — rather than one per row. Identity moved out of
    // `user_profiles` in v4, because that table carries an email address and a
    // PRC licence number and was readable by every signed-in account.
    const [authorMap, blockedUserIds] = await Promise.all([
      getAuthorsByIds([
        ...posts.map((post) => post.userId),
        ...comments.map((comment) => comment.userId),
        ...replies.map((reply) => reply.userId),
      ]),
      // Applied here because Appwrite has no `NOT IN` across tables. Blocking
      // is about not having to see someone; it does not stop them posting.
      listBlockedUserIds(options.currentUserId ?? ""),
    ])

    const repliesByCommentId = buildRepliesByCommentId(
      filterBlocked(replies, blockedUserIds),
      hiddenContent,
      authorMap
    )
    const commentsByPostId = buildCommentsByPostId(
      filterBlocked(comments, blockedUserIds),
      hiddenContent,
      authorMap,
      repliesByCommentId
    )

    const mappedPosts = filterBlocked(posts, blockedUserIds)
      .filter((post) => !hiddenContent.hiddenPostIds.has(post.$id))
      .map((post) =>
        mapCommunityPost(post, {
          commentsByPostId,
          postLikesByPostId,
          likedPostIds,
          subjectMap,
          authorMap,
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

/**
 * What a new post actually carries.
 *
 * Two things left in v4. `likesCount` is **read-only** — the counter is a
 * reconciled cache now, and writing it is rejected; that grant is what used to
 * let any member edit any other member's post, so it is gone with the need for
 * it. And `authorName` / `authorSubtitle` / `authorAvatarUrl` were never
 * columns at all: the app wrote them, Appwrite rejected the row, and a retry
 * quietly re-sent it without them — which is why every byline in the feed read
 * "Community member". Identity lives in `user_public_profiles` now.
 */
type CommunityPostPayload = {
  userId: string
  title: string
  content: string
  category: CreateCommunityPostInput["category"]
  /** Required, and the flag every read filters on (section 21). */
  isDeleted: boolean
  createdAt: string
  subjectId?: string
  photoUrl?: string
}

type CreateCommunityPostRetryPayload = Omit<CommunityPostPayload, "photoUrl">

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
  // `document_invalid_structure` is Appwrite's stable error type for a payload
  // that does not match the collection schema. The message regex below is only
  // a fallback for older servers — matching on prose alone meant this silently
  // stopped firing whenever Appwrite reworded the string.
  return (
    isAppwriteInvalidStructureError(error) ||
    (error instanceof Error &&
      UNKNOWN_POST_ATTRIBUTE_PATTERN.test(error.message))
  )
}

function shouldRetryCreatePostWithoutOptionalFields(
  payload: CommunityPostPayload,
  error: unknown
) {
  return isUnknownPostAttributeError(error) && Boolean(payload.photoUrl)
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
    isDeleted: false,
    createdAt: new Date().toISOString(),
  }

  try {
    await createCommunityPostRow(payload, input.userId)
  } catch (error) {
    // A deployment whose `posts` table predates `photoUrl` still accepts the
    // rest, so the text survives even when the picture cannot. Nothing else is
    // optional any more.
    if (shouldRetryCreatePostWithoutOptionalFields(payload, error)) {
      try {
        const { photoUrl: _photoUrl, ...payloadWithoutPhoto } = payload
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
        isDeleted: false,
        createdAt: new Date().toISOString(),
      },
      permissions: getOwnerPermissions(input.userId),
    })
  } catch (error) {
    if (isUnknownPostAttributeError(error)) {
      try {
        await tablesDB.createRow({
          databaseId: DB_ID,
          tableId: input.tableId,
          rowId: ID.unique(),
          data: {
            [input.parentField]: input.parentId,
            userId: input.userId,
            content: input.content,
            isDeleted: false,
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
}) {
  ensureCommunityConfigured()

  await createCommunityThreadEntry({
    tableId: COLLECTIONS.COMMENTS,
    userId: input.userId,
    content: input.content,
    parentField: "postId",
    parentId: input.postId,
    fallbackMessage: "Unable to add the comment.",
  })
}

export async function createCommunityReply(input: {
  userId: string
  commentId: string
  content: string
}) {
  ensureCommunityConfigured()

  await createCommunityThreadEntry({
    tableId: COLLECTIONS.REPLIES,
    userId: input.userId,
    content: input.content,
    parentField: "commentId",
    parentId: input.commentId,
    fallbackMessage: "Unable to add the reply.",
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

        // Not under the current ID — this like may predate the widened hash.
        try {
          await tablesDB.deleteRow({
            databaseId: DB_ID,
            tableId: COLLECTIONS.POST_LIKES,
            rowId: buildLegacyLikeRowId(input.postId, input.userId),
          })
        } catch (legacyError) {
          if (!isAppwriteNotFoundError(legacyError)) {
            throw legacyError
          }
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

    // No write back to the post row. `posts` rows carry owner-only document
    // permissions, so this update was either failing with a 401 on every post
    // the user did not write, or only succeeding because the collection grants
    // update to all users — which would let anyone rewrite anyone's post. The
    // feed does not read it either: `likesCount` there is derived from the
    // post_likes rows themselves (see mapPost).

    return {
      isLiked: !input.currentlyLiked,
      likesCount: Math.max(0, likesCount),
    }
  } catch (error) {
    throw toCommunityError(error, "Unable to update the post like.")
  }
}
