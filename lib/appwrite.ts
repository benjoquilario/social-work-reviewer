import { Platform } from "react-native"
import {
  Account,
  AppwriteException,
  Avatars,
  Client,
  Databases,
  ExecutionMethod,
  Functions,
  ID,
  Permission,
  Query,
  Role,
  Storage,
} from "react-native-appwrite"

const FALLBACK_ENDPOINT = "https://sgp.cloud.appwrite.io/v1"
const FALLBACK_ANDROID_PACKAGE = "com.horfi.socialwork"
const FALLBACK_IOS_BUNDLE_ID = "com.horfi.socialwork"
const FALLBACK_WEB_PLATFORM = "localhost"

export const APPWRITE_CONFIG = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? FALLBACK_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "",
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? "",
  premiumMaterialAccessFunctionId:
    process.env.EXPO_PUBLIC_APPWRITE_PREMIUM_MATERIAL_FUNCTION_ID ??
    "69c35f750004ff04204f",
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

// ─── Appwrite Client ───────────────────────────────────────────────────────────

export const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId)
  .setPlatform(APPWRITE_CONFIG.platform)

export const account = new Account(client)
export const databases = new Databases(client)
export const functions = new Functions(client)
export const storage = new Storage(client)
export const avatars = new Avatars(client)

// ─── Database Constants ────────────────────────────────────────────────────────

export const DB_ID = APPWRITE_CONFIG.databaseId

export const COLLECTIONS = {
  USER_PROFILES: "user_profiles",
  USER_ROLES: "user_roles",
  SUBJECTS: "subjects",
  TOPICS: "topics",
  LEARNING_MATERIALS: "learning_materials",
  QUESTIONS: "questions",
  CHOICES: "choices",
  QUESTION_TAGS: "question_tags",
  EXAMS: "exams",
  EXAM_QUESTIONS: "exam_questions",
  EXAM_ATTEMPTS: "exam_attempts",
  USER_ANSWERS: "user_answers",
  USER_PROGRESS: "user_progress",
  POSTS: "posts",
  COMMENTS: "comments",
  REPLIES: "replies",
  POST_LIKES: "post_likes",
  COMMENT_LIKES: "comment_likes",
  ANNOUNCEMENTS: "announcements",
  FLAGGED_CONTENT: "flagged_content",
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
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  )
}

export function isAppwriteUnauthorizedError(error: unknown): boolean {
  return (
    error instanceof AppwriteException &&
    (error.code === 401 || error.code === 403)
  )
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
