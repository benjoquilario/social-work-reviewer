import { COLLECTIONS, DB_ID, Query, tablesDB } from "../appwrite"
import type {
  LearningAchievementDocument,
  LearningHistoryDocument,
  UserDailyActivityDocument,
  UserProgressDocument,
  UserWeeklyReportDocument,
} from "../schema"
import { ACTIVITY_QUERY_LIMIT, GLOBAL_PROGRESS_SUBJECT_ID, GLOBAL_PROGRESS_TOPIC_ID, HISTORY_QUERY_LIMIT } from "./constants"
import { awardMilestoneIfEligible } from "./milestones"
import { getQuizSessionTitle, listUserQuizSessions } from "./quiz-sessions"
import type {
  AchievementProfileSnapshot,
  ActivityFeedOptions,
  RecordDailyActivityParams,
  UpsertUserProgressParams,
  UserActivityFeed,
  UserProgressSummary,
  UserProgressUpsertData,
  ExamAttempt,
} from "./types"
import {
  computeNextDayStreak,
  buildDeterministicRowId,
  fetchEntityTitleMap,
  getUserOwnedPermissions,
  fallbackEntityLabel,
  getWeekEndDateKey,
  getWeekStartDateKey,
  isSameUtcDay,
  isAppwriteConflictError,
  listFirstRow,
  resolveAverageScoreValues,
  resolveDeterministicRow,
  sumNumbers,
  toIsoDateKey,
  uniqueStrings,
  mapLearningHistoryRowsToActivityItems,
} from "./utils"

