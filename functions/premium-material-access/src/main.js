const sdk = require("node-appwrite")

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const API_ENDPOINT = process.env.APPWRITE_API_ENDPOINT
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const USER_PROFILES_COLLECTION_ID =
  process.env.USER_PROFILES_COLLECTION_ID || "user_profiles"
const LEARNING_MATERIALS_COLLECTION_ID =
  process.env.LEARNING_MATERIALS_COLLECTION_ID || "learning_materials"

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

module.exports = async ({ req, res, log, error }) => {
  if (!API_ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
    error("Missing required function environment variables.")
    return res.json(
      {
        ok: false,
        message:
          "Function is not configured. Set APPWRITE_API_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and APPWRITE_DATABASE_ID.",
      },
      500
    )
  }

  if (req.method !== "POST") {
    return res.json(
      {
        ok: false,
        message: "Use POST with a JSON body containing materialId.",
      },
      405
    )
  }

  const body = parseJsonBody(req.body)
  if (!body) {
    return res.json(
      { ok: false, message: "Request body must be valid JSON." },
      400
    )
  }

  const materialId = body.materialId
  if (!materialId) {
    return res.json({ ok: false, message: "materialId is required." }, 400)
  }

  const userId =
    req.headers["x-appwrite-user-id"] || req.headers["X-Appwrite-User-Id"]

  if (!userId) {
    return res.json(
      { ok: false, message: "Authenticated Appwrite user required." },
      401
    )
  }

  const client = new sdk.Client()
    .setEndpoint(API_ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY)

  const databases = new sdk.Databases(client)

  try {
    const profileResult = await databases.listDocuments(
      DATABASE_ID,
      USER_PROFILES_COLLECTION_ID,
      [sdk.Query.equal("userId", userId), sdk.Query.limit(1)]
    )

    const profile = profileResult.documents[0] || null
    const isPremiumUser = profile?.isPremium === true

    const material = await databases.getDocument(
      DATABASE_ID,
      LEARNING_MATERIALS_COLLECTION_ID,
      materialId
    )

    if (material.isPremium && !isPremiumUser) {
      return res.json(
        {
          ok: false,
          message: "Premium subscription required for this material.",
        },
        403
      )
    }

    log(`Granted material access to ${userId} for ${materialId}.`)

    return res.json({
      ok: true,
      material: {
        id: material.$id,
        topicId: material.topicId,
        title: material.title,
        type: material.type,
        fileUrl: material.fileUrl || null,
        content: material.content || "",
        isPremium: material.isPremium,
        createdAt: material.createdAt,
      },
    })
  } catch (caughtError) {
    error(caughtError.message || String(caughtError))
    return res.json(
      { ok: false, message: "Unable to resolve premium material access." },
      500
    )
  }
}
