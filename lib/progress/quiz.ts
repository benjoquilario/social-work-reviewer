import { ID } from "../appwrite"
import type { UserAnswerDocument } from "../schema"
import { GLOBAL_PROGRESS_SUBJECT_ID, GLOBAL_PROGRESS_TOPIC_ID } from "./constants"
import {
  countCompletedQuizzes,
  recordDailyActivity,
  touchGlobalActivity,
  upsertUserProgress,
} from "./activity"
import {
  awardMilestoneIfEligible,
  awardQuizScoreMilestones,
  createAchievementIfMissing,
} from "./milestones"
import { listUserQuizSessions } from "./quiz-sessions"
import type {
  CompleteQuizAttemptPayload,
  ExamAttempt,
  QuizResultPayload,
  RecordQuizAnswerPayload,
  ResumableAttemptSummary,
  StartQuizAttemptPayload,
  UserAnswerRowData,
} from "./types"
import {
  buildUserAnswerRowId,
  clampNumber,
  getUserOwnedPermissions,
} from "./utils"
import {
  COLLECTIONS,
  DB_ID,
  isAppwriteUnauthorizedError,
  Query,
  tablesDB,
} from "../appwrite"

let hasLoggedUserAnswersUnauthorized = false
let isUserAnswersSyncDisabled = false

function warnUserAnswersUnauthorizedOnce() {
  if (hasLoggedUserAnswersUnauthorized) return
  hasLoggedUserAnswersUnauthorized = true
  console.warn(
    "[progress] Unauthorized access to user_answers. Quiz continues, but per-question answer sync is temporarily disabled for this session."
  )
}

async function createUserAnswerRow(params: {
  answerRowId: string
  answerData: UserAnswerRowData
  userId?: string
}) {
  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_ANSWERS,
    rowId: params.answerRowId,
    data: params.answerData,
    permissions: params.userId
      ? getUserOwnedPermissions(params.userId)
      : undefined,
  })
}

async function updateUserAnswerRow(params: {
  answerRowId: string
  answerData: UserAnswerRowData
}) {
  await tablesDB.updateRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_ANSWERS,
    rowId: params.answerRowId,
    data: params.answerData,
  })
}

function disableUserAnswersSyncIfUnauthorized(
  createError: unknown,
  updateError: unknown
) {
  if (
    !isAppwriteUnauthorizedError(createError) &&
    !isAppwriteUnauthorizedError(updateError)
  ) {
    return
  }

  isUserAnswersSyncDisabled = true
  warnUserAnswersUnauthorizedOnce()
}

async function syncUserAnswerRow(params: {
  answerRowId: string
  answerData: UserAnswerRowData
  userId?: string
}) {
  if (isUserAnswersSyncDisabled) {
    return
  }

  try {
    await createUserAnswerRow(params)
    return
  } catch (createError) {
    try {
      await updateUserAnswerRow(params)
      return
    } catch (updateError) {
      disableUserAnswersSyncIfUnauthorized(createError, updateError)
    }
  }
}

export async function saveQuizResult(
  payload: QuizResultPayload
): Promise<void> {
  const sessionId = await startQuizAttempt({
    userId: payload.userId,
    examId: payload.examId,
    totalItems: payload.totalItems,
  })

  if (payload.status === "done") {
    await completeQuizAttempt({
      attemptId: sessionId,
      userId: payload.userId,
      examId: payload.examId,
      score: payload.score,
      totalItems: payload.totalItems,
      timeTaken: payload.timeTaken,
      subjectId: payload.subjectId,
      topicId: payload.topicId,
      profileSnapshot: payload.profileSnapshot,
    })
  }
}

export async function startQuizAttempt(
  _payload: StartQuizAttemptPayload
): Promise<string> {
  return ID.unique()
}