export async function findUserProgressRow(
  userId: string,
  subjectId: string,
  topicId: string
) {
  // Checks the current row ID, then the pre-widening one, then falls back to a
  // query. The query fallback is what keeps rows written before deterministic
  // IDs existed reachable at all.
  const { row } = await resolveDeterministicRow<UserProgressDocument>(
    COLLECTIONS.USER_PROGRESS,
    "progress",
    [userId, subjectId, topicId],
    userId
  )

  if (row) {
    return row
  }

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
  const answeredCount = Math.max(
    0,
    (existing?.answeredCount ?? 0) + (params.answeredCountDelta ?? 0)
  )
  const correctCount = Math.max(
    0,
    (existing?.correctCount ?? 0) + (params.correctCountDelta ?? 0)
  )
  const incorrectCount = Math.max(
    0,
    (existing?.incorrectCount ?? 0) + (params.incorrectCountDelta ?? 0)
  )
  const completedMaterials = Math.max(
    0,
    (existing?.completedMaterials ?? 0) + (params.completedMaterialsDelta ?? 0)
  )
  const score = Math.max(0, (existing?.score ?? 0) + (params.scoreDelta ?? 0))
  const totalStudyMinutes = Math.max(
    0,
    (existing?.totalStudyMinutes ?? 0) + (params.totalStudyMinutesDelta ?? 0)
  )
  const achievementsCount = Math.max(
    0,
    (existing?.achievementsCount ?? 0) + (params.achievementsCountDelta ?? 0)
  )
  const dayStreak = computeNextDayStreak(
    existing?.dayStreak ?? 0,
    existing?.lastActiveAt,
    nowIso
  )
  const activeDaysCount = isSameUtcDay(existing?.lastActiveAt, nowIso)
    ? existing?.activeDaysCount ?? 0
    : (existing?.activeDaysCount ?? 0) + 1
  const { averageScore, weeklyAverageScore } = resolveAverageScoreValues(
    existing,
    params.averageScore
  )
  const answeredQuestionIds = uniqueStrings([
    ...(existing?.answeredQuestionIds ?? []),
    ...(params.answeredQuestionIdsToAdd ?? []),
  ])
  const accuracyRate =
    answeredCount > 0
      ? Math.round((correctCount / answeredCount) * 10000) / 100
      : existing?.accuracyRate ?? 0

  return {
    userId: params.userId,
    subjectId: params.subjectId,
    topicId: params.topicId,
    questionnaireKey:
      params.questionnaireKey ?? existing?.questionnaireKey ?? null,
    completedMaterials,
    averageScore,
    lastStudied: nowIso,
    lastQuestionId: params.lastQuestionId ?? existing?.lastQuestionId ?? null,
    lastQuestionIndex: Math.max(
      params.lastQuestionIndex ?? existing?.lastQuestionIndex ?? 0,
      0
    ),
    score,
    answeredCount,
    correctCount,
    incorrectCount,
    accuracyRate,
    lastSourceQuestionId:
      params.lastSourceQuestionId ?? existing?.lastSourceQuestionId ?? null,
    answeredQuestionIds,
    setName: params.setName ?? existing?.setName ?? "Set A",
    dayStreak,
    weeklyAverageScore,
    lastActiveAt: nowIso,
    totalStudyMinutes,
    activeDaysCount,
    achievementsCount,
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

export function buildUserProgressRowId(progressData: UserProgressUpsertData) {
  return buildDeterministicRowId("progress", [
    progressData.userId,
    progressData.subjectId,
    progressData.topicId,
  ])
}

export async function createUserProgressRow(progressData: UserProgressUpsertData) {
  const rowId = buildUserProgressRowId(progressData)

  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_PROGRESS,
    rowId,
    data: progressData,
    permissions: getUserOwnedPermissions(progressData.userId),
  })

  return {
    ...progressData,
    $id: rowId,
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
    try {
      return await createUserProgressRow(progressData)
    } catch (error) {
      if (!isAppwriteConflictError(error)) {
        throw error
      }

      const createdByConcurrentRequest = await findUserProgressRow(
        params.userId,
        params.subjectId,
        params.topicId
      )

      if (!createdByConcurrentRequest) {
        throw error
      }

      return updateExistingUserProgress(
        createdByConcurrentRequest,
        buildUserProgressUpsertData(
          params,
          createdByConcurrentRequest,
          nowIso
        )
      )
    }
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

  const earnedAchievementsCount = await awardMilestoneIfEligible({
    configType: "streak",
    payload: {
      userId: params.userId,
      metricValue: progress.dayStreak,
      dayStreak: progress.dayStreak,
      weeklyAverageScore: progress.weeklyAverageScore,
      metricKey: "study_streak",
      badgeKey: `streak-${progress.dayStreak}`,
      periodType: "lifetime",
      profileSnapshot: params.profileSnapshot,
    },
  })

  if (earnedAchievementsCount > 0) {
    const updatedProgress = await upsertUserProgress({
      userId: params.userId,
      subjectId: GLOBAL_PROGRESS_SUBJECT_ID,
      topicId: GLOBAL_PROGRESS_TOPIC_ID,
      nowIso: params.nowIso,
      achievementsCountDelta: earnedAchievementsCount,
    })

    return {
      ...updatedProgress,
      earnedAchievementsCount,
    }
  }

  return {
    ...progress,
    earnedAchievementsCount,
  }
}

async function resolveUserDailyActivityRow(
  userId: string,
  activityDate: string
) {
  return resolveDeterministicRow<UserDailyActivityDocument>(
    COLLECTIONS.USER_DAILY_ACTIVITY,
    "daily",
    [userId, activityDate],
    userId
  )
}

async function resolveUserWeeklyReportRow(
  userId: string,
  weekStartDate: string
) {
  return resolveDeterministicRow<UserWeeklyReportDocument>(
    COLLECTIONS.USER_WEEKLY_REPORTS,
    "weekly",
    [userId, weekStartDate],
    userId
  )
}

async function upsertUserDailyActivity(
  params: RecordDailyActivityParams
): Promise<UserDailyActivityDocument> {
  const nowIso = params.nowIso ?? new Date().toISOString()
  const activityDate = toIsoDateKey(nowIso)
  const weekStartDate = getWeekStartDateKey(nowIso)
  const { row: existing, rowId: dailyRowId } =
    await resolveUserDailyActivityRow(params.userId, activityDate)
  const answeredCount = Math.max(
    0,
    (existing?.answeredCount ?? 0) + params.counters.answeredCount
  )
  const correctCount = Math.max(
    0,
    (existing?.correctCount ?? 0) + params.counters.correctCount
  )
  const incorrectCount = Math.max(
    0,
    (existing?.incorrectCount ?? 0) + params.counters.incorrectCount
  )
  const accuracyRate =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 10000) / 100 : 0
  const averageScore =
    typeof params.counters.averageScore === "number"
      ? params.counters.averageScore
      : accuracyRate

  const data = {
    userId: params.userId,
    activityDate,
    weekStartDate,
    subjectId: params.subjectId ?? existing?.subjectId ?? null,
    topicId: params.topicId ?? existing?.topicId ?? null,
    questionnaireKey:
      params.questionnaireKey ?? existing?.questionnaireKey ?? null,
    setName: params.setName ?? existing?.setName ?? "Set A",
    answeredCount,
    correctCount,
    incorrectCount,
    accuracyRate,
    averageScore,
    studyMinutes: Math.max(
      0,
      (existing?.studyMinutes ?? 0) + params.counters.studyMinutes
    ),
    completedMaterials: Math.max(
      0,
      (existing?.completedMaterials ?? 0) + params.counters.completedMaterials
    ),
    earnedAchievementsCount: Math.max(
      0,
      (existing?.earnedAchievementsCount ?? 0) +
        params.counters.earnedAchievementsCount
    ),
    firstAnsweredAt:
      existing?.firstAnsweredAt ??
      (params.counters.answeredCount > 0 ? nowIso : null),
    lastAnsweredAt:
      params.counters.answeredCount > 0
        ? nowIso
        : existing?.lastAnsweredAt ?? null,
    createdAt: existing?.createdAt ?? nowIso,
  }

  if (existing) {
    await tablesDB.updateRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.USER_DAILY_ACTIVITY,
      rowId: existing.$id,
      data,
    })

    return {
      ...existing,
      ...data,
    }
  }

  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_DAILY_ACTIVITY,
    rowId: dailyRowId,
    data,
    permissions: getUserOwnedPermissions(params.userId),
  })

  return {
    $id: dailyRowId,
    $createdAt: nowIso,
    $updatedAt: nowIso,
    ...data,
  }
}

