import { AppwriteException, Models } from "react-native-appwrite"

import {
  account,
  APPWRITE_CONFIG,
  assertAppwriteConfigured,
  avatars,
  COLLECTIONS,
  createAppwritePermissionMessage,
  databases,
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
} from "./appwrite"

const APPWRITE_REQUEST_TIMEOUT_MS = 15000

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

async function withRequestTimeout<T>(
  label: string,
  request: Promise<T>
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      request,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              `${label} timed out. Check your Appwrite endpoint, project ID, and platform IDs in Appwrite Console.`
            )
          )
        }, APPWRITE_REQUEST_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
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
  return withRequestTimeout(
    "Profile creation",
    databases.createDocument(
      DB_ID,
      COLLECTIONS.USER_PROFILES,
      user.$id,
      getUserProfilePayload(user, fullName, email),
      getUserOwnedPermissions(user.$id)
    )
  )
}

async function createUserRoleDocument(userId: string) {
  return withRequestTimeout(
    "Role creation",
    databases.createDocument(
      DB_ID,
      COLLECTIONS.USER_ROLES,
      userId,
      {
        userId,
        role: "student",
      },
      getUserOwnedPermissions(userId)
    )
  )
}

function getBootstrapFailureMessage() {
  return "Your account was created, but Appwrite blocked the app from creating your user profile. In Appwrite Console, allow collection-level create access for signed-in users on user_profiles and user_roles, then keep document read/update/delete restricted to the owner. Do not send create as a document permission. Best practice: move this bootstrap into an Appwrite Function so profile creation is handled server-side."
}

export async function ensureUserProfileSetup(
  user: AuthUser,
  fullName?: string,
  email?: string
): Promise<UserProfile | null> {
  try {
    const profile = await withRequestTimeout(
      "Profile lookup",
      databases.getDocument(DB_ID, COLLECTIONS.USER_PROFILES, user.$id)
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
  }

  try {
    await createUserProfileDocument(user, fullName, email)
  } catch (error) {
    if (error instanceof AppwriteException && error.code !== 409) {
      if (isAppwriteUnauthorizedError(error)) {
        throw new Error(getBootstrapFailureMessage())
      }

      throw new Error(
        toErrorMessage(error, "Unable to create the user profile document.")
      )
    }
  }

  try {
    await createUserRoleDocument(user.$id)
  } catch (error) {
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

  return getUserProfile(user.$id)
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function createAccount(
  email: string,
  password: string,
  fullName: string
): Promise<AuthUser> {
  assertAppwriteConfigured()

  const userId = ID.unique()
  await withRequestTimeout(
    "Account creation",
    account.create({
      userId,
      email,
      password,
      name: fullName,
    })
  )

  // Auto-login after register
  await withRequestTimeout(
    "Login",
    account.createEmailPasswordSession({ email, password })
  )

  const newUser = await withRequestTimeout("Session lookup", account.get())

  try {
    await ensureUserProfileSetup(newUser, fullName, email)
  } catch (error) {
    console.warn(
      "[Auth] Profile bootstrap failed after successful registration:",
      toErrorMessage(error, "Unknown Appwrite error.")
    )
  }

  return newUser
}

export async function login(
  email: string,
  password: string
): Promise<AuthUser> {
  assertAppwriteConfigured()

  await withRequestTimeout(
    "Login",
    account.createEmailPasswordSession({ email, password })
  )

  return withRequestTimeout("Session lookup", account.get())
}

export async function logout(): Promise<void> {
  assertAppwriteConfigured()

  try {
    await withRequestTimeout(
      "Logout",
      account.deleteSession({ sessionId: "current" })
    )
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

  const currentUser = await withRequestTimeout("Session lookup", account.get())
  const schoolName = normalizeOptionalString(input.schoolName)
  const reviewType = normalizeOptionalString(input.reviewType)
  const avatarUrl = normalizeOptionalString(input.avatarUrl)

  const updatedUser =
    fullName === (currentUser.name ?? "")
      ? currentUser
      : await withRequestTimeout(
          "Profile name update",
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

  const updatedProfile = await withRequestTimeout(
    "Profile update",
    databases.updateDocument(DB_ID, COLLECTIONS.USER_PROFILES, profile.$id, {
      fullName,
      email: updatedUser.email,
      schoolName,
      reviewType,
      avatarUrl,
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

  const updatedUser = await withRequestTimeout(
    "Email update",
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

  const updatedProfile = await withRequestTimeout(
    "Profile email update",
    databases.updateDocument(DB_ID, COLLECTIONS.USER_PROFILES, profile.$id, {
      email: updatedUser.email,
    })
  )

  return {
    user: updatedUser,
    profile: updatedProfile as unknown as UserProfile,
  }
}

export async function uploadCurrentUserProfilePhoto(
  input: UploadProfilePhotoInput
): Promise<string> {
  assertAppwriteConfigured()

  const bucketId = getProfileImagesBucketId()

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

  const currentUser = await withRequestTimeout("Session lookup", account.get())
  const uploadedFile = await withRequestTimeout(
    "Profile photo upload",
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

  await withRequestTimeout(
    "Email verification",
    account.createEmailVerification({ url: getVerificationRedirectUrl() })
  )
}

export async function completeCurrentUserEmailVerification(
  userId: string,
  secret: string
): Promise<AuthUser> {
  assertAppwriteConfigured()

  await withRequestTimeout(
    "Email verification completion",
    account.updateEmailVerification({ userId, secret })
  )

  return withRequestTimeout("Session lookup", account.get())
}

export async function changeCurrentUserPassword(
  currentPassword: string,
  nextPassword: string
): Promise<void> {
  assertAppwriteConfigured()

  const oldPassword = currentPassword.trim()
  const password = nextPassword.trim()

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

  await withRequestTimeout(
    "Password update",
    account.updatePassword({ password, oldPassword })
  )
}

export async function deleteCurrentAccount(): Promise<void> {
  assertAppwriteConfigured()

  const functionId = APPWRITE_CONFIG.accountDeleteFunctionId

  if (!functionId) {
    throw new Error(
      "Delete account is not configured yet. Deploy the account deletion Appwrite Function and set EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID."
    )
  }

  const execution = await withRequestTimeout(
    "Delete account",
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

  const responseStatusCode = execution.responseStatusCode ?? 500
  const responseBody = execution.responseBody ?? ""

  if (!responseBody && responseStatusCode < 400) {
    return
  }

  let payload: { ok?: boolean; message?: string } | null = null

  try {
    payload = responseBody
      ? (JSON.parse(responseBody) as { ok?: boolean; message?: string })
      : null
  } catch {
    payload = null
  }

  if (responseStatusCode >= 400 || payload?.ok === false) {
    throw new Error(payload?.message ?? "Unable to delete the account.")
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  assertAppwriteConfigured()

  try {
    return await withRequestTimeout("Session check", account.get())
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
      const profile = await withRequestTimeout(
        "Profile lookup",
        databases.getDocument(DB_ID, COLLECTIONS.USER_PROFILES, userId)
      )

      return profile as unknown as UserProfile
    } catch (error) {
      if (isAppwriteUnauthorizedError(error)) {
        throw error
      }

      const { documents } = await withRequestTimeout(
        "Profile lookup",
        databases.listDocuments(DB_ID, COLLECTIONS.USER_PROFILES, [
          Query.equal("userId", userId),
        ])
      )

      if (documents.length === 0) {
        return null
      }

      return documents[0] as unknown as UserProfile
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
  return avatars.getInitials(name, 80, 80).toString()
}
