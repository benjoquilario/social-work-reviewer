import { COLLECTIONS, DB_ID, ID, Query, tablesDB } from "../appwrite"
import type {
  LearningAchievementDocument,
  LearningHistoryDocument,
  UserProgressDocument,
} from "../schema"
import { ACTIVITY_QUERY_LIMIT, GLOBAL_PROGRESS_SUBJECT_ID, GLOBAL_PROGRESS_TOPIC_ID, HISTORY_QUERY_LIMIT } from "./constants"
import { awardMilestoneIfEligible } from "./milestones"
import type {
  AchievementProfileSnapshot,
  ActivityFeedOptions,
  UpsertUserProgressParams,
  UserActivityFeed,
  UserProgressSummary,
  UserProgressUpsertData,
  ExamAttempt,
} from "./types"
import {
  computeNextDayStreak,
  fetchEntityTitleMap,
  fallbackEntityLabel,
  listFirstRow,
  resolveAverageScoreValues,
  uniqueStrings,
  mapLearningHistoryRowsToActivityItems,
} from "./utils"

export async function findUserProgressRow(
  userId: string,
  subjectId: string,
  topicId: string
) {
  return listFirstRow<UserProgressDocument>(COLLECTIONS.USER_PROGRESS, [
    Query.equal("userId", userId),
    Query.equal("subjectId", subjectId),
    Query.equal("topicId", topicId),
    Query.limit(1),
  ])
}

export function buildUserProgressUpsertData(
  params: UpsertUserProgressParams,
  existing: UserProgressDocument | null,
  nowIso: string
): UserProgressUpsertData {
  const completedMaterials = Math.max(
    0,
    (existing?.completedMaterials ?? 0) + (params.completedMaterialsDelta ?? 0)
  )
  const dayStreak = computeNextDayStreak(
    existing?.dayStreak ?? 0,
    existing?.lastActiveAt,
    nowIso
  )
  const { averageScore, weeklyAverageScore } = resolveAverageScoreValues(
    existing,
    params.averageScore
  )

  return {
    userId: params.userId,
    subjectId: params.subjectId,
    topicId: params.topicId,
    completedMaterials,
    averageScore,
    lastStudied: nowIso,
    dayStreak,
    weeklyAverageScore,
    lastActiveAt: nowIso,
  }
}

export async function updateExistingUserProgress(
  existing: UserProgressDocument,
  progressData: UserProgressUpsertData
) {
  await tablesDB.updateRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_PROGRESS,
    rowId: existing.$id,
    data: progressData,
  })

  return {
    ...existing,
    ...progressData,
  }
}

export async function createUserProgressRow(progressData: UserProgressUpsertData) {
  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_PROGRESS,
    rowId: ID.unique(),
    data: progressData,
  })

  return {
    ...progressData,
    $id: "",
  }
}

export async function upsertUserProgress(params: UpsertUserProgressParams) {
  const nowIso = params.nowIso ?? new Date().toISOString()
  const existing = await findUserProgressRow(
    params.userId,
    params.subjectId,
    params.topicId
  )
  const progressData = buildUserProgressUpsertData(params, existing, nowIso)

  if (!existing) {
    return createUserProgressRow(progressData)
  }

  return updateExistingUserProgress(existing, progressData)
}

export async function touchGlobalActivity(params: {
  userId: string
  nowIso?: string
  profileSnapshot?: AchievementProfileSnapshot
}) {
  const progress = await upsertUserProgress({
    userId: params.userId,
    subjectId: GLOBAL_PROGRESS_SUBJECT_ID,
    topicId: GLOBAL_PROGRESS_TOPIC_ID,
    nowIso: params.nowIso,
  })

  await awardMilestoneIfEligible({
    configType: "streak",
    payload: {
      userId: params.userId,
      metricValue: progress.dayStreak,
      dayStreak: progress.dayStreak,
      weeklyAverageScore: progress.weeklyAverageScore,
      profileSnapshot: params.profileSnapshot,
    },
  })

  return progress
}

export async function countCompletedMaterials(payload: { userId: string }) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_HISTORY,
    queries: [
      Query.equal("userId", payload.userId),
      Query.equal("status", "completed"),
      Query.limit(500),
    ],
  })

  const completedHistory = rows as unknown as LearningHistoryDocument[]
  return uniqueStrings(completedHistory.map((row) => row.learningMaterialId)).length
}

export async function countCompletedQuizzes(payload: { userId: string }) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_ATTEMPTS,
    queries: [
      Query.equal("userId", payload.userId),
      Query.equal("status", "done"),
      Query.limit(500),
    ],
  })

  return rows.length
}

