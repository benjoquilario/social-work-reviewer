const sdk = require("node-appwrite")

const API_ENDPOINT = process.env.APPWRITE_API_ENDPOINT
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID

const POSTS_COLLECTION_ID = process.env.POSTS_COLLECTION_ID || "posts"
const POST_LIKES_COLLECTION_ID =
  process.env.POST_LIKES_COLLECTION_ID || "post_likes"

const LIKE_ROW_ID_PREFIX = "post_like"

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

function parseJsonBody(rawBody) {
  if (!rawBody) {
    return {}
  }

  if (typeof rawBody === "object") {
    return rawBody
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    return null
  }
}

function toLikeRowId(postId, userId) {
  return `${LIKE_ROW_ID_PREFIX}_${postId}_${userId}`
}

async function listAllLikesForPost(tablesDB, postId) {
  const likes = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: POST_LIKES_COLLECTION_ID,
      queries: [
        sdk.Query.equal("postId", postId),
        sdk.Query.limit(limit),
        sdk.Query.offset(offset),
      ],
    })

    likes.push(...response.rows)

    if (response.rows.length < limit) {
      return likes
    }

    offset += limit
  }
}

async function ensurePostExists(tablesDB, postId) {
  await tablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: POSTS_COLLECTION_ID,
    rowId: postId,
  })
}

async function createLikeIfMissing(tablesDB, postId, userId) {
  const rowId = toLikeRowId(postId, userId)

  try {
    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: POST_LIKES_COLLECTION_ID,
      rowId,
      data: {
        postId,
        userId,
      },
    })

    return true
  } catch (error) {
    if (error && typeof error === "object" && error.code === 409) {
      return true
    }

    throw error
  }
}

async function deleteLikeRowsForUser(tablesDB, postId, userId) {
  const rows = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: POST_LIKES_COLLECTION_ID,
    queries: [
      sdk.Query.equal("postId", postId),
      sdk.Query.equal("userId", userId),
      sdk.Query.limit(100),
    ],
  })

  await Promise.all(
    rows.rows.map((row) =>
      tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: POST_LIKES_COLLECTION_ID,
        rowId: row.$id,
      })
    )
  )

  return false
}

async function updatePostLikeSnapshot(tablesDB, postId, likesCount) {
  try {
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: POSTS_COLLECTION_ID,
      rowId: postId,
      data: {
        likesCount,
      },
    })
  } catch {
    // The feed reads counts from post_likes directly, so this snapshot update
    // is best-effort and can be removed later if the column goes away.
  }
}

module.exports = async ({ req, res, log, error }) => {
  if (req.method !== "POST") {
    return res.json(
      {
        ok: false,
        message: "Use POST when invoking the community post like function.",
      },
      405
    )
  }

  const body = parseJsonBody(req.body)
  if (!body) {
    return res.json(
      {
        ok: false,
        message: "Request body must be valid JSON.",
      },
      400
    )
  }

  const postId = typeof body.postId === "string" ? body.postId.trim() : ""
  const currentlyLiked = body.currentlyLiked === true
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

  if (!postId) {
    return res.json(
      {
        ok: false,
        message: "postId is required.",
      },
      400
    )
  }

  try {
    const client = createClient()
    const tablesDB = new sdk.TablesDB(client)

    await ensurePostExists(tablesDB, postId)

    let isLiked = currentlyLiked

    if (currentlyLiked) {
      isLiked = await deleteLikeRowsForUser(tablesDB, postId, userId)
    } else {
      isLiked = await createLikeIfMissing(tablesDB, postId, userId)
    }

    const likes = await listAllLikesForPost(tablesDB, postId)
    const uniqueUserIds = new Set(likes.map((like) => like.userId))
    const likesCount = uniqueUserIds.size

    await updatePostLikeSnapshot(tablesDB, postId, likesCount)

    log(
      `${isLiked ? "Liked" : "Unliked"} post ${postId} for user ${userId}. Count=${likesCount}`
    )

    return res.json({
      ok: true,
      postId,
      userId,
      isLiked,
      likesCount,
    })
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : String(caughtError)

    error(message)

    return res.json(
      {
        ok: false,
        message: "Unable to toggle the community post like.",
        detail: message,
      },
      500
    )
  }
}
