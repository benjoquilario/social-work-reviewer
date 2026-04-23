import { DB_ID, Permission, Query, Role, tablesDB } from "../appwrite"
import type { UserProgressDocument } from "../schema"

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

export function toDayStamp(value: string) {
  const date = new Date(value)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
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

import type { ActivityLearningHistory } from "./types"
import type { LearningHistoryDocument } from "../schema"

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
