import { COLLECTIONS, DB_ID, ID, isAppwriteUnauthorizedError, Query, tablesDB } from "../appwrite"
import type { UserAnswerDocument } from "../schema"
import { countCompletedQuizzes, touchGlobalActivity, upsertUserProgress } from "./activity"
import { awardMilestoneIfEligible, awardQuizScoreMilestones, createAchievementIfMissing } from "./milestones"
import type {
  CompleteQuizAttemptPayload,
  QuizResultPayload,
  RecordQuizAnswerPayload,
  ResumableAttemptSummary,
  StartQuizAttemptPayload,
  UserAnswerRowData,
  ExamAttempt,
} from "./types"
import { buildUserAnswerRowId, clampNumber, getUserOwnedPermissions, uniqueStrings } from "./utils"

let hasLoggedUserAnswersUnauthorized = false
let hasLoggedAttemptSyncUnauthorized = false
let isUserAnswersSyncDisabled = false
let isAttemptProgressSyncDisabled = false

function warnUserAnswersUnauthorizedOnce() {
  if (hasLoggedUserAnswersUnauthorized) return
  hasLoggedUserAnswersUnauthorized = true
  console.warn("[progress] Unauthorized access to user_answers. Quiz continues, but per-question answer sync is temporarily disabled for this session.")
}

function warnAttemptSyncUnauthorizedOnce() {
  if (hasLoggedAttemptSyncUnauthorized) return
  hasLoggedAttemptSyncUnauthorized = true
  console.warn("[progress] Unauthorized access to exam_attempts progress sync. Quiz continues, but resume position updates are disabled for this session.")
}

/**
 * Saves a completed quiz result as an exam_attempt document.
 */
export async function saveQuizResult(
  payload: QuizResultPayload
): Promise<void> {
  const attemptId = await startQuizAttempt({
    userId: payload.userId,
    examId: payload.examId,
    totalItems: payload.totalItems,
  })

  if (payload.status === "done") {
    await completeQuizAttempt({
      attemptId,
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
  payload: StartQuizAttemptPayload
): Promise<string> {
  const now = new Date().toISOString()
  const attemptId = ID.unique()

  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_ATTEMPTS,
    rowId: attemptId,
    data: {
      userId: payload.userId,
      examId: payload.examId,
      score: 0,
      totalItems: payload.totalItems,
      timeTaken: 0,
      status: "ongoing",
      startedAt: now,
      finishedAt: null,
      currentQuestionIndex: 0,
      isResumable: true,
      lastAnsweredAt: null,
    },
  })

  return attemptId
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
  if (!isAppwriteUnauthorizedError(createError) && !isAppwriteUnauthorizedError(updateError)) {
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

async function syncAttemptQuestionProgress(params: {
  attemptId: string
  currentQuestionIndex: number
  nowIso: string
}) {
  if (isAttemptProgressSyncDisabled) {
    return
  }

  try {
    await tablesDB.updateRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.EXAM_ATTEMPTS,
      rowId: params.attemptId,
      data: {
        currentQuestionIndex: params.currentQuestionIndex,
        lastAnsweredAt: params.nowIso,
      },
    })
  } catch (error) {
    if (!isAppwriteUnauthorizedError(error)) {
      return
    }

    isAttemptProgressSyncDisabled = true
    warnAttemptSyncUnauthorizedOnce()
  }
}

export async function recordQuizAnswer(
  payload: RecordQuizAnswerPayload
): Promise<void> {
  const now = new Date().toISOString()
  const answerRowId = buildUserAnswerRowId(
    payload.attemptId,
    payload.currentQuestionIndex
  )
  const answerData = {
    attemptId: payload.attemptId,
    questionId: payload.questionId,
    choiceId: payload.choiceId,
    isCorrect: payload.isCorrect,
  }

  await syncUserAnswerRow({
    answerRowId,
    answerData,
    userId: payload.userId,
  })

  await syncAttemptQuestionProgress({
    attemptId: payload.attemptId,
    currentQuestionIndex: payload.currentQuestionIndex,
    nowIso: now,
  })
}

async function updateAttemptAsDone(payload: CompleteQuizAttemptPayload, now: string) {
  await tablesDB.updateRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_ATTEMPTS,
    rowId: payload.attemptId,
    data: {
      score: payload.score,
      totalItems: payload.totalItems,
      timeTaken: payload.timeTaken,
      status: "done",
      finishedAt: now,
      currentQuestionIndex: Math.max(payload.totalItems - 1, 0),
      isResumable: false,
      lastAnsweredAt: now,
    },
  })
}