export async function rebuildUserWeeklyReport(params: {
  userId: string
  weekStartDate: string
  nowIso?: string
}) {
  const nowIso = params.nowIso ?? new Date().toISOString()
  const weekStartDate = params.weekStartDate
  const weekEndDate = getWeekEndDateKey(weekStartDate)
  const [{ rows }, globalProgress] = await Promise.all([
    tablesDB.listRows({
      databaseId: DB_ID,
      tableId: COLLECTIONS.USER_DAILY_ACTIVITY,
      queries: [
        Query.equal("userId", params.userId),
        Query.equal("weekStartDate", weekStartDate),
        Query.limit(20),
      ],
    }),
    findUserProgressRow(
      params.userId,
      GLOBAL_PROGRESS_SUBJECT_ID,
      GLOBAL_PROGRESS_TOPIC_ID
    ),
  ])

  const dailyRows = rows as unknown as UserDailyActivityDocument[]
  const answeredCount = sumNumbers(dailyRows.map((row) => row.answeredCount))
  const correctCount = sumNumbers(dailyRows.map((row) => row.correctCount))
  const incorrectCount = sumNumbers(dailyRows.map((row) => row.incorrectCount))
  const completedMaterials = sumNumbers(
    dailyRows.map((row) => row.completedMaterials)
  )
  const earnedAchievementsCount = sumNumbers(
    dailyRows.map((row) => row.earnedAchievementsCount)
  )
  const studyMinutes = sumNumbers(dailyRows.map((row) => row.studyMinutes))
  const activeDaysCount = dailyRows.filter(
    (row) =>
      row.answeredCount > 0 || row.studyMinutes > 0 || row.completedMaterials > 0
  ).length
  const accuracyRate =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 10000) / 100 : 0
  const averageScore = accuracyRate
  const data = {
    userId: params.userId,
    weekStartDate,
    weekEndDate,
    subjectId: null,
    topicId: null,
    questionnaireKey: null,
    answeredCount,
    correctCount,
    incorrectCount,
    accuracyRate,
    averageScore,
    studyMinutes,
    activeDaysCount,
    completedMaterials,
    earnedAchievementsCount,
    dayStreak: globalProgress?.dayStreak ?? 0,
    generatedAt: nowIso,
  }

  const { row: existing, rowId } = await resolveUserWeeklyReportRow(
    params.userId,
    weekStartDate
  )

  if (existing) {
    await tablesDB.updateRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.USER_WEEKLY_REPORTS,
      rowId,
      data,
    })

    return {
      ...existing,
      ...data,
    }
  }

  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_WEEKLY_REPORTS,
    rowId,
    permissions: getUserOwnedPermissions(params.userId),
    data,
  })

  return {
    $id: rowId,
    $createdAt: nowIso,
    $updatedAt: nowIso,
    ...data,
  }
}

export async function recordDailyActivity(params: RecordDailyActivityParams) {
  const nowIso = params.nowIso ?? new Date().toISOString()
  const dailyRow = await upsertUserDailyActivity({
    ...params,
    nowIso,
  })
  const weeklyReport = await rebuildUserWeeklyReport({
    userId: params.userId,
    weekStartDate: dailyRow.weekStartDate,
    nowIso,
  })

  return {
    dailyRow,
    weeklyReport,
  }
}

