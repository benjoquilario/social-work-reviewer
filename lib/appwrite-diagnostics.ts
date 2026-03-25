import {
  account,
  COLLECTIONS,
  databases,
  DB_ID,
  getAppwriteConfigurationError,
  isAppwriteUnauthorizedError,
  Query,
} from "./appwrite"
import { getUserProfile } from "./auth"

export type DiagnosticStatus = "success" | "warning" | "error"

export type AppwriteDiagnosticResult = {
  key: string
  label: string
  status: DiagnosticStatus
  message: string
  detail?: string
}

function toDiagnosticMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Unknown Appwrite error."
}

async function diagnoseCollection(
  collectionId: string
): Promise<AppwriteDiagnosticResult> {
  try {
    const response = await databases.listDocuments(DB_ID, collectionId, [
      Query.limit(1),
    ])

    return {
      key: collectionId,
      label: collectionId,
      status: "success",
      message: `Readable. ${response.total} document${response.total === 1 ? "" : "s"} available.`,
    }
  } catch (error) {
    return {
      key: collectionId,
      label: collectionId,
      status: isAppwriteUnauthorizedError(error) ? "error" : "warning",
      message: isAppwriteUnauthorizedError(error)
        ? "Unauthorized to read this collection."
        : "Collection check failed.",
      detail: toDiagnosticMessage(error),
    }
  }
}

export async function runAppwriteDiagnostics(): Promise<
  AppwriteDiagnosticResult[]
> {
  const configError = getAppwriteConfigurationError()

  if (configError) {
    return [
      {
        key: "config",
        label: "Configuration",
        status: "error",
        message: configError,
      },
    ]
  }

  const results: AppwriteDiagnosticResult[] = []

  try {
    const user = await account.get()
    results.push({
      key: "auth",
      label: "Authentication",
      status: "success",
      message: `Authenticated as ${user.email || user.$id}.`,
      detail: `User ID: ${user.$id}`,
    })

    const profile = await getUserProfile(user.$id)
    results.push({
      key: "profile",
      label: "User Profile",
      status: profile ? "success" : "warning",
      message: profile
        ? `Profile readable. Premium: ${profile.isPremium ? "yes" : "no"}.`
        : "No readable user profile was found. The profile may not have been created, or Appwrite may be blocking profile reads for this signed-in user.",
      detail: profile
        ? `Profile document ID: ${profile.$id}`
        : "Recommended Appwrite setup: user_profiles and user_roles should allow collection create for authenticated users, while document read/update/delete stays limited to the owner.",
    })
  } catch (error) {
    results.push({
      key: "auth",
      label: "Authentication",
      status: isAppwriteUnauthorizedError(error) ? "error" : "warning",
      message: isAppwriteUnauthorizedError(error)
        ? "No valid Appwrite session for this user."
        : "Authentication check failed.",
      detail: toDiagnosticMessage(error),
    })
  }

  const collectionResults = await Promise.all(
    Object.values(COLLECTIONS).map((collectionId) =>
      diagnoseCollection(collectionId)
    )
  )

  return [...results, ...collectionResults]
}
