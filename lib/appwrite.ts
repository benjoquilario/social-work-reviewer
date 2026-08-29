import { Platform } from "react-native"
import {
  Account,
  AppwriteException,
  Avatars,
  Client,
  ExecutionMethod,
  Functions,
  ID,
  Permission,
  Query,
  Role,
  Storage,
  TablesDB,
} from "react-native-appwrite"

import { reviewerCmsSchema } from "./schema"

const FALLBACK_ENDPOINT = "https://sgp.cloud.appwrite.io/v1"
const FALLBACK_ANDROID_PACKAGE = "com.horfi.socialwork"
const FALLBACK_IOS_BUNDLE_ID = "com.horfi.socialwork"
const FALLBACK_WEB_PLATFORM = "localhost"

export const APPWRITE_CONFIG = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? FALLBACK_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "",
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? "",
  appScheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? "reviewer",
  emailRedirectUrl: process.env.EXPO_PUBLIC_APPWRITE_EMAIL_REDIRECT_URL ?? "",
  profileImagesBucketId:
    process.env.EXPO_PUBLIC_APPWRITE_PROFILE_IMAGES_BUCKET_ID ?? "",
  communityPostImagesBucketId:
    process.env.EXPO_PUBLIC_APPWRITE_COMMUNITY_POST_IMAGES_BUCKET_ID ?? "",
  /**
   * Where CMS-uploaded images and files live.
   *
   * `questions.imageUrl` and `learning_materials.fileUrl` store a path like
   * `/api/assets/<fileId>` when the file came through the dashboard, and an
   * absolute URL when somebody pasted a link. This is what turns the first
   * kind into something an `<Image>` can load (gotcha 8).
   */
  cmsBaseUrl: process.env.EXPO_PUBLIC_CMS_BASE_URL ?? "",
  // No literal resource IDs here. A hard-coded fallback survives pointing the
  // app at a different Appwrite project and silently reads the old project's
  // bucket/function instead of failing — set these in .env instead.
  communityPostLikeFunctionId:
    process.env.EXPO_PUBLIC_APPWRITE_COMMUNITY_POST_LIKE_FUNCTION_ID ?? "",
  premiumMaterialAccessFunctionId:
    process.env.EXPO_PUBLIC_APPWRITE_PREMIUM_MATERIAL_FUNCTION_ID ?? "",
  accountDeleteFunctionId:
    process.env.EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID ?? "",
  platform: Platform.select({
    android:
      process.env.EXPO_PUBLIC_APPWRITE_ANDROID_PACKAGE ??
      FALLBACK_ANDROID_PACKAGE,
    ios:
      process.env.EXPO_PUBLIC_APPWRITE_IOS_BUNDLE_ID ?? FALLBACK_IOS_BUNDLE_ID,
    default:
      process.env.EXPO_PUBLIC_APPWRITE_WEB_PLATFORM ?? FALLBACK_WEB_PLATFORM,
  }),
} as const

function isValidAppwriteEndpoint(endpoint: string) {
  return /^https?:\/\/.+\/v1\/?$/i.test(endpoint)
}

export function isValidExternalRedirectUrl(url: string) {
  return /^https?:\/\/.+/i.test(url)
}

export function getAppwriteConfigurationError(): string | null {
  if (!APPWRITE_CONFIG.projectId) {
    return "Missing EXPO_PUBLIC_APPWRITE_PROJECT_ID."
  }

  if (!APPWRITE_CONFIG.databaseId) {
    return "Missing EXPO_PUBLIC_APPWRITE_DATABASE_ID."
  }

  if (!APPWRITE_CONFIG.platform) {
    return "Missing Appwrite platform identifier for this build target."
  }

  if (!isValidAppwriteEndpoint(APPWRITE_CONFIG.endpoint)) {
    return "EXPO_PUBLIC_APPWRITE_ENDPOINT must be a full Appwrite API URL ending with /v1."
  }

  return null
}

export function assertAppwriteConfigured() {
  const error = getAppwriteConfigurationError()

  if (error) {
    throw new Error(error)
  }
}