export async function countCompletedMaterials(payload: { userId: string }) {
  const { rows, total } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_HISTORY,
    queries: [
      Query.equal("userId", payload.userId),
      Query.equal("status", "completed"),
      Query.limit(500),
    ],
  })

  const completedHistory = rows as unknown as LearningHistoryDocument[]

  // Warn when the result hits the 500-row ceiling so the truncation is
  // visible in logs rather than silently returning an under-count.
  // Long-term fix: maintain a completedMaterialCount counter on the
  // global user_progress row and increment it on material completion.
  if (total > 500) {
    console.warn(
      `[progress] countCompletedMaterials: userId=${payload.userId} has ${total} completed history rows — result is truncated at 500. Consider maintaining a denormalized counter.`
    )
  }

  return uniqueStrings(completedHistory.map((row) => row.learningMaterialId)).length
}


export async function countCompletedQuizzes(payload: { userId: string }) {
  const sessions = await listUserQuizSessions({ userId: payload.userId })
  return sessions.filter((session) => session.status === "done").length
}

export async function getUserActivityFeed(
  payload: { userId: string },
  options: ActivityFeedOptions = {}
): Promise<UserActivityFeed> {
  const userId = payload.userId
  const quizAttemptsLimit = Math.floor(Math.min(Math.max(options.quizAttemptsLimit ?? 8, 1), 100))
  const learningHistoryLimit = Math.floor(Math.min(Math.max(options.learningHistoryLimit ?? 8, 1), 100))
  const achievementsLimit = Math.floor(Math.min(Math.max(options.achievementsLimit ?? 8, 1), 100))

  const [progressRowsResult, quizSessions, historyResult, achievementsResult] =
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
      listUserQuizSessions({ userId }),
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.LEARNING_HISTORY,
        queries: [
          Query.equal("userId", userId),
          Query.orderDesc("lastAccessedAt"),
          Query.limit(Math.min(learningHistoryLimit, HISTORY_QUERY_LIMIT)),
        ],
      }),
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.LEARNING_ACHIEVEMENTS,
        queries: [
          Query.equal("userId", userId),
          Query.orderDesc("earnedAt"),
          Query.limit(Math.min(achievementsLimit, ACTIVITY_QUERY_LIMIT)),
        ],
      }),
    ])

  const progressRows = progressRowsResult.rows as unknown as UserProgressDocument[]
  const historyRows = historyResult.rows as unknown as LearningHistoryDocument[]
  const achievements = achievementsResult.rows as unknown as LearningAchievementDocument[]

  const displayAttempts = quizSessions.slice(0, quizAttemptsLimit)
  const displayHistory = historyRows.slice(0, learningHistoryLimit)
  const displayAchievements = achievements.slice(0, achievementsLimit)

  // `hasMore` comes from the server's `total`, not from the page length.
  // Fetching `limit + 1` and testing `rows.length > limit` dead-ended as soon
  // as the +1 was clipped by the per-collection ceiling: at 30 achievements the
  // query returned exactly 30, `30 > 30` was false, and "Load more" vanished
  // with rows still unread. `total` ignores limit/offset, so it stays honest —
  // and it now also reports more rows than the ceiling can serve, which the
  // truncation warning below makes visible.
  const learningHistoryTotal = historyResult.total ?? historyRows.length
  const achievementsTotal = achievementsResult.total ?? achievements.length

  const quizAttemptsHasMore = quizSessions.length > quizAttemptsLimit
  const learningHistoryHasMore = learningHistoryTotal > displayHistory.length
  const achievementsHasMore = achievementsTotal > displayAchievements.length

  if (__DEV__) {
    if (learningHistoryLimit > HISTORY_QUERY_LIMIT) {
      console.warn(
        `[progress] getUserActivityFeed: learning history is capped at HISTORY_QUERY_LIMIT=${HISTORY_QUERY_LIMIT} but ${learningHistoryLimit} was requested (${learningHistoryTotal} exist). Raise the cap or switch this list to cursor pagination.`
      )
    }

    if (achievementsLimit > ACTIVITY_QUERY_LIMIT) {
      console.warn(
        `[progress] getUserActivityFeed: achievements are capped at ACTIVITY_QUERY_LIMIT=${ACTIVITY_QUERY_LIMIT} but ${achievementsLimit} was requested (${achievementsTotal} exist). Raise the cap or switch this list to cursor pagination.`
      )
    }
  }


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

  const [completedMaterials, completedQuizzes, materialTitleMap] =
    await Promise.all([
      countCompletedMaterials({ userId }),
      countCompletedQuizzes({ userId }),
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
      examTitle: getQuizSessionTitle(attempt),
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
