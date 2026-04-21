import {
  COLLECTIONS,
  DB_ID,
  ID,
  isAppwriteUnauthorizedError,
  Permission,
  Query,
  Role,
  tablesDB,
} from "./appwrite"
import type {
  ExamDocument,
  LearningAchievementDocument,
  LearningHistoryDocument,
  LearningMaterialDocument,
  UserAnswerDocument,
  UserProgressDocument,
} from "./schema"

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuizResultPayload = {
  userId: string
  examId: string
  score: number
  totalItems: number
  timeTaken: number // seconds
  status: "ongoing" | "done"
  subjectId?: string
  topicId?: string
  profileSnapshot?: AchievementProfileSnapshot
}

export type ExamAttempt = {
  $id: string
  userId: string
  examId: string
  score: number
  totalItems: number
  timeTaken: number
  status: "ongoing" | "done"
  startedAt: string
  finishedAt: string | null
  currentQuestionIndex: number
  isResumable: boolean
  lastAnsweredAt: string | null
}

export type UserProgressSummary = {
  examId: string
  totalAttempts: number
  totalCorrect: number
  totalItems: number
  averageScore: number
  lastStudied: string | null
}

type LearningHistoryStatus = "in_progress" | "paused" | "completed"

export type AchievementProfileSnapshot = {
  fullName?: string | null
  schoolName?: string | null
  reviewType?: string | null
  avatarUrl?: string | null
}

export type StartQuizAttemptPayload = {
  userId: string
  examId: string
  totalItems: number
}

export type RecordQuizAnswerPayload = {
  attemptId: string
  userId?: string
  questionId: string
  choiceId: string
  isCorrect: boolean
  currentQuestionIndex: number
}

export type CompleteQuizAttemptPayload = {
  attemptId: string
  userId: string
  examId: string
  score: number
  totalItems: number
  timeTaken: number
  subjectId?: string
  topicId?: string
  profileSnapshot?: AchievementProfileSnapshot
}

export type LearningActivityPayload = {
  userId: string
  subjectId: string
  topicId: string
  learningMaterialId: string
  profileSnapshot?: AchievementProfileSnapshot
}

const GLOBAL_PROGRESS_SUBJECT_ID = "__global__"
const GLOBAL_PROGRESS_TOPIC_ID = "__activity__"
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]
const QUIZ_SCORE_MILESTONES = [70, 85, 100]
const MATERIAL_COMPLETION_MILESTONES = [1, 3, 5, 10, 25, 50]
const QUIZ_COMPLETION_MILESTONES = [1, 5, 10, 25, 50]
const ACTIVITY_QUERY_LIMIT = 30
const HISTORY_QUERY_LIMIT = 50
let hasLoggedUserAnswersUnauthorized = false
let hasLoggedAttemptSyncUnauthorized = false
let isUserAnswersSyncDisabled = false
let isAttemptProgressSyncDisabled = false

const STREAK_TIER_META: Record<number, { title: string; description: string }> =
  {
    3: {
      title: "Ignition Scout",
      description: "Lit a 3-day streak and started momentum.",
    },
    7: {
      title: "Weekly Flame",
      description: "Kept a full 7-day learning streak alive.",
    },
    14: {
      title: "Fortnight Focus",
      description: "Maintained focus for 14 straight days.",
    },
    30: {
      title: "Monthly Momentum",
      description: "Completed 30 consecutive active study days.",
    },
    60: {
      title: "Discipline Vanguard",
      description: "Sustained a 60-day streak of consistent study.",
    },
    100: {
      title: "Century Scholar",
      description: "Reached an elite 100-day study streak.",
    },
  }

const QUIZ_SCORE_TIER_META: Record<
  number,
  { title: string; description: string }
> = {
  70: {
    title: "Bronze Breakthrough",
    description: "Scored 70% or higher on a quiz attempt.",
  },
  85: {
    title: "Silver Strategist",
    description: "Scored 85% or higher with strong precision.",
  },
  100: {
    title: "Perfect Ace",
    description: "Scored a perfect 100% on a quiz attempt.",
  },
}

