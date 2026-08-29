import { isAppwriteNotFoundError, Query } from "../appwrite"
import { buildDeterministicRowId, deleteRow, listAll, tryCreateRow } from "../db"

/**
 * ─── Blocking ─────────────────────────────────────────────────────────────
 *
 * New in v4. One-directional and private to whoever made it: the blocked
 * member is never told and cannot read the table (`member_private`).
 *
 * **This is presentation, not protection**, and the screen that offers it has
 * to say so. A blocked member's posts are still readable by the SDK exactly
 * like everyone else's — Appwrite has no `NOT IN` across tables, so the
 * filtering happens here, on rows the app already fetched. Blocking answers
 * *I do not want to see this person*; reporting answers *somebody should look
 * at this*. An app offering only one of them ends up with members using it for
 * both, so both exist and neither pretends to be the other.
 *
 * The list is short and does not change while a screen is open, so it is read
 * once and applied in memory as things render.
 */

/** One row per (blocker, blocked), so blocking twice is a no-op. */
function buildBlockRowId(userId: string, blockedUserId: string) {
  return buildDeterministicRowId("blk", [userId, blockedUserId])
}

export async function blockMember(input: {
  userId: string
  blockedUserId: string
}): Promise<boolean> {
  if (!input.userId || !input.blockedUserId) {
    return false
  }

  // Blocking yourself would hide your own posts from you, which reads as the
  // app losing them.
  if (input.userId === input.blockedUserId) {
    return false
  }

  await tryCreateRow(
    "user_blocks",
    {
      userId: input.userId,
      blockedUserId: input.blockedUserId,
      createdAt: new Date().toISOString(),
    },
    {
      rowId: buildBlockRowId(input.userId, input.blockedUserId),
      ownerId: input.userId,
    }
  )

  return true
}

export async function unblockMember(input: {
  userId: string
  blockedUserId: string
}): Promise<boolean> {
  if (!input.userId || !input.blockedUserId) {
    return false
  }

  try {
    await deleteRow(
      "user_blocks",
      buildBlockRowId(input.userId, input.blockedUserId)
    )
  } catch (error) {
    // Already unblocked is the state they asked for.
    if (!isAppwriteNotFoundError(error)) {
      throw error
    }
  }

  return true
}

/**
 * Who this member has blocked.
 *
 * Returns an empty set rather than throwing when the read fails — a community
 * feed that will not load is a worse outcome than one that briefly shows
 * somebody who was blocked.
 */
export async function listBlockedUserIds(
  userId: string
): Promise<Set<string>> {
  if (!userId) {
    return new Set()
  }

  try {
    const rows = await listAll<"user_blocks">(
      "user_blocks",
      [Query.equal("userId", userId)],
      { label: "blocked members", maxRows: 1000 }
    )

    return new Set(rows.map((row) => row.blockedUserId))
  } catch {
    return new Set()
  }
}

/** Drops anything written by a blocked member. */
export function filterBlocked<T extends { userId: string }>(
  rows: readonly T[],
  blockedUserIds: ReadonlySet<string>
): T[] {
  if (blockedUserIds.size === 0) {
    return [...rows]
  }

  return rows.filter((row) => !blockedUserIds.has(row.userId))
}