export async function getUserActivityFeed(
  payload: { userId: string },
  options: ActivityFeedOptions = {}
): Promise<UserActivityFeed> {
  const userId = payload.userId
  const quizAttemptsLimit = Math.floor(Math.min(Math.max(options.quizAttemptsLimit ?? 8, 1), 100))
  const learningHistoryLimit = Math.floor(Math.min(Math.max(options.learningHistoryLimit ?? 8, 1), 100))
  const achievementsLimit = Math.floor(Math.min(Math.max(options.achievementsLimit ?? 8, 1), 100))

  const [progressRowsResult, attemptsResult, historyResult, achievementsResult] =
    await Promise.all([
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.USER_PROGRESS,
        queries: [
          Query.equal("userId", userId),
          Query.orderDesc("$updatedAt"),
          Query.limit(500),
        ],
      }),
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.EXAM_ATTEMPTS,
        queries: [
          Query.equal("userId", userId),
          Query.orderDesc("$updatedAt"),
          Query.limit(Math.min(quizAttemptsLimit + 1, HISTORY_QUERY_LIMIT)),
        ],
      }),
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.LEARNING_HISTORY,
        queries: [
          Query.equal("userId", userId),
          Query.orderDesc("lastAccessedAt"),
          Query.limit(Math.min(learningHistoryLimit + 1, HISTORY_QUERY_LIMIT)),
        ],
      }),
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.LEARNING_ACHIEVEMENTS,
        queries: [
          Query.equal("userId", userId),
          Query.orderDesc("earnedAt"),
          Query.limit(Math.min(achievementsLimit + 1, ACTIVITY_QUERY_LIMIT)),
        ],
      }),
    ])

  const progressRows = progressRowsResult.rows as unknown as UserProgressDocument[]
  const attempts = attemptsResult.rows as unknown as ExamAttempt[]
  const historyRows = historyResult.rows as unknown as LearningHistoryDocument[]
  const achievements = achievementsResult.rows as unknown as LearningAchievementDocument[]
  
  const displayAttempts = attempts.slice(0, quizAttemptsLimit)
  const displayHistory = historyRows.slice(0, learningHistoryLimit)
  const displayAchievements = achievements.slice(0, achievementsLimit)
  
  const quizAttemptsHasMore = attempts.length > quizAttemptsLimit
  const learningHistoryHasMore = historyRows.length > learningHistoryLimit
  const achievementsHasMore = achievements.length > achievementsLimit
  
  const globalProgress = progressRows.find(
    (row) =>
      row.subjectId === GLOBAL_PROGRESS_SUBJECT_ID &&
      row.topicId === GLOBAL_PROGRESS_TOPIC_ID
  )

  const dayStreak =
    globalProgress?.dayStreak ??
    progressRows.reduce((max, row) => Math.max(max, row.dayStreak ?? 0), 0)
  const weeklyAverageScore =
    globalProgress?.weeklyAverageScore ??
    progressRows.reduce(
      (max, row) => Math.max(max, row.weeklyAverageScore ?? 0),
      0
    )
  const lastActiveAt =
    globalProgress?.lastActiveAt ??
    progressRows
      .map((row) => row.lastActiveAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => right.localeCompare(left))[0] ??
    null

  const doneAttempts = displayAttempts.filter((attempt) => attempt.status === "done")
  const averageQuizScore =
    doneAttempts.length === 0
      ? 0
      : Math.round(
          doneAttempts.reduce((sum, attempt) => {
            if (attempt.totalItems <= 0) return sum
            return sum + (attempt.score / attempt.totalItems) * 100
          }, 0) / doneAttempts.length
        )

  const [completedMaterials, completedQuizzes, examTitleMap, materialTitleMap] =
    await Promise.all([
      countCompletedMaterials({ userId }),
      countCompletedQuizzes({ userId }),
      fetchEntityTitleMap({ collectionId: COLLECTIONS.EXAMS, entityIds: uniqueStrings(displayAttempts.map((attempt) => attempt.examId)), fallbackPrefix: "Exam" }),
      fetchEntityTitleMap({ collectionId: COLLECTIONS.LEARNING_MATERIALS, entityIds: uniqueStrings(displayHistory.map((row) => row.learningMaterialId)), fallbackPrefix: "Material" }),
    ])

  return {
    dayStreak,
    weeklyAverageScore,
    lastActiveAt,
    completedMaterials,
    completedQuizzes,
    averageQuizScore,
    quizAttemptsHasMore,
    learningHistoryHasMore,
    achievementsHasMore,
    quizAttempts: displayAttempts.map((attempt) => ({
      id: attempt.$id,
      examId: attempt.examId,
      examTitle: examTitleMap.get(attempt.examId) ?? fallbackEntityLabel("Exam", attempt.examId),
      score: attempt.score,
      totalItems: attempt.totalItems,
      percent: attempt.totalItems > 0 ? Math.round((attempt.score / attempt.totalItems) * 100) : 0,
      timeTaken: attempt.timeTaken,
      status: attempt.status,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      currentQuestionIndex: attempt.currentQuestionIndex,
    })),
    learningHistory: mapLearningHistoryRowsToActivityItems(displayHistory, materialTitleMap),
    achievements: displayAchievements.map((row) => ({
      id: row.$id,
      achievementType: row.achievementType,
      title: row.title,
      description: row.description ?? null,
      metricValue: row.metricValue,
      dayStreak: row.dayStreak,
      weeklyAverageScore: row.weeklyAverageScore,
      earnedAt: row.earnedAt,
    })),
  }
}

export function aggregateProgress(attempts: ExamAttempt[]): UserProgressSummary[] {
  const examMap = new Map<
    string,
    { correct: number; total: number; lastStudied: string }
  >()

  for (const attempt of attempts) {
    if (attempt.status !== "done") continue

    const existing = examMap.get(attempt.examId) ?? {
      correct: 0,
      total: 0,
      lastStudied: attempt.finishedAt ?? attempt.startedAt,
    }

    existing.correct += attempt.score
    existing.total += attempt.totalItems
    if (attempt.finishedAt && attempt.finishedAt > existing.lastStudied) {
      existing.lastStudied = attempt.finishedAt
    }

    examMap.set(attempt.examId, existing)
  }

  return Array.from(examMap.entries()).map(([examId, data]) => ({
    examId,
    totalAttempts: attempts.filter((a) => a.examId === examId).length,
    totalCorrect: data.correct,
    totalItems: data.total,
    averageScore:
      data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    lastStudied: data.lastStudied,
  }))
}