export async function recordQuizAnswer(
  payload: RecordQuizAnswerPayload
): Promise<void> {
  if (!payload.userId) {
    return
  }

  const now = new Date().toISOString()
  const answerRowId = buildUserAnswerRowId(
    payload.attemptId,
    payload.currentQuestionIndex
  )
  const answerData = {
    userId: payload.userId,
    sessionId: payload.attemptId,
    questionId: payload.questionId,
    sourceQuestionId: payload.sourceQuestionId ?? null,
    subjectId: payload.subjectId ?? null,
    topicId: payload.topicId ?? null,
    questionnaireKey: payload.questionnaireKey ?? null,
    setName: payload.setName ?? "Set A",
    selectedAnswerKey: payload.selectedAnswerKey,
    selectedAnswerText: payload.selectedAnswerText,
    correctAnswerKey: payload.correctAnswerKey,
    correctAnswerText: payload.correctAnswerText,
    isCorrect: payload.isCorrect,
    answeredAt: now,
    responseTimeSeconds: payload.responseTimeSeconds ?? null,
  }

  await syncUserAnswerRow({
    answerRowId,
    answerData,
    userId: payload.userId,
  })
}

async function commitQuizProgressStats(
  payload: CompleteQuizAttemptPayload,
  averageScore: number,
  now: string
) {
  const safeTotalItems = Math.max(payload.totalItems, 1)
  const incorrectCount = Math.max(safeTotalItems - payload.score, 0)

  await upsertUserProgress({
    userId: payload.userId,
    subjectId: payload.subjectId ?? payload.examId,
    topicId: payload.topicId ?? payload.examId,
    averageScore,
    answeredCountDelta: safeTotalItems,
    correctCountDelta: payload.score,
    incorrectCountDelta: incorrectCount,
    scoreDelta: payload.score,
    totalStudyMinutesDelta: Math.max(1, Math.round(payload.timeTaken / 60)),
    lastQuestionIndex: Math.max(payload.totalItems - 1, 0),
    nowIso: now,
  })

  return touchGlobalActivity({
    userId: payload.userId,
    nowIso: now,
    profileSnapshot: payload.profileSnapshot,
  })
}

async function checkAndAwardQuizAchievements(
  payload: CompleteQuizAttemptPayload,
  globalProgress: { dayStreak: number; weeklyAverageScore: number },
  averageScore: number,
  nowIso: string
) {
  let unlockedAchievements = 0

  const createdQuizCompletion = await createAchievementIfMissing({
    userId: payload.userId,
    achievementType: "quiz_completion",
    title: `Quiz Completed: ${payload.examId}`,
    description: `Finished a quiz with a score of ${averageScore}%.`,
    metricValue: averageScore,
    metricKey: "quiz_completion_result",
    badgeKey: `quiz-finish-${payload.examId}`,
    thresholdValue: 1,
    periodType: "instant",
    dayStreak: globalProgress.dayStreak,
    weeklyAverageScore: globalProgress.weeklyAverageScore,
    examId: payload.examId,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    profileSnapshot: payload.profileSnapshot,
  })
  if (createdQuizCompletion) {
    unlockedAchievements += 1
  }

  if (globalProgress.weeklyAverageScore >= 80) {
    const createdWeeklyAverage = await createAchievementIfMissing({
      userId: payload.userId,
      achievementType: "weekly_average",
      title: "Strong Weekly Average",
      description:
        "Maintained a weekly average score of 80% or better across activity.",
      metricValue: globalProgress.weeklyAverageScore,
      thresholdValue: 80,
      metricKey: "weekly_average_score",
      badgeKey: "weekly-average-80",
      periodType: "weekly",
      periodStartDate: nowIso.slice(0, 10),
      dayStreak: globalProgress.dayStreak,
      weeklyAverageScore: globalProgress.weeklyAverageScore,
      profileSnapshot: payload.profileSnapshot,
    })
    if (createdWeeklyAverage) {
      unlockedAchievements += 1
    }
  }

  unlockedAchievements += await awardQuizScoreMilestones({
    userId: payload.userId,
    metricValue: averageScore,
    dayStreak: globalProgress.dayStreak,
    weeklyAverageScore: globalProgress.weeklyAverageScore,
    examId: payload.examId,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    metricKey: "quiz_score",
    profileSnapshot: payload.profileSnapshot,
  })

  const completedQuizzes = await countCompletedQuizzes({
    userId: payload.userId,
  })
  unlockedAchievements += await awardMilestoneIfEligible({
    configType: "quiz_completion",
    payload: {
      userId: payload.userId,
      metricValue: completedQuizzes,
      dayStreak: globalProgress.dayStreak,
      weeklyAverageScore: globalProgress.weeklyAverageScore,
      subjectId: payload.subjectId,
      topicId: payload.topicId,
      metricKey: "quizzes_completed",
      badgeKey: `quizzes-${completedQuizzes}`,
      periodType: "lifetime",
      profileSnapshot: payload.profileSnapshot,
    },
  })

  return unlockedAchievements
}

