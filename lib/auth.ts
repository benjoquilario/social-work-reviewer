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
  getAppwriteErrorCode,
  ID,
  isAppwriteConflictError,
  isAppwriteNotFoundError,
  isAppwriteSessionAlreadyExistsError,
  isAppwriteUnauthorizedError,
  isValidExternalRedirectUrl,
  Permission,
  Query,
  Role,
  storage,
  tablesDB,
} from "./appwrite"
import {
  toMemberProfile,
  type MemberProfile,
  type MemberProfileEdit,
} from "./member/profile"
import {
  isMemberType,
  ownedRowPermissions,
  type UserProfileDocument,
} from "./schema"
import { upsertPublicProfile } from "./member/public-profile"

const REQUEST_TIMEOUT_MS = 12_000
const RETRY_COUNT = 2
const RETRY_BASE_DELAY_MS = 800

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthUser = Models.User<Models.Preferences>

/**
 * The signed-in member.
 *
 * Shaped by `lib/member/profile.ts` from the `user_profiles` row, which is
 * where the schema rules live: `memberType` / `schoolOrEmployer` /
 * `licenseNumber` are the member's own answers and grant nothing, while
 * `isPremium`, `premiumUntil`, `planName` and `subscriptionStatus` are the
 * server's and are read-only here (section 6).
 */
export type UserProfile = MemberProfile

/**
 * What the app may change.
 *
 * Deliberately not the four membership fields — a client that can write those
 * can grant itself access.
 */
export type UpdateProfileInput = MemberProfileEdit

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

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
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

/**
 * Retry wrapper for **idempotent** work only.
 *
 * `withTimeout` races a timer against the request; it cannot abort the request
 * itself. So a call that times out on the client at 12s may still be landing
 * server-side, and retrying it runs the operation a second time. For reads and
 * for writes with a deterministic row ID that is harmless. For anything that
 * mints new state — creating an account, opening a session, uploading a file
 * under `ID.unique()`, consuming a one-time secret — it is not: those use
 * `withTimeout` directly and surface the timeout to the caller.
 */
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

/**
 * Read, update and delete for one member — the permissions every create on a
 * row-security table has to carry (gotcha 1).
 *
 * `user_profiles` is `member_public`, so the table already grants read to
 * every signed-in member (that is what lets a forum thread show its author's
 * name). These row permissions are what keep update and delete to the owner.
 */
function getUserOwnedPermissions(userId: string) {
  return ownedRowPermissions(userId)
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
    avatarUrl: "",
    memberType: "",
    schoolOrEmployer: "",
    licenseNumber: "",
    // The one time the app sends `isPremium`. It is `readOnly` in the schema
    // *and* required, and Appwrite will not hold a default on a required
    // column — so bootstrap has to supply the "no" that every profile starts
    // at. Nothing else in the app ever writes it; access is granted by the
    // server from verified Play data (section 6).
    isPremium: false,
    createdAt: new Date().toISOString(),
  }
}

async function createUserProfileDocument(
  user: UserBootstrapInput,
  fullName?: string,
  email?: string
) {
  const created = await withRetry("Profile creation", () =>
    tablesDB.createRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.USER_PROFILES,
      rowId: user.$id,
      data: getUserProfilePayload(user, fullName, email),
      permissions: getUserOwnedPermissions(user.$id),
    })
  )

  // Signing up writes **two** rows as of v4 (section 20). `user_profiles` is
  // private now — it holds an email address and a licence number — and what
  // other members are allowed to see lives in `user_public_profiles`.
  //
  // A member with the first row and not the second is invisible in the forum:
  // their posts render under a neutral name with no picture. So this is part of
  // account creation rather than something the profile screen fixes later.
  await upsertPublicProfile({
    userId: user.$id,
    displayName: fullName?.trim() || user.name || "Reviewer",
    avatarUrl: null,
    memberType: null,
  })

  return created
}

/**
 * There is deliberately no role bootstrap here.
 *
 * `user_roles` is `server_only` — Appwrite grants a client nothing on it, in
 * either direction, so a create from the app is a guaranteed 401. It is also
 * unnecessary: "no row" and "a `student` row" mean exactly the same thing, both
 * rank 0 with no permissions, and the app must never branch on either
 * (section 14).
 *
 * Roles are the dashboard's. The team grants one there when somebody joins the
 * team; everybody else needs no row at all.
 */

