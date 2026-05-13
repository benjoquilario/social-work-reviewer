import { COLLECTIONS, DB_ID, Query, tablesDB } from "../appwrite"
import type { LearningHistoryDocument } from "../schema"
import { HISTORY_QUERY_LIMIT } from "./constants"
import {
  countCompletedMaterials,
  recordDailyActivity,
  touchGlobalActivity,
  upsertUserProgress,
} from "./activity"
import { awardMilestoneIfEligible } from "./milestones"
import type {
  LearningActivityPayload,
  LearningHistoryListOptions,
  LearningHistoryListResult,
  LearningHistoryStatus,
  LearningMaterialStatusSnapshot,
} from "./types"
import {
  buildDeterministicRowId,
  clampNumber,
  fetchEntityTitleMap,
  getRowByIdSafe,
  isAppwriteConflictError,
  listFirstRow,
  uniqueStrings,
  mapLearningHistoryRowsToActivityItems,
} from "./utils"

export async function findLearningHistoryRow(
  userId: string,
  learningMaterialId: string
) {
  const rowId = buildDeterministicRowId("history", [
    userId,
    learningMaterialId,
  ])
  const directRow = await getRowByIdSafe<LearningHistoryDocument>(
    COLLECTIONS.LEARNING_HISTORY,
    rowId
  )

  if (directRow) {
    return directRow
  }

  return listFirstRow<LearningHistoryDocument>(COLLECTIONS.LEARNING_HISTORY, [
    Query.equal("userId", userId),
    Query.equal("learningMaterialId", learningMaterialId),
    Query.orderDesc("$updatedAt"),
    Query.limit(1),
  ])
}

type LearningHistoryUpsertParams = {
  userId: string
  subjectId: string
  topicId: string
  learningMaterialId: string
  status: LearningHistoryStatus
  progressPercent: number
  lastPosition: number
  completedAt?: string | null
}

async function updateExistingLearningHistory(
  existing: LearningHistoryDocument,
  params: LearningHistoryUpsertParams,
  nowIso: string
) {
  const nextProgress = Math.max(existing.progressPercent, params.progressPercent)
  const nextLastPosition = Math.max(existing.lastPosition, params.lastPosition)
  const nextStatus = params.status === "completed" ? "completed" : existing.status

  const nextCompletedAt = nextStatus === "completed" 
    ? (params.completedAt ?? existing.completedAt ?? nowIso) 
    : null

  const data = {
    subjectId: params.subjectId,
    topicId: params.topicId,
    status: nextStatus,
    progressPercent: nextProgress,
    lastPosition: nextLastPosition,
    lastAccessedAt: nowIso,
    completedAt: nextCompletedAt,
  }

  await tablesDB.updateRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_HISTORY,
    rowId: existing.$id,
    data,
  })

  return {
    row: { ...existing, ...data },
    wasPreviouslyCompleted: existing.status === "completed",
    nowIso,
  }
}

async function insertNewLearningHistory(
  params: LearningHistoryUpsertParams,
  nowIso: string
) {
  const rowId = buildDeterministicRowId("history", [
    params.userId,
    params.learningMaterialId,
  ])
  const newRow = {
    userId: params.userId,
    subjectId: params.subjectId,
    topicId: params.topicId,
    learningMaterialId: params.learningMaterialId,
    status: params.status,
    progressPercent: params.progressPercent,
    lastPosition: params.lastPosition,
    startedAt: nowIso,
    lastAccessedAt: nowIso,
    createdAt: nowIso,
    completedAt: params.status === "completed" ? (params.completedAt ?? nowIso) : null,
  }

  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_HISTORY,
    rowId,
    data: newRow,
  })

  return {
    row: { ...newRow, $id: rowId },
    wasPreviouslyCompleted: false,
    nowIso,
  }
}

