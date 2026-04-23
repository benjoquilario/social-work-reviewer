import { AppwriteException, Models } from "react-native-appwrite"

import {
  account,
  APPWRITE_CONFIG,
  assertAppwriteConfigured,
  avatars,
  COLLECTIONS,
  createAppwritePermissionMessage,
  DB_ID,
  ExecutionMethod,
  functions,
  ID,
  isAppwriteUnauthorizedError,
  isValidExternalRedirectUrl,
  Permission,
  Query,
  Role,
  storage,
  tablesDB,
} from "./appwrite"

const REQUEST_TIMEOUT_MS = 12_000
const RETRY_COUNT = 2
const RETRY_BASE_DELAY_MS = 800

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthUser = Models.User<Models.Preferences>

export type UserProfile = {
  $id: string
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  schoolName: string | null
  reviewType: string | null
  isPremium: boolean
  createdAt: string
}

export type UpdateProfileInput = {
  fullName: string
  schoolName?: string | null
  reviewType?: string | null
  avatarUrl?: string | null
}

export type UpdateEmailInput = {
  email: string
  currentPassword: string
}

export type UploadProfilePhotoInput = {
  uri: string
  name: string
  type: string
  size: number
}

export type CreateAccountInput = {
  email: string
  password: string
  fullName: string
}

export type LoginInput = {
  email: string
  password: string
}

export type ChangePasswordInput = {
  currentPassword: string
  nextPassword: string
}

export type EmailVerificationInput = {
  userId: string
  secret: string
}

type AccountProfileResult = {
  user: AuthUser
  profile: UserProfile | null
}

type UserBootstrapInput = Pick<AuthUser, "$id" | "email" | "name">

function isUnauthorizedError(error: unknown) {
  return (
    error instanceof AppwriteException &&
    (error.code === 401 || error.code === 403)
  )
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

function isNotFoundError(error: unknown) {
  return error instanceof AppwriteException && error.code === 404
}

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ""
  return trimmed ? trimmed : null
}

function getProfileImagesBucketId() {
  const bucketId = APPWRITE_CONFIG.profileImagesBucketId.trim()

  if (!bucketId) {
    throw new Error(
      "Profile photo uploads are not configured. Set EXPO_PUBLIC_APPWRITE_PROFILE_IMAGES_BUCKET_ID to your Appwrite Storage bucket ID."
    )
  }

  return bucketId
}

function getVerificationRedirectUrl() {
  const redirectUrl = APPWRITE_CONFIG.emailRedirectUrl.trim()

  if (!redirectUrl) {
    throw new Error(
      "Email verification is not configured. Set EXPO_PUBLIC_APPWRITE_EMAIL_REDIRECT_URL to an HTTPS URL registered as a Web platform in Appwrite. That URL should forward back to reviewer://verify-email."
    )
  }

  if (!isValidExternalRedirectUrl(redirectUrl)) {
    throw new Error(
      "EXPO_PUBLIC_APPWRITE_EMAIL_REDIRECT_URL must be a valid HTTP or HTTPS URL. Appwrite rejects a raw app-scheme redirect like reviewer://verify-email."
    )
  }

  return redirectUrl
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error && error.message.includes("timed out")) return true
  if (error instanceof AppwriteException) {
    // 408 Request Timeout, 429 Too Many Requests, 5xx server errors
    return error.code === 408 || error.code === 429 || error.code >= 500
  }
  // Network errors (fetch failures, DNS, etc.) don't have a code
  if (
    error instanceof TypeError &&
    /network|fetch|aborted/i.test(error.message)
  )
    return true
  return false
}

function withTimeout<T>(label: string, promise: Promise<T>): Promise<T> {
  let id: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      id = setTimeout(
        () =>
          reject(
            new Error(
              `${label} timed out. Check your Appwrite endpoint, project ID, and platform IDs in Appwrite Console.`
            )
          ),
        REQUEST_TIMEOUT_MS
      )
    }),
  ]).finally(() => id && clearTimeout(id))
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  retries = RETRY_COUNT
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(label, fn())
    } catch (error) {
      lastError = error
      if (attempt < retries && isRetryableError(error)) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw error
    }
  }
  throw lastError
}

