import {
  DB_ID,
  isAppwriteConflictError,
  isAppwriteNotFoundError,
  Permission,
  Query,
  Role,
  tablesDB,
} from "../appwrite"
import type { LearningHistoryDocument, UserProgressDocument } from "../schema"
import type { ActivityLearningHistory } from "./types"

export function getUserOwnedPermissions(userId: string) {
  const userRole = Role.user(userId)

  return [
    Permission.read(userRole),
    Permission.update(userRole),
    Permission.delete(userRole),
  ]
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function buildUserAnswerRowId(attemptId: string, questionIndex: number) {
  const safeAttemptId = attemptId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 18)
  const safeQuestionIndex = Math.max(0, questionIndex)

  return `ans_${safeAttemptId}_${safeQuestionIndex.toString(36)}`
}

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
 * `legacyHashStringToBase36` returns.
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
 * silently pointed one user's write at another user's row. At 32 bits the
 * chance of some collision reaches 50% around 77,000 rows, and
 * `user_daily_activity` alone is one row per user per active day. At 96 bits
 * that threshold is ~2^48 rows.
 *
 * With `buildDeterministicRowId`'s 12-character prefix cap this yields at most
 * 34 characters, inside Appwrite's 36-character row ID limit.
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
export function buildLegacyDeterministicRowId(
  prefix: string,
  parts: string[]
) {
  return `${toSafePrefix(prefix)}_${legacyHashStringToBase36(parts.join("|"))}`
}

export type ResolvedDeterministicRow<T> = {
  /** The existing row, under either ID scheme. */
  row: T | null
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
 * another user's data — so it throws instead.
 */
export async function resolveDeterministicRow<T extends { userId?: string }>(
  tableId: string,
  prefix: string,
  parts: string[],
  expectedUserId?: string
): Promise<ResolvedDeterministicRow<T>> {
  const rowId = buildDeterministicRowId(prefix, parts)
  const legacyRowId = buildLegacyDeterministicRowId(prefix, parts)

  const assertOwned = (row: T | null, id: string) => {
    if (row && expectedUserId && row.userId && row.userId !== expectedUserId) {
      throw new Error(
        `[progress] Row ID collision on ${tableId}: "${id}" belongs to user ${row.userId}, not ${expectedUserId}. Refusing to overwrite it.`
      )
    }

    return row
  }

  const row = assertOwned(await getRowByIdSafe<T>(tableId, rowId), rowId)

  if (row) {
    return { row, rowId, isLegacy: false }
  }

  const legacyRow = assertOwned(
    await getRowByIdSafe<T>(tableId, legacyRowId),
    legacyRowId
  )

  if (legacyRow) {
    return { row: legacyRow, rowId: legacyRowId, isLegacy: true }
  }

  return { row: null, rowId, isLegacy: false }
}

// Re-exported from lib/appwrite.ts so every module shares one implementation.
export { isAppwriteConflictError, isAppwriteNotFoundError }

export function toDayStamp(value: string) {
  const date = new Date(value)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function toIsoDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getWeekStartDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : new Date(value)
  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  const day = normalized.getUTCDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  normalized.setUTCDate(normalized.getUTCDate() + mondayOffset)
  return toIsoDateKey(normalized)
}

export function getWeekEndDateKey(weekStartDateKey: string) {
  const start = new Date(`${weekStartDateKey}T00:00:00.000Z`)
  start.setUTCDate(start.getUTCDate() + 6)
  return toIsoDateKey(start)
}

export function isSameUtcDay(
  leftIso: string | null | undefined,
  rightIso: string | null | undefined
) {
  if (!leftIso || !rightIso) {
    return false
  }

  return toIsoDateKey(leftIso) === toIsoDateKey(rightIso)
}

export function sumNumbers(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

export function computeNextDayStreak(
  previousDayStreak: number,
  previousLastActiveAt: string | null | undefined,
  nowIso: string
) {
  if (!previousLastActiveAt) {
    return 1
  }

  const dayDifference = Math.round(
    (toDayStamp(nowIso) - toDayStamp(previousLastActiveAt)) / 86400000
  )

  if (dayDifference <= 0) {
    return Math.max(previousDayStreak, 1)
  }

  if (dayDifference === 1) {
    return previousDayStreak + 1
  }

  return 1
}

export async function listFirstRow<T>(tableId: string, queries: string[]) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId,
    queries,
  })

  const [row] = rows as unknown as T[]
  return row ?? null
}

export async function getRowByIdSafe<T>(tableId: string, rowId: string) {
  try {
    return (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId,
      rowId,
    })) as unknown as T
  } catch (error) {
    if (isAppwriteNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export function resolveAverageScoreValues(
  existing: UserProgressDocument | null,
  averageScore: number | undefined
) {
  const existingWeeklyAverageScore = existing?.weeklyAverageScore ?? 0

  if (typeof averageScore !== "number") {
    return {
      averageScore: existing?.averageScore ?? 0,
      weeklyAverageScore: existingWeeklyAverageScore,
    }
  }

  const normalizedAverageScore = clampNumber(averageScore, 0, 100)
  const weightedWeeklyAverage =
    Math.round(
      (existingWeeklyAverageScore * 0.8 + normalizedAverageScore * 0.2) * 100
    ) / 100

  return {
    averageScore: normalizedAverageScore,
    weeklyAverageScore: clampNumber(weightedWeeklyAverage, 0, 100),
  }
}

export function uniqueStrings(values: (string | null | undefined)[]) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  )
}

export function fallbackEntityLabel(prefix: string, id: string) {
  return `${prefix} ${id.slice(0, 8)}`
}

export async function fetchEntityTitleMap(params: {
  collectionId: string
  entityIds: string[]
  fallbackPrefix: string
}) {
  const map = new Map<string, string>()

  if (params.entityIds.length === 0) {
    return map
  }

  for (const entityId of params.entityIds) {
    map.set(entityId, fallbackEntityLabel(params.fallbackPrefix, entityId))
  }

  try {
    const { rows } = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: params.collectionId,
      queries: [
        Query.equal("$id", params.entityIds),
        Query.limit(params.entityIds.length),
      ],
    })

    const typedRows = rows as unknown as { $id: string; title: string }[]
    for (const row of typedRows) {
      if (row.title) {
        map.set(row.$id, row.title)
      }
    }
  } catch {
    // Fallback labels are already populated.
  }

  return map
}

export function mapLearningHistoryRowsToActivityItems(
  historyRows: LearningHistoryDocument[],
  materialTitleMap: Map<string, string>
): ActivityLearningHistory[] {
  return historyRows.map((row) => ({
    id: row.$id,
    learningMaterialId: row.learningMaterialId,
    materialTitle:
      materialTitleMap.get(row.learningMaterialId) ??
      fallbackEntityLabel("Material", row.learningMaterialId),
    subjectId: row.subjectId ?? null,
    topicId: row.topicId ?? null,
    status: row.status,
    progressPercent: row.progressPercent,
    lastPosition: row.lastPosition,
    lastAccessedAt: row.lastAccessedAt,
    completedAt: row.completedAt ?? null,
  }))
}