export async function upsertLearningHistory(params: LearningHistoryUpsertParams) {
  const nowIso = new Date().toISOString()
  const existing = await findLearningHistoryRow(params.userId, params.learningMaterialId)
  const safeParams = {
    ...params,
    progressPercent: clampNumber(params.progressPercent, 0, 100),
    lastPosition: Math.max(0, params.lastPosition)
  }

  if (existing) {
    return updateExistingLearningHistory(existing, safeParams, nowIso)
  }

  try {
    return await insertNewLearningHistory(safeParams, nowIso)
  } catch (error) {
    if (!isAppwriteConflictError(error)) {
      throw error
    }

    const createdByConcurrentRequest = await findLearningHistoryRow(
      safeParams.userId,
      safeParams.learningMaterialId
    )

    if (!createdByConcurrentRequest) {
      throw error
    }

    return updateExistingLearningHistory(
      createdByConcurrentRequest,
      safeParams,
      nowIso
    )
  }
}

export async function listRecentLearningHistory(
  payload: { userId: string },
  options: LearningHistoryListOptions = {}
): Promise<LearningHistoryListResult> {
  const historyLimit = Math.floor(clampNumber(options.limit ?? 10, 1, 100))
  const subjectId = options.subjectId?.trim()
  const queries = [Query.equal("userId", payload.userId)]

  if (subjectId) {
    queries.push(Query.equal("subjectId", subjectId))
  }

  queries.push(Query.orderDesc("lastAccessedAt"))
  queries.push(Query.limit(Math.min(historyLimit + 1, HISTORY_QUERY_LIMIT)))

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_HISTORY,
    queries,
  })

  const historyRows = rows as unknown as LearningHistoryDocument[]
  const displayHistoryRows = historyRows.slice(0, historyLimit)
  const hasMore = historyRows.length > historyLimit
  
  const materialTitleMap = await fetchEntityTitleMap({
    collectionId: COLLECTIONS.LEARNING_MATERIALS,
    entityIds: uniqueStrings(displayHistoryRows.map((row) => row.learningMaterialId)),
    fallbackPrefix: "Material"
  })

  return {
    items: mapLearningHistoryRowsToActivityItems(displayHistoryRows, materialTitleMap),
    hasMore,
  }
}

export async function getLearningMaterialStatus(
  payload: { userId: string, learningMaterialId: string }
): Promise<LearningMaterialStatusSnapshot | null> {
  const existing = await findLearningHistoryRow(payload.userId, payload.learningMaterialId)

  if (!existing) {
    return null
  }

  return {
    learningMaterialId: existing.learningMaterialId,
    status: existing.status,
    progressPercent: existing.progressPercent,
    lastAccessedAt: existing.lastAccessedAt,
    completedAt: existing.completedAt ?? null,
  }
}

export async function listLearningMaterialStatusesByTopic(
  payload: { userId: string, topicId: string }
): Promise<Record<string, LearningMaterialStatusSnapshot>> {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_HISTORY,
    queries: [
      Query.equal("userId", payload.userId),
      Query.equal("topicId", payload.topicId),
      Query.orderDesc("$updatedAt"),
      Query.limit(500),
    ],
  })

  const historyRows = rows as unknown as LearningHistoryDocument[]
  const statusByMaterialId: Record<string, LearningMaterialStatusSnapshot> = {}

  for (const row of historyRows) {
    if (statusByMaterialId[row.learningMaterialId]) {
      continue
    }

    statusByMaterialId[row.learningMaterialId] = {
      learningMaterialId: row.learningMaterialId,
      status: row.status,
      progressPercent: row.progressPercent,
      lastAccessedAt: row.lastAccessedAt,
      completedAt: row.completedAt ?? null,
    }
  }

  return statusByMaterialId
}

async function syncLearningActivityProgress(params: {
  payload: LearningActivityPayload
  nowIso: string
  completedMaterialsDelta?: number
  studyMinutesDelta?: number
  achievementsCountDelta?: number
}) {
  const subjectProgress = await upsertUserProgress({
    userId: params.payload.userId,
    subjectId: params.payload.subjectId,
    topicId: params.payload.topicId,
    nowIso: params.nowIso,
    completedMaterialsDelta: params.completedMaterialsDelta,
    totalStudyMinutesDelta: params.studyMinutesDelta,
    achievementsCountDelta: params.achievementsCountDelta,
  })

  const globalProgress = await touchGlobalActivity({
    userId: params.payload.userId,
    nowIso: params.nowIso,
    profileSnapshot: params.payload.profileSnapshot,
  })

  await recordDailyActivity({
    userId: params.payload.userId,
    nowIso: params.nowIso,
    subjectId: params.payload.subjectId,
    topicId: params.payload.topicId,
    counters: {
      answeredCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      studyMinutes: params.studyMinutesDelta ?? 0,
      completedMaterials: params.completedMaterialsDelta ?? 0,
      earnedAchievementsCount:
        (params.achievementsCountDelta ?? 0) +
        (globalProgress.earnedAchievementsCount ?? 0),
    },
  })

  return {
    subjectProgress,
    globalProgress,
  }
}