const QUIZ_COMPLETION_TIER_META: Record<
  number,
  { title: string; description: string }
> = {
  1: {
    title: "First Quiz Cleared",
    description: "Completed your first quiz attempt.",
  },
  5: {
    title: "Quiz Cadet",
    description: "Completed 5 total quizzes.",
  },
  10: {
    title: "Quiz Specialist",
    description: "Completed 10 total quizzes.",
  },
  25: {
    title: "Exam Pathfinder",
    description: "Completed 25 total quizzes.",
  },
  50: {
    title: "Grand Examiner",
    description: "Completed 50 total quizzes.",
  },
}

const MATERIAL_COMPLETION_TIER_META: Record<
  number,
  { title: string; description: string }
> = {
  1: {
    title: "First Lesson Complete",
    description: "Finished your first learning material.",
  },
  3: {
    title: "Lesson Explorer",
    description: "Completed 3 learning materials.",
  },
  5: {
    title: "Knowledge Builder",
    description: "Completed 5 learning materials.",
  },
  10: {
    title: "Study Architect",
    description: "Completed 10 learning materials.",
  },
  25: {
    title: "Curriculum Conqueror",
    description: "Completed 25 learning materials.",
  },
  50: {
    title: "Master of Modules",
    description: "Completed 50 learning materials.",
  },
}

export type ActivityFeedOptions = {
  quizAttemptsLimit?: number
  learningHistoryLimit?: number
  achievementsLimit?: number
}

export type ResumableAttemptSummary = {
  attemptId: string
  examId: string
  currentQuestionIndex: number
  timeTaken: number
  lastAnsweredAt: string | null
}

export type ActivityQuizAttempt = {
  id: string
  examId: string
  examTitle: string
  score: number
  totalItems: number
  percent: number
  timeTaken: number
  status: "ongoing" | "done"
  startedAt: string
  finishedAt: string | null
  currentQuestionIndex: number
}

export type ActivityLearningHistory = {
  id: string
  learningMaterialId: string
  materialTitle: string
  subjectId: string | null
  topicId: string | null
  status: "in_progress" | "paused" | "completed"
  progressPercent: number
  lastPosition: number
  lastAccessedAt: string
  completedAt: string | null
}

export type ActivityAchievement = {
  id: string
  achievementType: LearningAchievementDocument["achievementType"]
  title: string
  description: string | null
  metricValue: number
  dayStreak: number
  weeklyAverageScore: number
  earnedAt: string
}

export type UserActivityFeed = {
  dayStreak: number
  weeklyAverageScore: number
  lastActiveAt: string | null
  completedMaterials: number
  completedQuizzes: number
  averageQuizScore: number
  learningHistory: ActivityLearningHistory[]
  learningHistoryHasMore: boolean
  quizAttempts: ActivityQuizAttempt[]
  quizAttemptsHasMore: boolean
  achievements: ActivityAchievement[]
  achievementsHasMore: boolean
}

export type LearningHistoryListOptions = {
  subjectId?: string
  limit?: number
}

export type LearningHistoryListResult = {
  items: ActivityLearningHistory[]
  hasMore: boolean
}

export type LearningMaterialStatusSnapshot = {
  learningMaterialId: string
  status: "in_progress" | "paused" | "completed"
  progressPercent: number
  lastAccessedAt: string
  completedAt: string | null
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function buildUserAnswerRowId(attemptId: string, questionIndex: number) {
  const safeAttemptId = attemptId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 18)
  const safeQuestionIndex = Math.max(0, questionIndex)

  return `ans_${safeAttemptId}_${safeQuestionIndex.toString(36)}`
}

function warnUserAnswersUnauthorizedOnce() {
  if (hasLoggedUserAnswersUnauthorized) {
    return
  }

  hasLoggedUserAnswersUnauthorized = true
  console.warn(
    "[progress] Unauthorized access to user_answers. Quiz continues, but per-question answer sync is temporarily disabled for this session."
  )
}

