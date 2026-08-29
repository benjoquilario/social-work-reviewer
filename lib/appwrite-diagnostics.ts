import {
  account,
  DB_ID,
  getAppwriteConfigurationError,
  isAppwriteUnauthorizedError,
  Query,
  tablesDB,
} from "./appwrite"
import { getUserProfile } from "./auth"
import { getTableAccessModel, isAppReadableTable, TABLES } from "./db"
import {
  hasActivePremium,
  reviewerTableEntries,
  type ReviewerTableKey,
} from "./schema"

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

/**
 * Probes one table against what its access model says should happen.
 *
 * The point is to tell the two 401s apart (section 11). A table the app is
 * *meant* to read coming back unauthorised is a CMS-side misconfiguration —
 * invisible in the dashboard, because the CMS reads through an API key and an
 * API key bypasses permissions entirely. This names the table so the fix can
 * start on the right side of the repo boundary.
 *
 * Only readable tables are probed. The previous version walked every table in
 * the schema, so `payments`, `access_codes`, `user_roles` and
 * `staff_activity` reported a red "Unauthorized" on every run — they are
 * `server_only` and are supposed to. Four permanent false alarms is how a real
 * one goes unnoticed.
 */
async function diagnoseTable(
  tableKey: ReviewerTableKey
): Promise<AppwriteDiagnosticResult> {
  const tableId = TABLES[tableKey]
  const accessModel = getTableAccessModel(tableKey)

  try {
    const response = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId,
      queries: [Query.limit(1)],
    })

    return {
      key: tableId,
      label: tableId,
      status: "success",
      message: `Readable (${accessModel}). ${response.total} row${
        response.total === 1 ? "" : "s"
      } visible.`,
    }
  } catch (error) {
    if (isAppwriteUnauthorizedError(error)) {
      return {
        key: tableId,
        label: tableId,
        status: "error",
        message: `Unauthorized. This table should be \`${accessModel}\`.`,
        detail:
          "The table's own permissions are wrong, which is fixed in the CMS repo — not here. Run `pnpm appwrite:inspect` there to see which tables have drifted. See section 11 of MOBILE-SCHEMA-NOTES-v2.md.",
      }
    }

    return {
      key: tableId,
      label: tableId,
      status: "warning",
      message: "Read check failed.",
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
        ? // Both numbers, because they can disagree and that disagreement is
          // the answer to "why did my premium stop working": the stored flag
          // lags a lapsed period until a server sweep clears it, while the
          // app gates on the date.
          `Profile readable. Access: ${
            hasActivePremium(profile) ? "premium" : "free"
          } (stored flag: ${profile.isPremium ? "true" : "false"}${
            profile.premiumUntil ? `, until ${profile.premiumUntil}` : ""
          }).`
        : "No readable user profile was found. The profile may not have been created, or Appwrite may be blocking profile reads for this signed-in user.",
      detail: profile
        ? `Profile document ID: ${profile.$id}`
        : "user_profiles needs the member_public access model: document security on, with create and read granted to the users role, and update/delete carried by each row. user_roles is server_only and the app never touches it. See section 11 of MOBILE-SCHEMA-NOTES-v2.md.",
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

  // Server-only and create-only tables are skipped: a 401 from them is the
  // correct answer, not a finding.
  const readableTables = reviewerTableEntries
    .map(([key]) => key)
    .filter(isAppReadableTable)

  const tableResults = await Promise.all(readableTables.map(diagnoseTable))

  return [...results, ...tableResults]
}