async function trackLearningMaterialInProgress(params: {
  payload: LearningActivityPayload
  progressPercent: number
  lastPosition: number
}) {
  const { nowIso } = await upsertLearningHistory({
    userId: params.payload.userId,
    subjectId: params.payload.subjectId,
    topicId: params.payload.topicId,
    learningMaterialId: params.payload.learningMaterialId,
    status: "in_progress",
    progressPercent: params.progressPercent,
    lastPosition: params.lastPosition,
  })

  await syncLearningActivityProgress({
    payload: params.payload,
    nowIso,
  })
}

export async function trackLearningMaterialOpened(
  payload: LearningActivityPayload
): Promise<void> {
  await trackLearningMaterialInProgress({
    payload,
    progressPercent: 5,
    lastPosition: 0,
  })
}

export async function trackLearningMaterialResourceOpened(
  payload: LearningActivityPayload
): Promise<void> {
  await trackLearningMaterialInProgress({
    payload,
    progressPercent: 35,
    lastPosition: 1,
  })
}

export async function trackLearningMaterialSession(
  payload: LearningActivityPayload & {
    secondsSpent: number
    lastPosition?: number
  }
): Promise<void> {
  const progressFromTime = clampNumber(
    Math.round((payload.secondsSpent / 180) * 100),
    5,
    95
  )

  await trackLearningMaterialInProgress({
    payload,
    progressPercent: progressFromTime,
    lastPosition: payload.lastPosition ?? 0,
  })

  await syncLearningActivityProgress({
    payload,
    nowIso: new Date().toISOString(),
    studyMinutesDelta: Math.max(1, Math.round(payload.secondsSpent / 60)),
  })
}

export async function trackLearningMaterialCompleted(
  payload: LearningActivityPayload
): Promise<void> {
  const { wasPreviouslyCompleted, nowIso } = await upsertLearningHistory({
    userId: payload.userId,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    learningMaterialId: payload.learningMaterialId,
    status: "completed",
    progressPercent: 100,
    lastPosition: 100,
    completedAt: new Date().toISOString(),
  })

  const { globalProgress } = await syncLearningActivityProgress({
    payload,
    nowIso,
    completedMaterialsDelta: wasPreviouslyCompleted ? 0 : 1,
  })

  const completedMaterials = await countCompletedMaterials({ userId: payload.userId })
  const unlockedAchievements = await awardMilestoneIfEligible({
    configType: "material_completion",
    payload: {
      userId: payload.userId,
      metricValue: completedMaterials,
      dayStreak: globalProgress.dayStreak,
      weeklyAverageScore: globalProgress.weeklyAverageScore,
      metricKey: "materials_completed",
      badgeKey: `materials-${completedMaterials}`,
      periodType: "lifetime",
      profileSnapshot: payload.profileSnapshot,
    }
  })

  if (unlockedAchievements > 0) {
    await Promise.all([
      upsertUserProgress({
        userId: payload.userId,
        subjectId: payload.subjectId,
        topicId: payload.topicId,
        nowIso,
        achievementsCountDelta: unlockedAchievements,
      }),
      upsertUserProgress({
        userId: payload.userId,
        subjectId: "__global__",
        topicId: "__activity__",
        nowIso,
        achievementsCountDelta: unlockedAchievements,
      }),
      recordDailyActivity({
        userId: payload.userId,
        nowIso,
        subjectId: payload.subjectId,
        topicId: payload.topicId,
        counters: {
          answeredCount: 0,
          correctCount: 0,
          incorrectCount: 0,
          studyMinutes: 0,
          completedMaterials: 0,
          earnedAchievementsCount: unlockedAchievements,
        },
      }),
    ])
  }
}