function warnAttemptSyncUnauthorizedOnce() {
  if (hasLoggedAttemptSyncUnauthorized) {
    return
  }

  hasLoggedAttemptSyncUnauthorized = true
  console.warn(
    "[progress] Unauthorized access to exam_attempts progress sync. Quiz continues, but resume position updates are disabled for this session."
  )
}

function getUserOwnedPermissions(userId: string) {
  const userRole = Role.user(userId)

  return [
    Permission.read(userRole),
    Permission.update(userRole),
    Permission.delete(userRole),
  ]
}

function toDayStamp(value: string) {
  const date = new Date(value)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function computeNextDayStreak(
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

async function findUserProgressRow(
  userId: string,
  subjectId: string,
  topicId: string
) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_PROGRESS,
    queries: [
      Query.equal("userId", userId),
      Query.equal("subjectId", subjectId),
      Query.equal("topicId", topicId),
      Query.limit(1),
    ],
  })

  const [row] = rows as unknown as UserProgressDocument[]
  return row ?? null
}

async function upsertUserProgress(params: {
  userId: string
  subjectId: string
  topicId: string
  nowIso?: string
  averageScore?: number
  completedMaterialsDelta?: number
}) {
  const nowIso = params.nowIso ?? new Date().toISOString()
  const existing = await findUserProgressRow(
    params.userId,
    params.subjectId,
    params.topicId
  )

  const baseCompleted = existing?.completedMaterials ?? 0
  const completedMaterials = Math.max(
    0,
    baseCompleted + (params.completedMaterialsDelta ?? 0)
  )
  const dayStreak = computeNextDayStreak(
    existing?.dayStreak ?? 0,
    existing?.lastActiveAt,
    nowIso
  )
  const existingWeeklyAverageScore = existing?.weeklyAverageScore ?? 0
  const hasNewAverage = typeof params.averageScore === "number"
  const nextAverageScore = hasNewAverage
    ? clampNumber(params.averageScore ?? 0, 0, 100)
    : (existing?.averageScore ?? 0)
  const nextWeeklyAverageScore = hasNewAverage
    ? clampNumber(
        Math.round(
          (existingWeeklyAverageScore * 0.8 + nextAverageScore * 0.2) * 100
        ) / 100,
        0,
        100
      )
    : existingWeeklyAverageScore

  const progressData = {
    userId: params.userId,
    subjectId: params.subjectId,
    topicId: params.topicId,
    completedMaterials,
    averageScore: nextAverageScore,
    lastStudied: nowIso,
    dayStreak,
    weeklyAverageScore: nextWeeklyAverageScore,
    lastActiveAt: nowIso,
  }

  if (existing) {
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

async function findLearningHistoryRow(
  userId: string,
  learningMaterialId: string
) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_HISTORY,
    queries: [
      Query.equal("userId", userId),
      Query.equal("learningMaterialId", learningMaterialId),
      Query.orderDesc("$updatedAt"),
      Query.limit(1),
    ],
  })

  const [row] = rows as unknown as LearningHistoryDocument[]
  return row ?? null
}