function getUserOwnedPermissions(userId: string) {
  const userRole = Role.user(userId)

  return [
    Permission.read(userRole),
    Permission.update(userRole),
    Permission.delete(userRole),
  ]
}

function getUserAvatarPermissions(userId: string) {
  const userRole = Role.user(userId)

  return [
    Permission.read(Role.any()),
    Permission.update(userRole),
    Permission.delete(userRole),
  ]
}

function getProfilePhotoPreviewUrl(fileId: string) {
  const bucketId = getProfileImagesBucketId()

  return storage.getFilePreviewURL(bucketId, fileId, 512, 512).toString()
}

function getUserProfilePayload(
  user: UserBootstrapInput,
  fullName?: string,
  email?: string
) {
  return {
    userId: user.$id,
    fullName: fullName ?? user.name ?? "Reviewer",
    email: email ?? user.email,
    avatarUrl: null,
    schoolName: null,
    reviewType: null,
    isPremium: false,
    createdAt: new Date().toISOString(),
  }
}

async function createUserProfileDocument(
  user: UserBootstrapInput,
  fullName?: string,
  email?: string
) {
  return withRetry("Profile creation", () =>
    tablesDB.createRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.USER_PROFILES,
      rowId: user.$id,
      data: getUserProfilePayload(user, fullName, email),
      permissions: getUserOwnedPermissions(user.$id),
    })
  )
}

async function createUserRoleDocument(userId: string) {
  return withRetry("Role creation", () =>
    tablesDB.createRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.USER_ROLES,
      rowId: userId,
      data: {
        userId,
        role: "student",
      },
      permissions: getUserOwnedPermissions(userId),
    })
  )
}

function getBootstrapFailureMessage() {
  return "Your account was created, but Appwrite blocked the app from creating your user profile. In Appwrite Console, allow collection-level create access for signed-in users on user_profiles and user_roles, then keep document read/update/delete restricted to the owner. Do not send create as a document permission. Best practice: move this bootstrap into an Appwrite Function so profile creation is handled server-side."
}

async function fetchExistingProfile(user: AuthUser): Promise<UserProfile | null> {
  try {
    const profile = await withRetry("Profile lookup", () =>
      tablesDB.getRow({
        databaseId: DB_ID,
        tableId: COLLECTIONS.USER_PROFILES,
        rowId: user.$id,
      })
    )

    return profile as unknown as UserProfile
  } catch (error) {
    if (isAppwriteUnauthorizedError(error)) {
      throw new Error(getBootstrapFailureMessage())
    }

    if (!isNotFoundError(error)) {
      const fallbackProfile = await getUserProfile(user.$id)
      if (fallbackProfile) {
        return fallbackProfile
      }
    }
    return null
  }
}

function handleProfileCreationError(error: unknown) {
  if (error instanceof AppwriteException && error.code !== 409) {
    if (isAppwriteUnauthorizedError(error)) {
      throw new Error(getBootstrapFailureMessage())
    }
    throw new Error(
      toErrorMessage(error, "Unable to create the user profile document.")
    )
  }
}

function handleRoleCreationError(error: unknown) {
  if (error instanceof AppwriteException && error.code !== 409) {
    if (isAppwriteUnauthorizedError(error)) {
      throw new Error(getBootstrapFailureMessage())
    }
    console.warn(
      "[Auth] Unable to create default user role:",
      toErrorMessage(error, "Unknown Appwrite error.")
    )
  }
}