export async function completeQuizAttempt(
  payload: CompleteQuizAttemptPayload
): Promise<void> {
  const now = new Date().toISOString()
  const safeTotalItems = Math.max(payload.totalItems, 1)
  const averageScore = clampNumber(
    Math.round((payload.score / safeTotalItems) * 100),
    0,
    100
  )

  const globalProgress = await commitQuizProgressStats(
    payload,
    averageScore,
    now
  )
  const unlockedAchievements = await checkAndAwardQuizAchievements(
    payload,
    globalProgress,
    averageScore,
    now
  )

  if (unlockedAchievements > 0) {
    await Promise.all([
      upsertUserProgress({
        userId: payload.userId,
        subjectId: payload.subjectId ?? payload.examId,
        topicId: payload.topicId ?? payload.examId,
        nowIso: now,
        achievementsCountDelta: unlockedAchievements,
      }),
      upsertUserProgress({
        userId: payload.userId,
        subjectId: GLOBAL_PROGRESS_SUBJECT_ID,
        topicId: GLOBAL_PROGRESS_TOPIC_ID,
        nowIso: now,
        achievementsCountDelta: unlockedAchievements,
      }),
    ])
  }

  await recordDailyActivity({
    userId: payload.userId,
    nowIso: now,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    counters: {
      answeredCount: safeTotalItems,
      correctCount: payload.score,
      incorrectCount: Math.max(safeTotalItems - payload.score, 0),
      studyMinutes: Math.max(1, Math.round(payload.timeTaken / 60)),
      completedMaterials: 0,
      earnedAchievementsCount:
        unlockedAchievements + (globalProgress.earnedAchievementsCount ?? 0),
      averageScore,
    },
  })
}

export async function getLatestResumableAttempt(payload: {
  userId: string
  examId: string
}): Promise<ExamAttempt | null> {
  const sessions = await listUserQuizSessions({
    userId: payload.userId,
    examIds: [payload.examId],
  })

  return sessions.find((session) => session.isResumable) ?? null
}

export async function listResumableAttemptsByExam(payload: {
  userId: string
  examIds: string[]
}): Promise<Record<string, ResumableAttemptSummary>> {
  const sessions = await listUserQuizSessions({
    userId: payload.userId,
    examIds: payload.examIds,
  })
  const summaryByExamId: Record<string, ResumableAttemptSummary> = {}

  for (const session of sessions) {
    if (!session.isResumable || summaryByExamId[session.examId]) {
      continue
    }

    summaryByExamId[session.examId] = {
      attemptId: session.$id,
      examId: session.examId,
      currentQuestionIndex: session.currentQuestionIndex,
      timeTaken: session.timeTaken,
      lastAnsweredAt: session.lastAnsweredAt,
    }
  }

  return summaryByExamId
}

export async function listUserResumableAttempts(payload: {
  userId: string
  limit?: number
}): Promise<ExamAttempt[]> {
  const sessions = await listUserQuizSessions({
    userId: payload.userId,
  })

  return sessions
    .filter((session) => session.isResumable)
    .slice(0, Math.max(payload.limit ?? 20, 1))
}

export async function listAttemptAnswers(payload: { attemptId: string }) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_ANSWERS,
    queries: [
      Query.equal("sessionId", payload.attemptId),
      Query.orderAsc("answeredAt"),
      Query.limit(500),
    ],
  })

  return rows as unknown as UserAnswerDocument[]
}

export async function syncOngoingAttemptProgress(_payload: {
  attemptId: string
  timeTaken: number
  currentQuestionIndex: number
}) {
  return
}

export async function getUserAttempts(payload: {
  userId: string
}): Promise<ExamAttempt[]> {
  return listUserQuizSessions({ userId: payload.userId })
}
