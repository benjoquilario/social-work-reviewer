const sdk = require("node-appwrite")

const API_ENDPOINT = process.env.APPWRITE_API_ENDPOINT
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID

const COLLECTION_IDS = {
  userProfiles: process.env.USER_PROFILES_COLLECTION_ID || "user_profiles",
  userRoles: process.env.USER_ROLES_COLLECTION_ID || "user_roles",
  examAttempts: process.env.EXAM_ATTEMPTS_COLLECTION_ID || "exam_attempts",
  userAnswers: process.env.USER_ANSWERS_COLLECTION_ID || "user_answers",
  userProgress: process.env.USER_PROGRESS_COLLECTION_ID || "user_progress",
  posts: process.env.POSTS_COLLECTION_ID || "posts",
  comments: process.env.COMMENTS_COLLECTION_ID || "comments",
  replies: process.env.REPLIES_COLLECTION_ID || "replies",
  postLikes: process.env.POST_LIKES_COLLECTION_ID || "post_likes",
  commentLikes: process.env.COMMENT_LIKES_COLLECTION_ID || "comment_likes",
  flaggedContent:
    process.env.FLAGGED_CONTENT_COLLECTION_ID || "flagged_content",
}

function createClient() {
  if (!API_ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
    throw new Error(
      "Missing required function environment variables. Set APPWRITE_API_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and APPWRITE_DATABASE_ID."
    )
  }

  return new sdk.Client()
    .setEndpoint(API_ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY)
}

async function listAllRows(tablesDB, tableId, queries) {
  const rows = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries: [...queries, sdk.Query.limit(limit), sdk.Query.offset(offset)],
    })

    rows.push(...response.rows)

    if (response.rows.length < limit) {
      return rows
    }

    offset += limit
  }
}

async function deleteRows(tablesDB, tableId, queries) {
  const rows = await listAllRows(tablesDB, tableId, queries)

  await Promise.all(
    rows.map((row) =>
      tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId,
        rowId: row.$id,
      })
    )
  )

  return rows.length
}

module.exports = async ({ req, res, log, error }) => {
  if (req.method !== "POST") {
    return res.json(
      {
        ok: false,
        message: "Use POST when invoking the account deletion function.",
      },
      405
    )
  }

  const userId =
    req.headers["x-appwrite-user-id"] || req.headers["X-Appwrite-User-Id"]

  if (!userId) {
    return res.json(
      {
        ok: false,
        message: "Authenticated Appwrite user context is required.",
      },
      401
    )
  }

  try {
    const client = createClient()
    const tablesDB = new sdk.TablesDB(client)
    const users = new sdk.Users(client)

    const attempts = await listAllRows(tablesDB, COLLECTION_IDS.examAttempts, [
      sdk.Query.equal("userId", userId),
    ])
    const attemptIds = attempts.map((attempt) => attempt.$id)

    let deletedUserAnswers = 0
    if (attemptIds.length > 0) {
      const answerBatches = []

      for (let index = 0; index < attemptIds.length; index += 100) {
        answerBatches.push(
          deleteRows(tablesDB, COLLECTION_IDS.userAnswers, [
            sdk.Query.equal("attemptId", attemptIds.slice(index, index + 100)),
          ])
        )
      }

      const deletedCounts = await Promise.all(answerBatches)
      deletedUserAnswers = deletedCounts.reduce((sum, count) => sum + count, 0)
    }

    const [
      deletedProfiles,
      deletedRoles,
      deletedAttempts,
      deletedProgress,
      deletedPosts,
      deletedComments,
      deletedReplies,
      deletedPostLikes,
      deletedCommentLikes,
      deletedFlags,
    ] = await Promise.all([
      deleteRows(tablesDB, COLLECTION_IDS.userProfiles, [
        sdk.Query.equal("userId", userId),
      ]),
      deleteRows(tablesDB, COLLECTION_IDS.userRoles, [
        sdk.Query.equal("userId", userId),
      ]),
      Promise.all(
        attempts.map((attempt) =>
          tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId: COLLECTION_IDS.examAttempts,
            rowId: attempt.$id,
          })
        )
      ).then(() => attempts.length),
      deleteRows(tablesDB, COLLECTION_IDS.userProgress, [
        sdk.Query.equal("userId", userId),
      ]),
      deleteRows(tablesDB, COLLECTION_IDS.posts, [
        sdk.Query.equal("userId", userId),
      ]),
      deleteRows(tablesDB, COLLECTION_IDS.comments, [
        sdk.Query.equal("userId", userId),
      ]),
      deleteRows(tablesDB, COLLECTION_IDS.replies, [
        sdk.Query.equal("userId", userId),
      ]),
      deleteRows(tablesDB, COLLECTION_IDS.postLikes, [
        sdk.Query.equal("userId", userId),
      ]),
      deleteRows(tablesDB, COLLECTION_IDS.commentLikes, [
        sdk.Query.equal("userId", userId),
      ]),
      deleteRows(tablesDB, COLLECTION_IDS.flaggedContent, [
        sdk.Query.equal("reportedBy", userId),
      ]),
    ])

    await users.delete(userId)

    log(`Deleted Appwrite account for user ${userId}.`)

    return res.json({
      ok: true,
      message: "Account deleted successfully.",
      cleanup: {
        deletedProfiles,
        deletedRoles,
        deletedAttempts,
        deletedUserAnswers,
        deletedProgress,
        deletedPosts,
        deletedComments,
        deletedReplies,
        deletedPostLikes,
        deletedCommentLikes,
        deletedFlags,
      },
    })
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : String(caughtError)
    error(message)

    return res.json(
      {
        ok: false,
        message: "Unable to delete the account from Appwrite.",
        detail: message,
      },
      500
    )
  }
}