/**
 * Optional resources. Each caller already degrades gracefully when one is
 * missing (a direct-write like fallback, a blank image, …), which is exactly
 * why an unset value is easy to miss — so say so once at startup.
 */
const OPTIONAL_APPWRITE_RESOURCES: {
  value: string
  envVar: string
  usedFor: string
}[] = [
  {
    value: APPWRITE_CONFIG.cmsBaseUrl,
    envVar: "EXPO_PUBLIC_CMS_BASE_URL",
    usedFor: "images and files uploaded through the CMS (they render blank without it)",
  },
  {
    value: APPWRITE_CONFIG.communityPostLikeFunctionId,
    envVar: "EXPO_PUBLIC_APPWRITE_COMMUNITY_POST_LIKE_FUNCTION_ID",
    usedFor: "community post likes (falls back to direct client writes)",
  },
  {
    value: APPWRITE_CONFIG.premiumMaterialAccessFunctionId,
    envVar: "EXPO_PUBLIC_APPWRITE_PREMIUM_MATERIAL_FUNCTION_ID",
    usedFor: "server-side premium material checks",
  },
  {
    value: APPWRITE_CONFIG.accountDeleteFunctionId,
    envVar: "EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID",
    usedFor: "account deletion",
  },
]

export function getUnconfiguredAppwriteResources() {
  return OPTIONAL_APPWRITE_RESOURCES.filter(
    (resource) => !resource.value.trim()
  )
}

if (__DEV__) {
  const missing = getUnconfiguredAppwriteResources()

  if (missing.length > 0) {
    console.warn(
      `[Appwrite] ${missing.length} optional resource(s) are not configured:\n` +
        missing
          .map((r) => `  • ${r.envVar} — needed for ${r.usedFor}`)
          .join("\n")
    )
  }
}

// ─── Appwrite Client ───────────────────────────────────────────────────────────

export const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId)
  .setPlatform(APPWRITE_CONFIG.platform)

export const account = new Account(client)
export const tablesDB = new TablesDB(client)
export const functions = new Functions(client)
export const storage = new Storage(client)
export const avatars = new Avatars(client)

// ─── Database Constants ────────────────────────────────────────────────────────

export const DB_ID = APPWRITE_CONFIG.databaseId

/**
 * Table IDs, read off the schema rather than retyped.
 *
 * A table renamed in the CMS has to become a compile error here, not an empty
 * list at runtime — which is why every value below comes from
 * `reviewerCmsSchema` and none of them is a string literal.
 *
 * New code should prefer `TABLES` / `tableId()` from `lib/db`, which is keyed
 * by the schema's own table keys. This SCREAMING_CASE map exists for the
 * modules written before that.
 */
export const COLLECTIONS = {
  USER_PROFILES: reviewerCmsSchema.user_profiles.tableId,
  USER_ROLES: reviewerCmsSchema.user_roles.tableId,
  SUBJECTS: reviewerCmsSchema.subjects.tableId,
  TOPICS: reviewerCmsSchema.topics.tableId,
  LEARNING_MATERIALS: reviewerCmsSchema.learning_materials.tableId,
  // Assessment content. Categories, sets and questions are authored in the
  // dashboard and imported from Excel; they are not derived from
  // SUBJECTS/TOPICS, and nothing joins the two halves (section 1).
  EXAM_CATEGORIES: reviewerCmsSchema.exam_categories.tableId,
  QUESTIONNAIRES: reviewerCmsSchema.questionnaires.tableId,
  QUESTIONS: reviewerCmsSchema.questions.tableId,
  USER_ANSWERS: reviewerCmsSchema.user_answers.tableId,
  USER_PROGRESS: reviewerCmsSchema.user_progress.tableId,
  USER_DAILY_ACTIVITY: reviewerCmsSchema.user_daily_activity.tableId,
  USER_WEEKLY_REPORTS: reviewerCmsSchema.user_weekly_reports.tableId,
  USER_SETTINGS: reviewerCmsSchema.user_settings.tableId,
  STUDY_SESSIONS: reviewerCmsSchema.study_sessions.tableId,
  USER_ACTIVITY_LOG: reviewerCmsSchema.user_activity_log.tableId,
  LEARNING_HISTORY: reviewerCmsSchema.learning_history.tableId,
  LEARNING_ACHIEVEMENTS: reviewerCmsSchema.learning_achievements.tableId,
  POSTS: reviewerCmsSchema.posts.tableId,
  COMMENTS: reviewerCmsSchema.comments.tableId,
  REPLIES: reviewerCmsSchema.replies.tableId,
  POST_LIKES: reviewerCmsSchema.post_likes.tableId,
  COMMENT_LIKES: reviewerCmsSchema.comment_likes.tableId,
  ANNOUNCEMENTS: reviewerCmsSchema.announcements.tableId,
  FLAGGED_CONTENT: reviewerCmsSchema.flagged_content.tableId,
} as const

