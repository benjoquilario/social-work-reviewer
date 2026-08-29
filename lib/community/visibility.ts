import { Query } from "../appwrite"
import { updateRow } from "../db"

/**
 * ─── Removed, not deleted ─────────────────────────────────────────────────
 *
 * New in v4, and it follows from the permission fix rather than from a product
 * decision.
 *
 * `posts`, `comments` and `replies` are `member_public`: you may update and
 * delete **your own** rows and nobody else's. Which means a post's author
 * cannot remove the comments other members left underneath it. A hard delete
 * would leave a thread hanging off a post that no longer exists — unreadable,
 * unmoderatable, and unreachable by anyone in the app, forever.
 *
 * So removal is a flag. The row stays, the app stops rendering it, and the CMS
 * purges hidden rows properly with the cascade that only a server-side key can
 * perform.
 *
 * **Every community read must filter.** A read without it is not an error — it
 * just shows deleted posts, which is the kind of bug that reaches a screenshot
 * before it reaches a bug report. `idx_posts_visible`, `idx_comments_visible`
 * and `idx_replies_visible` back exactly this shape.
 */

/** Spread into every `posts`, `comments` and `replies` query. */
export const VISIBLE_ONLY = [Query.equal("isDeleted", false)]

export type SoftDeletableTable = "posts" | "comments" | "replies"

/**
 * Hides one of the member's own rows.
 *
 * An update rather than a delete, and it will 401 on a row they do not own —
 * which is correct, and is the whole reason this is not a delete.
 */
export async function softDelete(
  table: SoftDeletableTable,
  rowId: string
): Promise<void> {
  await updateRow(table, rowId, { isDeleted: true })
}

/** Undo, for a confirmation the member dismisses. Staff removal is not undoable here. */
export async function restoreSoftDeleted(
  table: SoftDeletableTable,
  rowId: string
): Promise<void> {
  await updateRow(table, rowId, { isDeleted: false })
}