async function upsertLearningHistory(params: {
  userId: string
  subjectId: string
  topicId: string
  learningMaterialId: string
  status: LearningHistoryStatus
  progressPercent: number
  lastPosition: number
  completedAt?: string | null
}) {
  const nowIso = new Date().toISOString()
  const existing = await findLearningHistoryRow(
    params.userId,
    params.learningMaterialId
  )
  const progressPercent = clampNumber(params.progressPercent, 0, 100)
  const lastPosition = Math.max(0, params.lastPosition)

  if (existing) {
    const nextProgress = Math.max(existing.progressPercent, progressPercent)
    const nextLastPosition = Math.max(existing.lastPosition, lastPosition)
    const nextStatus =
      params.status === "completed" ? "completed" : existing.status

    await tablesDB.updateRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.LEARNING_HISTORY,
      rowId: existing.$id,
      data: {
        subjectId: params.subjectId,
        topicId: params.topicId,
        status: nextStatus,
        progressPercent: nextProgress,
        lastPosition: nextLastPosition,
        lastAccessedAt: nowIso,
        completedAt:
          nextStatus === "completed"
            ? (params.completedAt ?? existing.completedAt ?? nowIso)
            : null,
      },
    })

    return {
      row: {
        ...existing,
        subjectId: params.subjectId,
        topicId: params.topicId,
        status: nextStatus,
        progressPercent: nextProgress,
        lastPosition: nextLastPosition,
        lastAccessedAt: nowIso,
        completedAt:
          nextStatus === "completed"
            ? (params.completedAt ?? existing.completedAt ?? nowIso)
            : null,
      },
      wasPreviouslyCompleted: existing.status === "completed",
      nowIso,
    }
  }

  const newRow = {
    userId: params.userId,
    subjectId: params.subjectId,
    topicId: params.topicId,
    learningMaterialId: params.learningMaterialId,
    status: params.status,
    progressPercent,
    lastPosition,
    startedAt: nowIso,
    lastAccessedAt: nowIso,
    createdAt: nowIso,
    completedAt:
      params.status === "completed" ? (params.completedAt ?? nowIso) : null,
  }

  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_HISTORY,
    rowId: ID.unique(),
    data: newRow,
  })

  return {
    row: {
      ...newRow,
      $id: "",
    },
    wasPreviouslyCompleted: false,
    nowIso,
  }
}

async function createAchievementIfMissing(params: {
  userId: string
  achievementType: LearningAchievementDocument["achievementType"]
  title: string
  description: string
  metricValue: number
  dayStreak: number
  weeklyAverageScore: number
  subjectId?: string
  topicId?: string
  learningMaterialId?: string
  examId?: string
  profileSnapshot?: AchievementProfileSnapshot
}) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_ACHIEVEMENTS,
    queries: [
      Query.equal("userId", params.userId),
      Query.equal("achievementType", params.achievementType),
      Query.equal("title", params.title),
      Query.limit(25),
    ],
  })

  const existingRows = rows as unknown as LearningAchievementDocument[]
  const alreadyExists = existingRows.some((row) => {
    return (
      (row.examId ?? null) === (params.examId ?? null) &&
      (row.learningMaterialId ?? null) === (params.learningMaterialId ?? null)
    )
  })

  if (alreadyExists) {
    return
  }

  const nowIso = new Date().toISOString()

  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_ACHIEVEMENTS,
    rowId: ID.unique(),
    data: {
      userId: params.userId,
      fullName: params.profileSnapshot?.fullName ?? null,
      schoolName: params.profileSnapshot?.schoolName ?? null,
      reviewType: params.profileSnapshot?.reviewType ?? null,
      avatarUrl: params.profileSnapshot?.avatarUrl ?? null,
      subjectId: params.subjectId ?? null,
      topicId: params.topicId ?? null,
      learningMaterialId: params.learningMaterialId ?? null,
      examId: params.examId ?? null,
      achievementType: params.achievementType,
      title: params.title,
      description: params.description,
      metricValue: params.metricValue,
      dayStreak: params.dayStreak,
      weeklyAverageScore: params.weeklyAverageScore,
      earnedAt: nowIso,
      createdAt: nowIso,
    },
  })
}

async function awardStreakMilestoneIfEligible(params: {
  userId: string
  dayStreak: number
  weeklyAverageScore: number
  profileSnapshot?: AchievementProfileSnapshot
}) {
  if (!STREAK_MILESTONES.includes(params.dayStreak)) {
    return
  }

  const tierMeta = STREAK_TIER_META[params.dayStreak]

  await createAchievementIfMissing({
    userId: params.userId,
    achievementType: "streak",
    title: tierMeta?.title ?? `${params.dayStreak}-Day Study Streak`,
    description:
      tierMeta?.description ??
      `Stayed active for ${params.dayStreak} consecutive day${
        params.dayStreak > 1 ? "s" : ""
      }.`,
    metricValue: params.dayStreak,
    dayStreak: params.dayStreak,
    weeklyAverageScore: params.weeklyAverageScore,
    profileSnapshot: params.profileSnapshot,
  })
}