export type CollectionKey = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]

export type AppwriteContentErrorCode = "config" | "not-found" | "request"

export type AppwriteContentError = Error & {
  code: AppwriteContentErrorCode
}

export function createAppwriteContentError(
  code: AppwriteContentErrorCode,
  message: string
): AppwriteContentError {
  const error = new Error(message) as AppwriteContentError

  error.name = "AppwriteContentError"
  error.code = code

  return error
}

export function isAppwriteContentError(
  error: unknown
): error is AppwriteContentError {
  // Anchored on the name we stamp in `createAppwriteContentError`. Testing for
  // a string `code` instead used to match any Node/RN network error
  // (ENOTFOUND, ECONNRESET, …) and classify it as a content problem.
  return error instanceof Error && error.name === "AppwriteContentError"
}

// ─── Appwrite error predicates ─────────────────────────────────────────────────
//
// Single home for these. They previously existed in four places (auth.ts,
// community.ts, progress/utils.ts, and here) in two flavours: `instanceof
// AppwriteException` and a structural `.code` check. These accept either, so
// they keep working even if an SDK error arrives without the right prototype.

/** HTTP status carried by an Appwrite error, or null if it isn't one. */
export function getAppwriteErrorCode(error: unknown): number | null {
  if (error instanceof AppwriteException) {
    return error.code
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === "number" ? code : null
  }

  return null
}

/**
 * Appwrite's machine-readable error type (e.g. `user_session_already_exists`).
 * Prefer this over matching on `error.message`, which is free to be reworded
 * in any release.
 */
export function getAppwriteErrorType(error: unknown): string | null {
  if (error instanceof AppwriteException && error.type) {
    return error.type
  }

  if (typeof error === "object" && error !== null && "type" in error) {
    const type = (error as { type?: unknown }).type
    return typeof type === "string" && type ? type : null
  }

  return null
}

export function isAppwriteUnauthorizedError(error: unknown): boolean {
  const code = getAppwriteErrorCode(error)
  return code === 401 || code === 403
}

export function isAppwriteNotFoundError(error: unknown): boolean {
  return getAppwriteErrorCode(error) === 404
}

export function isAppwriteConflictError(error: unknown): boolean {
  return getAppwriteErrorCode(error) === 409
}

/** Appwrite rejects a new session while one is already active. */
export function isAppwriteSessionAlreadyExistsError(error: unknown): boolean {
  return (
    getAppwriteErrorType(error) === "user_session_already_exists" ||
    (getAppwriteErrorCode(error) === 401 &&
      /session is active|session already exists/i.test(
        error instanceof Error ? error.message : ""
      ))
  )
}

/**
 * The row payload does not match the collection schema — usually a column the
 * app writes that has not been added in the Appwrite console yet.
 */
export function isAppwriteInvalidStructureError(error: unknown): boolean {
  return getAppwriteErrorType(error) === "document_invalid_structure"
}

export function createAppwritePermissionMessage(
  resources: string | string[]
): string {
  const resourceList = Array.isArray(resources)
    ? resources.join(", ")
    : resources

  return `Login succeeded, but the current Appwrite session is not allowed to access ${resourceList}. Check collection permissions and, if document security is enabled, document read permissions for logged-in users.`
}

// Re-export for convenience
export { ExecutionMethod, ID, Permission, Query, Role }
