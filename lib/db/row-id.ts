import { getRowSafe } from "./rows"
import type { ReviewerTableDocument, ReviewerTableKey } from "../schema"

/**
 * ─── Deterministic row IDs ────────────────────────────────────────────────
 *
 * Some rows have a natural key — one answer per (session, item), one activity
 * row per (member, day). Deriving the row ID from that key makes the write
 * idempotent: a retry lands on the same row instead of creating a second one,
 * with no read-before-write.
 *
 * The ID has to fit Appwrite's 36-character limit, so the key is hashed.
 */

const FNV_PRIME = 0x01000193

/**
 * One offset basis per hash pass.
 *
 * Salting the *input* instead (appending a different suffix per pass) looks
 * equivalent but is not: FNV-1a is an iterated state function, so two keys that
 * collide have identical internal state, and appending the same suffix to both
 * keeps them colliding. Verified — suffix salting reproduced the 32-bit
 * collision set exactly. Varying the starting state is what makes the passes
 * independent.
 *
 * The first basis is the standard FNV-1a value, so the first word of a digest
 * is byte-for-byte the old 32-bit digest — which is what
 * `buildLegacyDeterministicRowId` returns.
 */
const HASH_OFFSET_BASES = [0x811c9dc5, 0x01000193, 0x9dc5811c] as const

function fnv1a32(value: string, offsetBasis: number) {
  let hash = offsetBasis

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, FNV_PRIME)
  }

  return hash >>> 0
}

/** One 32-bit word as exactly 7 base36 characters. */
function toBase36Word(value: number) {
  return value.toString(36).padStart(7, "0")
}

/**
 * 96-bit digest, 21 base36 characters.
 *
 * These digests are row IDs, so a collision did not raise an error — it
 * silently pointed one member's write at another member's row. At 32 bits the
 * chance of some collision reaches 50% around 77,000 rows, and
 * `user_daily_activity` alone is one row per member per active day. At 96 bits
 * that threshold is ~2^48 rows.
 *
 * With the 12-character prefix cap this yields at most 34 characters, inside
 * Appwrite's 36-character row ID limit.
 */
function hashStringToBase36(value: string) {
  return HASH_OFFSET_BASES.map((basis) =>
    toBase36Word(fnv1a32(value, basis))
  ).join("")
}

/** The pre-widening 32-bit digest. Only used to find rows written before it. */
function legacyHashStringToBase36(value: string) {
  return toBase36Word(fnv1a32(value, HASH_OFFSET_BASES[0]))
}

function toSafePrefix(prefix: string) {
  return prefix.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12)
}

export function buildDeterministicRowId(prefix: string, parts: string[]) {
  return `${toSafePrefix(prefix)}_${hashStringToBase36(parts.join("|"))}`
}

/**
 * The ID the same key would have had under the 32-bit scheme. Rows written
 * before the widening still live at these IDs, so reads check here as a
 * fallback — see `resolveDeterministicRow`.
 */
export function buildLegacyDeterministicRowId(prefix: string, parts: string[]) {
  return `${toSafePrefix(prefix)}_${legacyHashStringToBase36(parts.join("|"))}`
}

export type ResolvedDeterministicRow<K extends ReviewerTableKey> = {
  /** The existing row, under either ID scheme. */
  row: ReviewerTableDocument<K> | null
  /** Where to write: the row we found, otherwise the new-scheme ID. */
  rowId: string
  /** True when the row was found under the old 32-bit ID. */
  isLegacy: boolean
}

/**
 * Look up a deterministic row, preferring the current ID scheme and falling
 * back to the legacy one, so no migration window is needed: rows keep their old
 * ID until something rewrites them, and new rows get the wide ID.
 *
 * `expectedUserId` is the safety net. A row whose `userId` does not match the
 * caller is a hash collision (or a genuine bug), and continuing would overwrite
 * another member's data — so it throws instead.
 */
export async function resolveDeterministicRow<K extends ReviewerTableKey>(
  tableKey: K,
  prefix: string,
  parts: string[],
  expectedUserId?: string
): Promise<ResolvedDeterministicRow<K>> {
  const rowId = buildDeterministicRowId(prefix, parts)
  const legacyRowId = buildLegacyDeterministicRowId(prefix, parts)

  const assertOwned = (row: ReviewerTableDocument<K> | null, id: string) => {
    const owner = (row as { userId?: string } | null)?.userId

    if (row && expectedUserId && owner && owner !== expectedUserId) {
      throw new Error(
        `[db] Row ID collision on ${tableKey}: "${id}" belongs to user ${owner}, not ${expectedUserId}. Refusing to overwrite it.`
      )
    }

    return row
  }

  const row = assertOwned(await getRowSafe(tableKey, rowId), rowId)

  if (row) {
    return { row, rowId, isLegacy: false }
  }

  const legacyRow = assertOwned(
    await getRowSafe(tableKey, legacyRowId),
    legacyRowId
  )

  if (legacyRow) {
    return { row: legacyRow, rowId: legacyRowId, isLegacy: true }
  }

  return { row: null, rowId, isLegacy: false }
}