async function touchGlobalActivity(params: {
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

  await awardStreakMilestoneIfEligible({
    userId: params.userId,
    dayStreak: progress.dayStreak,
    weeklyAverageScore: progress.weeklyAverageScore,
    profileSnapshot: params.profileSnapshot,
  })

  return progress
}

function uniqueStrings(values: (string | null | undefined)[]) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  )
}

function fallbackEntityLabel(prefix: string, id: string) {
  return `${prefix} ${id.slice(0, 8)}`
}

function mapLearningHistoryRowsToActivityItems(
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

async function fetchExamTitleMap(examIds: string[]) {
  const map = new Map<string, string>()

  if (examIds.length === 0) {
    return map
  }

  for (const examId of examIds) {
    map.set(examId, fallbackEntityLabel("Exam", examId))
  }

  try {
    const { rows } = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: COLLECTIONS.EXAMS,
      queries: [Query.equal("$id", examIds), Query.limit(examIds.length)],
    })
    const exams = rows as unknown as ExamDocument[]

    for (const exam of exams) {
      map.set(exam.$id, exam.title)
    }
  } catch {
    // Fallback labels are already populated.
  }

  return map
}

async function fetchLearningMaterialTitleMap(materialIds: string[]) {
  const map = new Map<string, string>()

  if (materialIds.length === 0) {
    return map
  }

  for (const materialId of materialIds) {
    map.set(materialId, fallbackEntityLabel("Material", materialId))
  }

  try {
    const { rows } = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: COLLECTIONS.LEARNING_MATERIALS,
      queries: [
        Query.equal("$id", materialIds),
        Query.limit(materialIds.length),
      ],
    })
    const materials = rows as unknown as LearningMaterialDocument[]

    for (const material of materials) {
      map.set(material.$id, material.title)
    }
  } catch {
    // Fallback labels are already populated.
  }

  return map
}

async function countCompletedMaterials(userId: string) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_HISTORY,
    queries: [
      Query.equal("userId", userId),
      Query.equal("status", "completed"),
      Query.limit(500),
    ],
  })

  const completedHistory = rows as unknown as LearningHistoryDocument[]
  return uniqueStrings(completedHistory.map((row) => row.learningMaterialId))
    .length
}

async function countCompletedQuizzes(userId: string) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_ATTEMPTS,
    queries: [
      Query.equal("userId", userId),
      Query.equal("status", "done"),
      Query.limit(500),
    ],
  })

  return rows.length
}

async function awardQuizScoreMilestones(params: {
  userId: string
  quizPercent: number
  examId: string
  dayStreak: number
  weeklyAverageScore: number
  profileSnapshot?: AchievementProfileSnapshot
}) {
  for (const threshold of QUIZ_SCORE_MILESTONES) {
    if (params.quizPercent < threshold) {
      continue
    }

    const tierMeta = QUIZ_SCORE_TIER_META[threshold]

    await createAchievementIfMissing({
      userId: params.userId,
      achievementType: "consistency",
      title: tierMeta?.title ?? `Quiz Score ${threshold}% Milestone`,
      description:
        tierMeta?.description ??
        `Reached at least ${threshold}% in a quiz attempt.`,
      metricValue: params.quizPercent,
      dayStreak: params.dayStreak,
      weeklyAverageScore: params.weeklyAverageScore,
      examId: params.examId,
      profileSnapshot: params.profileSnapshot,
    })
  }
}

async function awardQuizCompletionMilestoneIfEligible(params: {
  userId: string
  completedQuizzes: number
  dayStreak: number
  weeklyAverageScore: number
  profileSnapshot?: AchievementProfileSnapshot
}) {
  if (!QUIZ_COMPLETION_MILESTONES.includes(params.completedQuizzes)) {
    return
  }

  const tierMeta = QUIZ_COMPLETION_TIER_META[params.completedQuizzes]

  await createAchievementIfMissing({
    userId: params.userId,
    achievementType: "quiz_completion",
    title: tierMeta?.title ?? `${params.completedQuizzes} Quizzes Completed`,
    description:
      tierMeta?.description ??
      `Completed ${params.completedQuizzes} quiz attempt${
        params.completedQuizzes > 1 ? "s" : ""
      } in total.`,
    metricValue: params.completedQuizzes,
    dayStreak: params.dayStreak,
    weeklyAverageScore: params.weeklyAverageScore,
    profileSnapshot: params.profileSnapshot,
  })
}