export async function ensureUserProfileSetup(
  user: AuthUser,
  fullName?: string,
  email?: string
): Promise<UserProfile | null> {
  const existingProfile = await fetchExistingProfile(user)
  if (existingProfile) {
    return existingProfile
  }

  const [profileResult, roleResult] = await Promise.allSettled([
    createUserProfileDocument(user, fullName, email),
    createUserRoleDocument(user.$id),
  ])

  if (profileResult.status === "rejected") {
    handleProfileCreationError(profileResult.reason)
  }

  if (roleResult.status === "rejected") {
    handleRoleCreationError(roleResult.reason)
  }

  return getUserProfile(user.$id)
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function createAccount(
  input: CreateAccountInput
): Promise<AuthUser> {
  assertAppwriteConfigured()

  const userId = ID.unique()
  await withRetry("Account creation", () =>
    account.create({ userId, ...input, name: input.fullName })
  )

  await withRetry("Login", () =>
    account.createEmailPasswordSession({ email: input.email, password: input.password })
  )

  const newUser = await withRetry("Session lookup", () => account.get())

  // Fire-and-forget profile bootstrap — don't block registration
  ensureUserProfileSetup(newUser, input.fullName, input.email).catch((error) =>
    console.warn(
      "[Auth] Profile bootstrap failed after registration:",
      toErrorMessage(error, "Unknown Appwrite error.")
    )
  )

  return newUser
}

export async function login(input: LoginInput): Promise<AuthUser> {
  assertAppwriteConfigured()

  await withRetry("Login", () =>
    account.createEmailPasswordSession(input)
  )

  return withRetry("Session lookup", () => account.get())
}

export async function logout(): Promise<void> {
  assertAppwriteConfigured()

  try {
    await withTimeout("Logout", account.deleteSession({ sessionId: "current" }))
  } catch {
    // Ignore if session already expired
  }
}

export async function updateCurrentProfile(
  input: UpdateProfileInput
): Promise<AccountProfileResult> {
  assertAppwriteConfigured()

  const fullName = input.fullName.trim()

  if (!fullName) {
    throw new Error("Full name is required.")
  }

  const currentUser = await withRetry("Session lookup", () => account.get())
  const schoolName = normalizeOptionalString(input.schoolName)
  const reviewType = normalizeOptionalString(input.reviewType)
  const avatarUrl = normalizeOptionalString(input.avatarUrl)

  const updatedUser =
    fullName === (currentUser.name ?? "")
      ? currentUser
      : await withRetry("Profile name update", () =>
          account.updateName({ name: fullName })
        )

  const profile = await ensureUserProfileSetup(
    updatedUser,
    fullName,
    updatedUser.email
  )

  if (!profile) {
    throw new Error("Unable to load your Appwrite profile document.")
  }

  const updatedProfile = await withRetry("Profile update", () =>
    tablesDB.updateRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.USER_PROFILES,
      rowId: profile.$id,
      data: {
        fullName,
        email: updatedUser.email,
        schoolName,
        reviewType,
        avatarUrl,
      },
    })
  )

  return {
    user: updatedUser,
    profile: updatedProfile as unknown as UserProfile,
  }
}

export async function updateCurrentEmail(
  input: UpdateEmailInput
): Promise<AccountProfileResult> {
  assertAppwriteConfigured()

  const email = input.email.trim().toLowerCase()
  const currentPassword = input.currentPassword.trim()

  if (!email) {
    throw new Error("Email address is required.")
  }

  if (!currentPassword) {
    throw new Error("Current password is required to change your email.")
  }

  const updatedUser = await withRetry("Email update", () =>
    account.updateEmail({ email, password: currentPassword })
  )

  const profile = await ensureUserProfileSetup(
    updatedUser,
    updatedUser.name,
    updatedUser.email
  )

  if (!profile) {
    throw new Error("Unable to load your Appwrite profile document.")
  }

  const updatedProfile = await withRetry("Profile email update", () =>
    tablesDB.updateRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.USER_PROFILES,
      rowId: profile.$id,
      data: {
        email: updatedUser.email,
      },
    })
  )

  return {
    user: updatedUser,
    profile: updatedProfile as unknown as UserProfile,
  }
}

function validateProfilePhotoInput(input: UploadProfilePhotoInput) {
  if (!input.uri.trim()) {
    throw new Error("Selected image is missing a valid local URI.")
  }

  if (!input.type.trim().startsWith("image/")) {
    throw new Error("Only image uploads are allowed for profile photos.")
  }

  if (input.size <= 0) {
    throw new Error("Unable to determine the selected image size.")
  }

  if (input.size > 5 * 1024 * 1024) {
    throw new Error("Profile photos must be 5 MB or smaller.")
  }
}

export async function uploadCurrentUserProfilePhoto(
  input: UploadProfilePhotoInput
): Promise<string> {
  assertAppwriteConfigured()
  validateProfilePhotoInput(input)

  const bucketId = getProfileImagesBucketId()
  const currentUser = await withRetry("Session lookup", () => account.get())
  const uploadedFile = await withRetry("Profile photo upload", () =>
    storage.createFile({
      bucketId,
      fileId: ID.unique(),
      file: {
        uri: input.uri,
        name: input.name,
        type: input.type,
        size: input.size,
      },
      permissions: getUserAvatarPermissions(currentUser.$id),
    })
  )

  return getProfilePhotoPreviewUrl(uploadedFile.$id)
}

