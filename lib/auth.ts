import { AppwriteException, Models } from "react-native-appwrite"

import {
  account,
  assertAppwriteConfigured,
  avatars,
  COLLECTIONS,
  createAppwritePermissionMessage,
  databases,
  DB_ID,
  ID,
  isAppwriteUnauthorizedError,
  Permission,
  Query,
  Role,
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
