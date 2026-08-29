import { isAppwriteNotFoundError, Query } from "../appwrite"
import {
  buildDeterministicRowId,
  deleteRow,
  listAll,
  tryCreateRow,
} from "../db"
import type { ReviewerTableDocument } from "../schema"

type UserBookmarkDocument = ReviewerTableDocument<"user_bookmarks">

/**
 * ─── Saved questions ──────────────────────────────────────────────────────
 *
 * New in v3. `user_settings.questionSource` has offered `bookmarked` since the
 * settings screen shipped, and until this table existed nothing stored a
 * bookmark — so choosing it fell through to returning the whole paper. A member
 * asked for their saved questions and got every question, with nothing to tell
 * them otherwise. A setting that quietly does the opposite of what it says is
 * worse than a setting that is not there.
 *
 * Two decisions carry the rest of this file:
 *
 * **The SKU is the identity, not `$id`** (gotcha 5). Row IDs are reissued when
 * the CMS re-imports a sheet, so a bookmark keyed by `$id` silently detaches on
 * the next upload — and it detaches quietly, pointing at a row that either does
 * not exist or is now a different question.
 *
 * **The row ID is derived from (member, SKU)**, so saving and unsaving are both
 * one request with no read first. The unique index on `(userId, questionSku)`
 * would catch a duplicate anyway; deriving the ID means the app never has to
 * ask what the row is called.
 */

export type Bookmark = {
  id: string
  questionSku: string
  categoryId: string | null
  createdAt: string
}

/** One row per (member, question), so saving twice lands on the same row. */
function buildBookmarkRowId(userId: string, questionSku: string) {
  return buildDeterministicRowId("bm", [userId, questionSku])
}

function toBookmark(row: UserBookmarkDocument): Bookmark {
  return {
    id: row.$id,
    questionSku: row.questionSku,
    categoryId: row.categoryId || null,
    createdAt: row.createdAt,
  }
}

export type BookmarkInput = {
  userId: string
  questionSku: string
  /**
   * Optional in the schema, but send it.
   *
   * It is what lets a bookmarked-only session be scoped to one category
   * without first reading every question the member ever saved.
   */
  categoryId?: string | null
}

/**
 * Saves a question. Saving one that is already saved is a no-op, not an error.
 *
 * The unique index makes the second write a 409, which is the point — it
 * settles the race between two taps on the same star, which no app-side check
 * can, because the check and the write are not atomic (gotcha 10).
 */
export async function saveBookmark(input: BookmarkInput): Promise<boolean> {
  if (!input.userId || !input.questionSku) {
    return false
  }

  await tryCreateRow(
    "user_bookmarks",
    {
      userId: input.userId,
      questionSku: input.questionSku,
      categoryId: input.categoryId || "",
      createdAt: new Date().toISOString(),
    },
    {
      rowId: buildBookmarkRowId(input.userId, input.questionSku),
      ownerId: input.userId,
    }
  )

  return true
}

/** Removes a saved question. Removing one that is not saved is also a no-op. */
export async function removeBookmark(input: {
  userId: string
  questionSku: string
}): Promise<boolean> {
  if (!input.userId || !input.questionSku) {
    return false
  }

  try {
    await deleteRow(
      "user_bookmarks",
      buildBookmarkRowId(input.userId, input.questionSku)
    )
  } catch (error) {
    // Already gone is the state the caller asked for. Two taps on the star, or
    // an unsave that raced a sync, should not surface as a failure — the
    // question is not saved, which is exactly what they wanted.
    if (!isAppwriteNotFoundError(error)) {
      throw error
    }
  }

  return true
}

export async function toggleBookmark(
  input: BookmarkInput & { isSaved: boolean }
): Promise<boolean> {
  if (input.isSaved) {
    await removeBookmark(input)
    return false
  }

  await saveBookmark(input)
  return true
}

/**
 * The saved list, newest first.
 *
 * Paged through `listAll`, because gotcha 2 has not gone anywhere: Appwrite's
 * default page is 25 rows and says nothing about the rest, so a member with 40
 * saved questions would silently see 25 of them.
 */
export async function listBookmarks(params: {
  userId: string
  categoryId?: string
  maxRows?: number
}): Promise<Bookmark[]> {
  if (!params.userId) {
    return []
  }

  const rows = await listAll<"user_bookmarks">(
    "user_bookmarks",
    [
      Query.equal("userId", params.userId),
      ...(params.categoryId ? [Query.equal("categoryId", params.categoryId)] : []),
      Query.orderDesc("createdAt"),
    ],
    { label: "bookmarks", maxRows: params.maxRows ?? 500 }
  )

  return rows.map(toBookmark)
}

/**
 * Backing for `questionSource: "bookmarked"` — the same shape `incorrect` and
 * `unanswered` already hand the pool.
 */
export async function listBookmarkedSkus(params: {
  userId: string
  categoryId?: string
}): Promise<Set<string>> {
  const bookmarks = await listBookmarks({ ...params, maxRows: 2000 })

  return new Set(bookmarks.map((bookmark) => bookmark.questionSku))
}
