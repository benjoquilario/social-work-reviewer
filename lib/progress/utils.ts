import { Query } from "../appwrite"
import {
  buildDeterministicRowId,
  buildLegacyDeterministicRowId,
  findFirst,
  getRowSafe,
  listAll,
  listPage,
  ownedPermissions,
  resolveDeterministicRow,
  TABLES,
} from "../db"
import { isAppwriteConflictError, isAppwriteNotFoundError } from "../appwrite"
import type {
  LearningHistoryDocument,
  ReviewerTableKey,
  UserProgressDocument,
} from "../schema"
import type { ActivityLearningHistory } from "./types"

// Row-ID machinery moved to lib/db/row-id.ts so the session layer and the
// progress layer cannot drift into two different hashes for the same key.
export {
  buildDeterministicRowId,
  buildLegacyDeterministicRowId,
  isAppwriteConflictError,
  isAppwriteNotFoundError,
  ownedPermissions,
  ownedPermissions as getUserOwnedPermissions,
  resolveDeterministicRow,
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function toDayStamp(value: string) {
  const date = new Date(value)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/**
 * `YYYY-MM-DD`, always zero-padded.
 *
 * `activityDate`, `weekStartDate` and `weekEndDate` are **strings**, not
 * datetimes, and the range queries over them are string comparisons — so
 * `2026-3-9` sorts before `2026-03-09` and quietly breaks every week boundary.
 */
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

export function sumNumbers(values: (number | null | undefined)[]) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0)
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

export async function listFirstRow<K extends ReviewerTableKey>(
  tableKey: K,
  queries: string[]
) {
  return findFirst(tableKey, queries)
}

export async function getRowByIdSafe<K extends ReviewerTableKey>(
  tableKey: K,
  rowId: string
) {
  return getRowSafe(tableKey, rowId)
}

/**
 * A running weekly average that leans on history rather than the last result.
 *
 * 80/20 in favour of the stored value, so one bad paper does not erase a good
 * month and one good paper does not paper over a bad one.
 */
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

/**
 * Titles for a set of rows, with a readable placeholder for anything the
 * lookup could not reach — a deleted material should read "Material a1b2c3d4",
 * not break the list it is in.
 */
export async function fetchEntityTitleMap(params: {
  tableKey: Extract<
    ReviewerTableKey,
    "learning_materials" | "topics" | "exam_categories" | "questionnaires"
  >
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
    const rows = await listAll(params.tableKey, [
      Query.equal("$id", params.entityIds),
    ])

    for (const row of rows) {
      const title = (row as { title?: string }).title

      if (title) {
        map.set(row.$id, title)
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

export { listAll, listPage, TABLES }
