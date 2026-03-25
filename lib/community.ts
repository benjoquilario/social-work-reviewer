import {
  COLLECTIONS,
  createAppwriteContentError,
  createAppwritePermissionMessage,
  databases,
  DB_ID,
  getAppwriteConfigurationError,
  ID,
  isAppwriteUnauthorizedError,
  Permission,
  Query,
  Role,
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

export type CommunityAuthor = {
  id: string
  name: string
  subtitle: string
  avatarSeed: string
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
  profileMap: Map<string, UserProfileDocument>
): CommunityAuthor {
  const profile = profileMap.get(userId)
  const name = profile?.fullName ?? `User ${userId.slice(0, 6)}`

  return {
    id: userId,
    name,
    subtitle: profile?.reviewType ?? profile?.email ?? "Community member",
    avatarSeed: toAvatarSeed(name),
  }
}

async function listDocumentsSafe<T>(collectionId: string, queries: string[]) {
  const { documents } = await databases.listDocuments(
    DB_ID,
    collectionId,
    queries
  )

  return documents as unknown as T[]
}

export async function listCommunityFeed(
  currentUserId?: string
): Promise<CommunityFeed> {
  ensureCommunityConfigured()

  try {
    const [
      posts,
      comments,
      replies,
      postLikes,
      profiles,
      subjects,
      flaggedItems,
    ] = await Promise.all([
      listDocumentsSafe<PostDocument>(COLLECTIONS.POSTS, [
        Query.orderDesc("createdAt"),
        Query.limit(COMMUNITY_LIMIT),
      ]),
      listDocumentsSafe<CommentDocument>(COLLECTIONS.COMMENTS, [
        Query.orderAsc("createdAt"),
        Query.limit(COMMUNITY_LIMIT),
      ]),
      listDocumentsSafe<ReplyDocument>(COLLECTIONS.REPLIES, [
        Query.orderAsc("createdAt"),
        Query.limit(COMMUNITY_LIMIT),
      ]),
      listDocumentsSafe<PostLikeDocument>(COLLECTIONS.POST_LIKES, [
        Query.limit(COMMUNITY_LIMIT),
      ]),
      listDocumentsSafe<UserProfileDocument>(COLLECTIONS.USER_PROFILES, [
        Query.limit(COMMUNITY_LIMIT),
      ]).catch(() => []),
      listDocumentsSafe<SubjectDocument>(COLLECTIONS.SUBJECTS, [
        Query.orderAsc("order"),
        Query.limit(COMMUNITY_LIMIT),
      ]).catch(() => []),
      listDocumentsSafe<FlaggedContentDocument>(COLLECTIONS.FLAGGED_CONTENT, [
        Query.limit(COMMUNITY_LIMIT),
      ]).catch(() => []),
    ])

    const activeFlags = flaggedItems.filter(
      (flag) => flag.status !== "dismissed"
    )
    const hiddenPostIds = new Set(
      activeFlags
        .filter((flag) => flag.contentType === "post")
        .map((flag) => flag.contentId)
    )
    const hiddenCommentIds = new Set(
      activeFlags
        .filter((flag) => flag.contentType === "comment")
        .map((flag) => flag.contentId)
    )
    const hiddenReplyIds = new Set(
      activeFlags
        .filter((flag) => flag.contentType === "reply")
        .map((flag) => flag.contentId)
    )

    const profileMap = new Map(
      profiles.map((profile) => [profile.userId, profile])
    )
    const subjectMap = new Map(
      subjects.map((subject) => [subject.$id, subject.name])
    )
    const postLikesByPostId = new Map<string, Set<string>>()

    for (const like of postLikes) {
      const users = postLikesByPostId.get(like.postId) ?? new Set<string>()
      users.add(like.userId)
      postLikesByPostId.set(like.postId, users)
    }

    const repliesByCommentId = new Map<string, CommunityReplyItem[]>()
    for (const reply of replies) {
      if (
        hiddenReplyIds.has(reply.$id) ||
        hiddenCommentIds.has(reply.commentId)
      ) {
        continue
      }

      const current = repliesByCommentId.get(reply.commentId) ?? []
      current.push({
        id: reply.$id,
        commentId: reply.commentId,
        content: reply.content,
        createdAt: reply.createdAt,
        createdAtLabel: formatRelativeTime(reply.createdAt),
        author: mapAuthor(reply.userId, profileMap),
      })
      repliesByCommentId.set(reply.commentId, current)
    }

    const commentsByPostId = new Map<string, CommunityCommentItem[]>()
    for (const comment of comments) {
      if (
        hiddenCommentIds.has(comment.$id) ||
        hiddenPostIds.has(comment.postId)
      ) {
        continue
      }

      const current = commentsByPostId.get(comment.postId) ?? []
      current.push({
        id: comment.$id,
        postId: comment.postId,
        content: comment.content,
        createdAt: comment.createdAt,
        createdAtLabel: formatRelativeTime(comment.createdAt),
        author: mapAuthor(comment.userId, profileMap),
        replies: repliesByCommentId.get(comment.$id) ?? [],
      })
      commentsByPostId.set(comment.postId, current)
    }

    const mappedPosts = posts
      .filter((post) => !hiddenPostIds.has(post.$id))
      .map((post) => {
        const threadComments = commentsByPostId.get(post.$id) ?? []
        const repliesCount = threadComments.reduce(
          (count, comment) => count + comment.replies.length,
          0
        )
        const likedUsers = postLikesByPostId.get(post.$id) ?? new Set<string>()

        return {
          id: post.$id,
          userId: post.userId,
          title: post.title,
          content: post.content,
          category: post.category,
          subjectId: post.subjectId ?? null,
          subjectName: post.subjectId
            ? (subjectMap.get(post.subjectId) ?? null)
            : null,
          createdAt: post.createdAt,
          createdAtLabel: formatRelativeTime(post.createdAt),
          likesCount: likedUsers.size || post.likesCount,
          commentsCount: threadComments.length,
          repliesCount,
          isLiked: currentUserId ? likedUsers.has(currentUserId) : false,
          author: mapAuthor(post.userId, profileMap),
          comments: threadComments,
        } satisfies CommunityPostItem
      })

    return {
      posts: mappedPosts,
      stats: {
        activeLearners: new Set(mappedPosts.map((post) => post.userId)).size,
        openTopics: mappedPosts.length,
        answeredToday: mappedPosts.filter((post) => post.commentsCount > 0)
          .length,
      },
    }
  } catch (error) {
    throw toCommunityError(
      error,
      "Unable to load community posts from Appwrite."
    )
  }
}

export async function createCommunityPost(input: CreateCommunityPostInput) {
  ensureCommunityConfigured()

  try {
    await databases.createDocument(
      DB_ID,
      COLLECTIONS.POSTS,
      ID.unique(),
      {
        userId: input.userId,
        title: input.title,
        content: input.content,
        category: input.category,
        ...(input.subjectId ? { subjectId: input.subjectId } : {}),
        likesCount: 0,
        createdAt: new Date().toISOString(),
      },
      getOwnerPermissions(input.userId)
    )
  } catch (error) {
    throw toCommunityError(error, "Unable to create the discussion post.")
  }
}

export async function createCommunityComment(input: {
  userId: string
  postId: string
  content: string
}) {
  ensureCommunityConfigured()

  try {
    await databases.createDocument(
      DB_ID,
      COLLECTIONS.COMMENTS,
      ID.unique(),
      {
        postId: input.postId,
        userId: input.userId,
        content: input.content,
        likesCount: 0,
        createdAt: new Date().toISOString(),
      },
      getOwnerPermissions(input.userId)
    )
  } catch (error) {
    throw toCommunityError(error, "Unable to add the comment.")
  }
}

export async function createCommunityReply(input: {
  userId: string
  commentId: string
  content: string
}) {
  ensureCommunityConfigured()

  try {
    await databases.createDocument(
      DB_ID,
      COLLECTIONS.REPLIES,
      ID.unique(),
      {
        commentId: input.commentId,
        userId: input.userId,
        content: input.content,
        likesCount: 0,
        createdAt: new Date().toISOString(),
      },
      getOwnerPermissions(input.userId)
    )
  } catch (error) {
    throw toCommunityError(error, "Unable to add the reply.")
  }
}

export async function toggleCommunityPostLike(input: {
  userId: string
  postId: string
  currentlyLiked: boolean
}) {
  ensureCommunityConfigured()

  try {
    const existingLikes = await listDocumentsSafe<PostLikeDocument>(
      COLLECTIONS.POST_LIKES,
      [
        Query.equal("postId", input.postId),
        Query.equal("userId", input.userId),
        Query.limit(1),
      ]
    )

    if (input.currentlyLiked && existingLikes[0]) {
      await databases.deleteDocument(
        DB_ID,
        COLLECTIONS.POST_LIKES,
        existingLikes[0].$id
      )
    } else if (!input.currentlyLiked) {
      await databases.createDocument(
        DB_ID,
        COLLECTIONS.POST_LIKES,
        ID.unique(),
        {
          postId: input.postId,
          userId: input.userId,
        },
        getOwnerPermissions(input.userId)
      )
    }

    const post = (await databases.getDocument(
      DB_ID,
      COLLECTIONS.POSTS,
      input.postId
    )) as unknown as PostDocument

    const nextLikesCount = Math.max(
      0,
      post.likesCount + (input.currentlyLiked ? -1 : 1)
    )

    await databases.updateDocument(DB_ID, COLLECTIONS.POSTS, input.postId, {
      likesCount: nextLikesCount,
    })
  } catch (error) {
    throw toCommunityError(error, "Unable to update the post like.")
  }
}