function getBootstrapFailureMessage() {
  return "Your account was created, but Appwrite blocked the app from creating your profile row. In the Appwrite console, user_profiles needs the member_private access model: document security on, with create granted to the users role and each row carrying its owner's permissions. See section 11 of MOBILE-SCHEMA-NOTES-v4.md."
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

    return toMemberProfile(profile as unknown as UserProfileDocument)
  } catch (error) {
    if (isAppwriteUnauthorizedError(error)) {
      throw new Error(getBootstrapFailureMessage())
    }

    if (!isAppwriteNotFoundError(error)) {
      const fallbackProfile = await getUserProfile(user.$id)
      if (fallbackProfile) {
        return fallbackProfile
      }
    }
    return null
  }
}

function handleProfileCreationError(error: unknown) {
  if (getAppwriteErrorCode(error) !== null && !isAppwriteConflictError(error)) {
    if (isAppwriteUnauthorizedError(error)) {
      throw new Error(getBootstrapFailureMessage())
    }
    throw new Error(
      toErrorMessage(error, "Unable to create the user profile document.")
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

  try {
    await createUserProfileDocument(user, fullName, email)
  } catch (error) {
    handleProfileCreationError(error)
  }

  return getUserProfile(user.$id)
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function createAccount(
  input: CreateAccountInput
): Promise<AuthUser> {
  assertAppwriteConfigured()

  const userId = ID.unique()
  await withTimeout(
    "Account creation",
    account.create({ userId, ...input, name: input.fullName })
  )

  await withTimeout(
    "Login",
    account.createEmailPasswordSession({
      email: input.email,
      password: input.password,
    })
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

  try {
    await withTimeout("Login", account.createEmailPasswordSession(input))
  } catch (error) {
    // Appwrite refuses a new session while one is still active. That state is
    // reachable whenever the startup session check gave up (slow network,
    // backgrounded app) while the stored session was in fact still valid — the
    // user then sees a sign-in form that can never succeed. Drop the stale
    // session and take one more run at it.
    if (!isAppwriteSessionAlreadyExistsError(error)) {
      throw error
    }

    await logout()
    await withTimeout("Login", account.createEmailPasswordSession(input))
  }

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
  const schoolOrEmployer = normalizeOptionalString(input.schoolOrEmployer)
  const licenseNumber = normalizeOptionalString(input.licenseNumber)
  const avatarUrl = normalizeOptionalString(input.avatarUrl)
  // Validated before it is trusted, the same way a stored role goes through
  // `toCmsRole` — an unrecognised value is stored as blank, which reads as
  // "not said".
  const memberType = isMemberType(input.memberType) ? input.memberType : ""

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
        memberType,
        schoolOrEmployer: schoolOrEmployer ?? "",
        licenseNumber: licenseNumber ?? "",
        avatarUrl: avatarUrl ?? "",
      },
    })
  )

  // The public half, when the edit touched something other members can see.
  // Not fatal: a private profile that saved and a byline that did not is worth
  // far less noise than losing the whole edit.
  try {
    await upsertPublicProfile({
      userId: updatedUser.$id,
      displayName: fullName,
      avatarUrl,
      memberType,
    })
  } catch (error) {
    console.warn("[auth] Public profile was not updated.", error)
  }

  return {
    user: updatedUser,
    profile: toMemberProfile(updatedProfile as unknown as UserProfileDocument),
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
    profile: toMemberProfile(updatedProfile as unknown as UserProfileDocument),
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
  const uploadedFile = await withTimeout(
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

  await withRetry("Email verification", () =>
    account.createEmailVerification({ url: getVerificationRedirectUrl() })
  )
}

export async function completeCurrentUserEmailVerification(
  input: EmailVerificationInput
): Promise<AuthUser> {
  assertAppwriteConfigured()

  await withTimeout(
    "Email verification completion",
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

  await withTimeout(
    "Password update",
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

  // Not retried: a second execution after a successful delete finds no account
  // and reports a failure for a deletion that actually went through.
  return await withTimeout(
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
    if (!isAppwriteUnauthorizedError(error)) {
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

      return toMemberProfile(profile as unknown as UserProfileDocument)
    } catch (error) {
      if (isAppwriteUnauthorizedError(error)) {
        throw error
      }

      const { rows } = await withRetry("Profile lookup", () =>
        tablesDB.listRows({
          databaseId: DB_ID,
          tableId: COLLECTIONS.USER_PROFILES,
          queries: [Query.equal("userId", userId), Query.limit(1)],
        })
      )

      if (rows.length === 0) {
        return null
      }

      return toMemberProfile(rows[0] as unknown as UserProfileDocument)
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