export async function sendCurrentUserVerificationEmail(): Promise<void> {
  assertAppwriteConfigured()

  await withRetry("Email verification", () =>
    account.createEmailVerification({ url: getVerificationRedirectUrl() })
  )
}

export async function completeCurrentUserEmailVerification(
  input: EmailVerificationInput
): Promise<AuthUser> {
  assertAppwriteConfigured()

  await withRetry("Email verification completion", () =>
    account.updateEmailVerification(input)
  )

  return withRetry("Session lookup", () => account.get())
}

export async function changeCurrentUserPassword(
  input: ChangePasswordInput
): Promise<void> {
  assertAppwriteConfigured()

  const oldPassword = input.currentPassword.trim()
  const password = input.nextPassword.trim()

  if (!oldPassword) {
    throw new Error("Current password is required.")
  }

  if (password.length < 8) {
    throw new Error("New password must be at least 8 characters long.")
  }

  if (password === oldPassword) {
    throw new Error(
      "Choose a new password that is different from the current one."
    )
  }

  await withRetry("Password update", () =>
    account.updatePassword({ password, oldPassword })
  )
}

async function executeDeleteAccountFunction() {
  const functionId = APPWRITE_CONFIG.accountDeleteFunctionId

  if (!functionId) {
    throw new Error(
      "Delete account is not configured yet. Deploy the account deletion Appwrite Function and set EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID."
    )
  }

  return await withRetry("Delete account", () =>
    functions.createExecution({
      functionId,
      body: JSON.stringify({ action: "delete-account" }),
      async: false,
      xpath: "/",
      method: ExecutionMethod.POST,
      headers: {
        "content-type": "application/json",
      },
    })
  )
}

function parseDeleteAccountPayload(responseBody: string) {
  if (!responseBody) return null
  try {
    return JSON.parse(responseBody) as { ok?: boolean; message?: string }
  } catch {
    return null
  }
}

function validateDeleteAccountResponse(
  statusCode: number,
  payload: { ok?: boolean; message?: string } | null
) {
  if (statusCode >= 400 || payload?.ok === false) {
    throw new Error(payload?.message ?? "Unable to delete the account.")
  }
}

export async function deleteCurrentAccount(): Promise<void> {
  assertAppwriteConfigured()

  const execution = await executeDeleteAccountFunction()
  const statusCode = execution.responseStatusCode ?? 500
  const responseBody = execution.responseBody ?? ""

  if (!responseBody && statusCode < 400) {
    return
  }

  const payload = parseDeleteAccountPayload(responseBody)
  validateDeleteAccountResponse(statusCode, payload)
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  assertAppwriteConfigured()

  try {
    return await withRetry("Session check", () => account.get())
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      throw new Error(
        toErrorMessage(error, "Unable to verify the current session.")
      )
    }

    return null
  }
}

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    try {
      const profile = await withRetry("Profile lookup", () =>
        tablesDB.getRow({
          databaseId: DB_ID,
          tableId: COLLECTIONS.USER_PROFILES,
          rowId: userId,
        })
      )

      return profile as unknown as UserProfile
    } catch (error) {
      if (isAppwriteUnauthorizedError(error)) {
        throw error
      }

      const { rows } = await withRetry("Profile lookup", () =>
        tablesDB.listRows({
          databaseId: DB_ID,
          tableId: COLLECTIONS.USER_PROFILES,
          queries: [Query.equal("userId", userId)],
        })
      )

      if (rows.length === 0) {
        return null
      }

      return rows[0] as unknown as UserProfile
    }
  } catch (error) {
    if (isAppwriteUnauthorizedError(error)) {
      console.warn(
        "[Auth]",
        createAppwritePermissionMessage(COLLECTIONS.USER_PROFILES)
      )
    }

    return null
  }
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function getAvatarUrl(name: string): string {
  return avatars.getInitialsURL(name, 80, 80).toString()
}