async function commitQuizProgressStats(payload: CompleteQuizAttemptPayload, averageScore: number, now: string) {
  await upsertUserProgress({
    userId: payload.userId,
    subjectId: payload.subjectId ?? payload.examId,
    topicId: payload.topicId ?? payload.examId,
    averageScore,
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
  averageScore: number
) {
  await createAchievementIfMissing({
    userId: payload.userId,
    achievementType: "quiz_completion",
    title: `Quiz Completed: ${payload.examId}`,
    description: `Finished a quiz with a score of ${averageScore}%.`,
    metricValue: averageScore,
    dayStreak: globalProgress.dayStreak,
    weeklyAverageScore: globalProgress.weeklyAverageScore,
    examId: payload.examId,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    profileSnapshot: payload.profileSnapshot,
  })

  if (globalProgress.weeklyAverageScore >= 80) {
    await createAchievementIfMissing({
      userId: payload.userId,
      achievementType: "weekly_average",
      title: "Strong Weekly Average",
      description: "Maintained a weekly average score of 80% or better across activity.",
      metricValue: globalProgress.weeklyAverageScore,
      dayStreak: globalProgress.dayStreak,
      weeklyAverageScore: globalProgress.weeklyAverageScore,
      profileSnapshot: payload.profileSnapshot,
    })
  }

  await awardQuizScoreMilestones({
    userId: payload.userId,
    metricValue: averageScore,
    dayStreak: globalProgress.dayStreak,
    weeklyAverageScore: globalProgress.weeklyAverageScore,
    examId: payload.examId,
    profileSnapshot: payload.profileSnapshot,
  })

  const completedQuizzes = await countCompletedQuizzes({ userId: payload.userId })
  await awardMilestoneIfEligible({
    configType: "quiz_completion",
    payload: {
      userId: payload.userId,
      metricValue: completedQuizzes,
      dayStreak: globalProgress.dayStreak,
      weeklyAverageScore: globalProgress.weeklyAverageScore,
      profileSnapshot: payload.profileSnapshot,
    },
  })
}

export async function completeQuizAttempt(
  payload: CompleteQuizAttemptPayload
): Promise<void> {
  const now = new Date().toISOString()
  const safeTotalItems = Math.max(payload.totalItems, 1)
  const averageScore = clampNumber(Math.round((payload.score / safeTotalItems) * 100), 0, 100)

  await updateAttemptAsDone(payload, now)
  const globalProgress = await commitQuizProgressStats(payload, averageScore, now)
  await checkAndAwardQuizAchievements(payload, globalProgress, averageScore)
}

export async function getLatestResumableAttempt(
  payload: { userId: string, examId: string }
): Promise<ExamAttempt | null> {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_ATTEMPTS,
    queries: [
      Query.equal("userId", payload.userId),
      Query.equal("examId", payload.examId),
      Query.equal("status", "ongoing"),
      Query.equal("isResumable", true),
      Query.orderDesc("$updatedAt"),
      Query.limit(1),
    ],
  })

  const [attempt] = rows as unknown as ExamAttempt[]
  return attempt ?? null
}

export async function listResumableAttemptsByExam(
  payload: { userId: string, examIds: string[] }
): Promise<Record<string, ResumableAttemptSummary>> {
  const uniqueExamIds = uniqueStrings(payload.examIds)

  if (uniqueExamIds.length === 0) {
    return {}
  }

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_ATTEMPTS,
    queries: [
      Query.equal("userId", payload.userId),
      Query.equal("status", "ongoing"),
      Query.equal("isResumable", true),
      Query.orderDesc("$updatedAt"),
      Query.limit(500),
    ],
  })

  const allowedExamIds = new Set(uniqueExamIds)
  const attempts = rows as unknown as ExamAttempt[]
  const summaryByExamId: Record<string, ResumableAttemptSummary> = {}

  for (const attempt of attempts) {
    if (!allowedExamIds.has(attempt.examId)) {
      continue
    }

    if (summaryByExamId[attempt.examId]) {
      continue
    }

    summaryByExamId[attempt.examId] = {
      attemptId: attempt.$id,
      examId: attempt.examId,
      currentQuestionIndex: attempt.currentQuestionIndex,
      timeTaken: attempt.timeTaken,
      lastAnsweredAt: attempt.lastAnsweredAt,
    }
  }

  return summaryByExamId
}

export async function listAttemptAnswers(payload: { attemptId: string }) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_ANSWERS,
    queries: [
      Query.equal("attemptId", payload.attemptId),
      Query.orderAsc("$updatedAt"),
      Query.limit(500),
    ],
  })

  return rows as unknown as UserAnswerDocument[]
}

export async function syncOngoingAttemptProgress(payload: {
  attemptId: string
  timeTaken: number
  currentQuestionIndex: number
}) {
  await tablesDB.updateRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_ATTEMPTS,
    rowId: payload.attemptId,
    data: {
      timeTaken: Math.max(payload.timeTaken, 0),
      currentQuestionIndex: Math.max(payload.currentQuestionIndex, 0),
      lastAnsweredAt: new Date().toISOString(),
    },
  })
}

/**
 * Fetches all exam attempts for a given user.
 */
export async function getUserAttempts(payload: { userId: string }): Promise<ExamAttempt[]> {
  try {
    const { rows } = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: COLLECTIONS.EXAM_ATTEMPTS,
      queries: [
        Query.equal("userId", payload.userId),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ],
    })
    return rows as unknown as ExamAttempt[]
  } catch {
    return []
  }
}