async function awardMaterialCompletionMilestoneIfEligible(params: {
  userId: string
  completedMaterials: number
  dayStreak: number
  weeklyAverageScore: number
  profileSnapshot?: AchievementProfileSnapshot
}) {
  if (!MATERIAL_COMPLETION_MILESTONES.includes(params.completedMaterials)) {
    return
  }

  const tierMeta = MATERIAL_COMPLETION_TIER_META[params.completedMaterials]

  await createAchievementIfMissing({
    userId: params.userId,
    achievementType: "completion",
    title:
      tierMeta?.title ?? `${params.completedMaterials} Materials Completed`,
    description:
      tierMeta?.description ??
      `Finished ${params.completedMaterials} learning material${
        params.completedMaterials > 1 ? "s" : ""
      }.`,
    metricValue: params.completedMaterials,
    dayStreak: params.dayStreak,
    weeklyAverageScore: params.weeklyAverageScore,
    profileSnapshot: params.profileSnapshot,
  })
}

export async function getLatestResumableAttempt(
  userId: string,
  examId: string
): Promise<ExamAttempt | null> {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_ATTEMPTS,
    queries: [
      Query.equal("userId", userId),
      Query.equal("examId", examId),
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
  userId: string,
  examIds: string[]
): Promise<Record<string, ResumableAttemptSummary>> {
  const uniqueExamIds = uniqueStrings(examIds)

  if (uniqueExamIds.length === 0) {
    return {}
  }

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_ATTEMPTS,
    queries: [
      Query.equal("userId", userId),
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

export async function listAttemptAnswers(attemptId: string) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_ANSWERS,
    queries: [
      Query.equal("attemptId", attemptId),
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

export async function listRecentLearningHistory(
  userId: string,
  options: LearningHistoryListOptions = {}
): Promise<LearningHistoryListResult> {
  const historyLimit = Math.floor(clampNumber(options.limit ?? 10, 1, 100))
  const subjectId = options.subjectId?.trim()
  const queries = [Query.equal("userId", userId)]

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
  const materialTitleMap = await fetchLearningMaterialTitleMap(
    uniqueStrings(displayHistoryRows.map((row) => row.learningMaterialId))
  )

  return {
    items: mapLearningHistoryRowsToActivityItems(
      displayHistoryRows,
      materialTitleMap
    ),
    hasMore,
  }
}

export async function getLearningMaterialStatus(
  userId: string,
  learningMaterialId: string
): Promise<LearningMaterialStatusSnapshot | null> {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_HISTORY,
    queries: [
      Query.equal("userId", userId),
      Query.equal("learningMaterialId", learningMaterialId),
      Query.orderDesc("$updatedAt"),
      Query.limit(1),
    ],
  })

  const [latestRow] = rows as unknown as LearningHistoryDocument[]

  if (!latestRow) {
    return null
  }

  return {
    learningMaterialId: latestRow.learningMaterialId,
    status: latestRow.status,
    progressPercent: latestRow.progressPercent,
    lastAccessedAt: latestRow.lastAccessedAt,
    completedAt: latestRow.completedAt ?? null,
  }
}

export async function listLearningMaterialStatusesByTopic(
  userId: string,
  topicId: string
): Promise<Record<string, LearningMaterialStatusSnapshot>> {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_HISTORY,
    queries: [
      Query.equal("userId", userId),
      Query.equal("topicId", topicId),
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

export async function getUserActivityFeed(
  userId: string,
  options: ActivityFeedOptions = {}
): Promise<UserActivityFeed> {
  const quizAttemptsLimit = Math.floor(
    clampNumber(options.quizAttemptsLimit ?? 8, 1, 100)
  )
  const learningHistoryLimit = Math.floor(
    clampNumber(options.learningHistoryLimit ?? 8, 1, 100)
  )
  const achievementsLimit = Math.floor(
    clampNumber(options.achievementsLimit ?? 8, 1, 100)
  )

  const [
    progressRowsResult,
    attemptsResult,
    historyResult,
    achievementsResult,
  ] = await Promise.all([
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

  const progressRows =
    progressRowsResult.rows as unknown as UserProgressDocument[]
  const attempts = attemptsResult.rows as unknown as ExamAttempt[]
  const historyRows = historyResult.rows as unknown as LearningHistoryDocument[]
  const achievements =
    achievementsResult.rows as unknown as LearningAchievementDocument[]
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

  const doneAttempts = displayAttempts.filter(
    (attempt) => attempt.status === "done"
  )
  const averageQuizScore =
    doneAttempts.length === 0
      ? 0
      : Math.round(
          doneAttempts.reduce((sum, attempt) => {
            if (attempt.totalItems <= 0) {
              return sum
            }

            return sum + (attempt.score / attempt.totalItems) * 100
          }, 0) / doneAttempts.length
        )

  const [completedMaterials, completedQuizzes, examTitleMap, materialTitleMap] =
    await Promise.all([
      countCompletedMaterials(userId),
      countCompletedQuizzes(userId),
      fetchExamTitleMap(
        uniqueStrings(displayAttempts.map((attempt) => attempt.examId))
      ),
      fetchLearningMaterialTitleMap(
        uniqueStrings(displayHistory.map((row) => row.learningMaterialId))
      ),
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
      examTitle:
        examTitleMap.get(attempt.examId) ??
        fallbackEntityLabel("Exam", attempt.examId),
      score: attempt.score,
      totalItems: attempt.totalItems,
      percent:
        attempt.totalItems > 0
          ? Math.round((attempt.score / attempt.totalItems) * 100)
          : 0,
      timeTaken: attempt.timeTaken,
      status: attempt.status,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      currentQuestionIndex: attempt.currentQuestionIndex,
    })),
    learningHistory: mapLearningHistoryRowsToActivityItems(
      displayHistory,
      materialTitleMap
    ),
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

// ─── Progress helpers ─────────────────────────────────────────────────────────

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

  if (!isUserAnswersSyncDisabled) {
    try {
      await tablesDB.createRow({
        databaseId: DB_ID,
        tableId: COLLECTIONS.USER_ANSWERS,
        rowId: answerRowId,
        data: answerData,
        permissions: payload.userId
          ? getUserOwnedPermissions(payload.userId)
          : undefined,
      })
    } catch (createError) {
      try {
        await tablesDB.updateRow({
          databaseId: DB_ID,
          tableId: COLLECTIONS.USER_ANSWERS,
          rowId: answerRowId,
          data: answerData,
        })
      } catch (updateError) {
        if (
          isAppwriteUnauthorizedError(createError) ||
          isAppwriteUnauthorizedError(updateError)
        ) {
          isUserAnswersSyncDisabled = true
          warnUserAnswersUnauthorizedOnce()
        }
      }
    }
  }

  if (!isAttemptProgressSyncDisabled) {
    try {
      await tablesDB.updateRow({
        databaseId: DB_ID,
        tableId: COLLECTIONS.EXAM_ATTEMPTS,
        rowId: payload.attemptId,
        data: {
          currentQuestionIndex: payload.currentQuestionIndex,
          lastAnsweredAt: now,
        },
      })
    } catch (error) {
      if (isAppwriteUnauthorizedError(error)) {
        isAttemptProgressSyncDisabled = true
        warnAttemptSyncUnauthorizedOnce()
      }
    }
  }
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

  await upsertUserProgress({
    userId: payload.userId,
    subjectId: payload.subjectId ?? payload.examId,
    topicId: payload.topicId ?? payload.examId,
    averageScore,
    nowIso: now,
  })

  const globalProgress = await touchGlobalActivity({
    userId: payload.userId,
    nowIso: now,
    profileSnapshot: payload.profileSnapshot,
  })

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
      description:
        "Maintained a weekly average score of 80% or better across activity.",
      metricValue: globalProgress.weeklyAverageScore,
      dayStreak: globalProgress.dayStreak,
      weeklyAverageScore: globalProgress.weeklyAverageScore,
      profileSnapshot: payload.profileSnapshot,
    })
  }

  await awardQuizScoreMilestones({
    userId: payload.userId,
    quizPercent: averageScore,
    examId: payload.examId,
    dayStreak: globalProgress.dayStreak,
    weeklyAverageScore: globalProgress.weeklyAverageScore,
    profileSnapshot: payload.profileSnapshot,
  })

  const completedQuizzes = await countCompletedQuizzes(payload.userId)
  await awardQuizCompletionMilestoneIfEligible({
    userId: payload.userId,
    completedQuizzes,
    dayStreak: globalProgress.dayStreak,
    weeklyAverageScore: globalProgress.weeklyAverageScore,
    profileSnapshot: payload.profileSnapshot,
  })
}

export async function trackLearningMaterialOpened(
  payload: LearningActivityPayload
): Promise<void> {
  const { nowIso } = await upsertLearningHistory({
    userId: payload.userId,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    learningMaterialId: payload.learningMaterialId,
    status: "in_progress",
    progressPercent: 5,
    lastPosition: 0,
  })

  await upsertUserProgress({
    userId: payload.userId,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    nowIso,
  })

  await touchGlobalActivity({
    userId: payload.userId,
    nowIso,
    profileSnapshot: payload.profileSnapshot,
  })
}

export async function trackLearningMaterialResourceOpened(
  payload: LearningActivityPayload
): Promise<void> {
  const { nowIso } = await upsertLearningHistory({
    userId: payload.userId,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    learningMaterialId: payload.learningMaterialId,
    status: "in_progress",
    progressPercent: 35,
    lastPosition: 1,
  })

  await upsertUserProgress({
    userId: payload.userId,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    nowIso,
  })

  await touchGlobalActivity({
    userId: payload.userId,
    nowIso,
    profileSnapshot: payload.profileSnapshot,
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

  const { nowIso } = await upsertLearningHistory({
    userId: payload.userId,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    learningMaterialId: payload.learningMaterialId,
    status: "in_progress",
    progressPercent: progressFromTime,
    lastPosition: payload.lastPosition ?? 0,
  })

  await upsertUserProgress({
    userId: payload.userId,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    nowIso,
  })

  await touchGlobalActivity({
    userId: payload.userId,
    nowIso,
    profileSnapshot: payload.profileSnapshot,
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

  const subjectProgress = await upsertUserProgress({
    userId: payload.userId,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    nowIso,
    completedMaterialsDelta: wasPreviouslyCompleted ? 0 : 1,
  })

  const globalProgress = await touchGlobalActivity({
    userId: payload.userId,
    nowIso,
    profileSnapshot: payload.profileSnapshot,
  })

  await createAchievementIfMissing({
    userId: payload.userId,
    achievementType: "completion",
    title: `Material Completed: ${payload.learningMaterialId}`,
    description: "Finished a learning material in the reviewer library.",
    metricValue: subjectProgress.completedMaterials,
    dayStreak: globalProgress.dayStreak,
    weeklyAverageScore: globalProgress.weeklyAverageScore,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    learningMaterialId: payload.learningMaterialId,
    profileSnapshot: payload.profileSnapshot,
  })

  const completedMaterials = await countCompletedMaterials(payload.userId)
  await awardMaterialCompletionMilestoneIfEligible({
    userId: payload.userId,
    completedMaterials,
    dayStreak: globalProgress.dayStreak,
    weeklyAverageScore: globalProgress.weeklyAverageScore,
    profileSnapshot: payload.profileSnapshot,
  })
}

/**
 * Fetches all exam attempts for a given user.
 */
export async function getUserAttempts(userId: string): Promise<ExamAttempt[]> {
  try {
    const { rows } = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: COLLECTIONS.EXAM_ATTEMPTS,
      queries: [
        Query.equal("userId", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ],
    })
    return rows as unknown as ExamAttempt[]
  } catch {
    return []
  }
}

/**
 * Aggregates attempts into per-exam progress summaries.
 */
export function aggregateProgress(
  attempts: ExamAttempt[]
): UserProgressSummary[] {
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
