import {
  getAccessModelPermissions,
  getTableAccessModel,
  reviewerCmsSchema,
  reviewerTableEntries,
  tableNeedsRowPermissions,
  type CmsAccessModel,
  type ReviewerTableKey,
} from "../schema"

/**
 * ─── Table IDs ────────────────────────────────────────────────────────────
 *
 * Read off the schema rather than retyped. `MOBILE-SCHEMA-NOTES-v2.md` opens on
 * this rule: a table renamed in the CMS has to become a compile error here,
 * not an empty list at runtime, and a string literal `"questions"` sprinkled
 * through twenty call sites cannot do that.
 */
export const TABLES = Object.fromEntries(
  reviewerTableEntries.map(([key, definition]) => [key, definition.tableId])
) as Record<ReviewerTableKey, string>

export function tableId(key: ReviewerTableKey) {
  return reviewerCmsSchema[key].tableId
}

// ─── What Appwrite lets the app do ──────────────────────────────────────────
//
// Section 11 of the v2 notes. `accessModel` is the server-enforced answer, and
// it is invisible from the dashboard — the CMS reads through an API key, and an
// API key bypasses permissions entirely, so a misconfigured table renders
// perfectly for the team and 401s every member.

export { getTableAccessModel, tableNeedsRowPermissions }

/** Models that grant a signed-in member `create` at the table level. */
const CLIENT_WRITABLE_MODELS = new Set<CmsAccessModel>([
  "member_private",
  "member_public",
  "member_shared",
  "member_submit",
])

/**
 * The tables the app may write.
 *
 * Derived from `accessModel` rather than listed, so a table that changes model
 * in the CMS cannot leave a stale allow-list behind here. Everything else is
 * CMS-owned content or the server's — `payments`, `subscriptions`, `user_roles`
 * and `staff_activity` grant a client nothing at all, and a create against them
 * is a guaranteed 401 (sections 10 and 11).
 */
export const APP_WRITABLE_TABLES = reviewerTableEntries
  .map(([key]) => key)
  .filter((key) => CLIENT_WRITABLE_MODELS.has(getTableAccessModel(key)))

export type AppWritableTable = (typeof APP_WRITABLE_TABLES)[number]

const writableTableSet = new Set<ReviewerTableKey>(APP_WRITABLE_TABLES)

export function isAppWritableTable(key: ReviewerTableKey) {
  return writableTableSet.has(key)
}

/**
 * Whether a signed-in member can read this table at all.
 *
 * `server_only` returns false — `payments` and `access_codes` are not readable
 * from a client, and a screen built on one is a screen that will always be
 * empty. `server_private` is true because the *rows* carry the grant even
 * though the table does not.
 */
export function isAppReadableTable(key: ReviewerTableKey) {
  const model = getTableAccessModel(key)

  if (model === "server_only") {
    return false
  }

  if (model === "member_submit") {
    // Create-only: a member files a report and can never read it back.
    return false
  }

  return true
}

/**
 * True when a query on this table can only ever return the member's own rows.
 *
 * Worth checking before designing a screen: a leaderboard, a "12 others studied
 * this today" line, or a comparison against an average cannot be built on one
 * of these. The query comes back short with no error at all.
 */
export function isMemberScopedTable(key: ReviewerTableKey) {
  return getTableAccessModel(key) === "member_private"
}

export { getAccessModelPermissions }
