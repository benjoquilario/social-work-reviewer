import {
  COLLECTIONS,
  DB_ID,
  Query,
  tablesDB,
} from "./appwrite"
import type {
  ExamAttemptDocument,
  SubjectDocument,
  UserAnswerDocument,
} from "./schema"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubjectPerformance = {
  subjectId: string
  subjectName: string
  correctPercent: number
  totalAnswered: number
  totalCorrect: number
  label: "STRONGEST" | null
}

export type OverallPerformanceStats = {
  uniqueQuestionsAnswered: number
  totalQuestions: number
  correctAnswers: number
  totalAnswered: number
  correctPercent: number
  averageTimePerQuestion: number // seconds
  bestStreak: number
  subjectBreakdown: SubjectPerformance[]
}

export type TimelineWindow = "week" | "month" | "year"

export type TimelineBarPoint = {
  key: string
  label: string
  value: number
  dateLabel: string
}

export type QuestionsAnsweredTimeline = {
  window: TimelineWindow
  points: TimelineBarPoint[]
  rangeLabel: string
  questionsThisPeriod: number
  mostAnsweredInOneDay: number
  mostAnsweredDate: string
  /** Offset from "today" window (0 = current, -1 = previous, etc.) */
  offset: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUERY_LIMIT = 500

function toDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatDateShortNoYear(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function getWeekdayShort(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)[0]
}

function getMonthShort(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

// ─── Overall Performance ──────────────────────────────────────────────────────

export async function getOverallPerformanceStats(
  userId: string
): Promise<OverallPerformanceStats> {
  // Fetch all completed attempts + all user_answers + all subjects in parallel
  const [attemptsResult, answersResult, subjectsResult, questionsCountResult] =
    await Promise.all([
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.EXAM_ATTEMPTS,
        queries: [
          Query.equal("userId", userId),
          Query.equal("status", "done"),
          Query.orderDesc("$updatedAt"),
          Query.limit(QUERY_LIMIT),
        ],
      }),
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.USER_ANSWERS,
        queries: [Query.limit(QUERY_LIMIT)],
      }),
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.SUBJECTS,
        queries: [Query.orderAsc("order"), Query.limit(QUERY_LIMIT)],
      }),
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.QUESTIONS,
        queries: [Query.limit(QUERY_LIMIT)],
      }),
    ])

  const attempts =
    attemptsResult.rows as unknown as ExamAttemptDocument[]
  const allAnswers =
    answersResult.rows as unknown as UserAnswerDocument[]
  const subjects = subjectsResult.rows as unknown as SubjectDocument[]
  const totalQuestions = questionsCountResult.rows.length

  // Build a set of attempt IDs belonging to this user's done attempts
  const userAttemptIds = new Set(attempts.map((a) => a.$id))

  // Filter answers to only this user's attempts
  const userAnswers = allAnswers.filter((a) => userAttemptIds.has(a.attemptId))

  // Unique questions answered
  const uniqueQuestionIds = new Set(userAnswers.map((a) => a.questionId))
  const uniqueQuestionsAnswered = uniqueQuestionIds.size

  // Correct answers
  const correctAnswers = userAnswers.filter((a) => a.isCorrect).length
  const totalAnswered = userAnswers.length
  const correctPercent =
    totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0

  // Average time per question
  const totalTime = attempts.reduce((sum, a) => sum + a.timeTaken, 0)
  const totalItems = attempts.reduce((sum, a) => sum + a.totalItems, 0)
  const averageTimePerQuestion =
    totalItems > 0 ? Math.round(totalTime / totalItems) : 0

  // Best streak (most correct in a row) — compute from the user answers
  // We'll compute from per-attempt sequential correctness
  let bestStreak = 0

  // Group answers by attempt
  const answersByAttempt = new Map<string, UserAnswerDocument[]>()
  for (const answer of userAnswers) {
    const existing = answersByAttempt.get(answer.attemptId) ?? []
    existing.push(answer)
    answersByAttempt.set(answer.attemptId, existing)
  }

  for (const [, attemptAnswers] of answersByAttempt) {
    let streak = 0
    for (const answer of attemptAnswers) {
      if (answer.isCorrect) {
        streak += 1
        bestStreak = Math.max(bestStreak, streak)
      } else {
        streak = 0
      }
    }
  }

  // Per-subject breakdown
  // Map examId -> subjectId via exams collection (we can use the exam data)
  const examSubjectMap = new Map<string, string>()
  // We need to look up which subject each exam belongs to
  // Since exam_attempts doesn't store subjectId, we need to either:
  // 1) Look up the exams table, or
  // 2) Use the user_progress table which stores subjectId
  // Let's use user_progress since it's already populated by completeQuizAttempt
  const progressResult = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_PROGRESS,
    queries: [
      Query.equal("userId", userId),
      Query.orderDesc("$updatedAt"),
      Query.limit(QUERY_LIMIT),
    ],
  })

  const progressRows =
    progressResult.rows as unknown as Array<{
      $id: string
      subjectId: string
      topicId: string
      averageScore: number
    }>

  // Build subject breakdown from user_progress rows
  // Filter out the global progress sentinel
  const subjectProgressMap = new Map<
    string,
    { totalCorrect: number; totalAnswered: number }
  >()

  // Also try to resolve via exam attempts -> examId mapping
  // For each attempt, the examId may be a subjectId directly (when launching from a subject category)
  const subjectIdSet = new Set(subjects.map((s) => s.$id))

  for (const attempt of attempts) {
    // The examId might be the subjectId itself (category quiz) or an actual exam ID
    let resolvedSubjectId: string | null = null

    if (subjectIdSet.has(attempt.examId)) {
      resolvedSubjectId = attempt.examId
    } else {
      // Check if we have a matching progress row with this examId as topicId
      const matchingProgress = progressRows.find(
        (p) =>
          (p.topicId === attempt.examId || p.subjectId === attempt.examId) &&
          p.subjectId !== "__global__"
      )
      if (matchingProgress && subjectIdSet.has(matchingProgress.subjectId)) {
        resolvedSubjectId = matchingProgress.subjectId
      }
    }

    if (resolvedSubjectId) {
      const existing = subjectProgressMap.get(resolvedSubjectId) ?? {
        totalCorrect: 0,
        totalAnswered: 0,
      }
      existing.totalCorrect += attempt.score
      existing.totalAnswered += attempt.totalItems
      subjectProgressMap.set(resolvedSubjectId, existing)
    }
  }

  // Build subject breakdown, including subjects with 0 progress
  let highestPercent = -1
  let strongestSubjectId: string | null = null

  const subjectBreakdown: SubjectPerformance[] = subjects.map((subject) => {
    const progress = subjectProgressMap.get(subject.$id)
    const cp =
      progress && progress.totalAnswered > 0
        ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
        : 0

    if (cp > highestPercent && progress && progress.totalAnswered > 0) {
      highestPercent = cp
      strongestSubjectId = subject.$id
    }

    return {
      subjectId: subject.$id,
      subjectName: subject.name,
      correctPercent: cp,
      totalAnswered: progress?.totalAnswered ?? 0,
      totalCorrect: progress?.totalCorrect ?? 0,
      label: null,
    }
  })

  // Mark strongest
  if (strongestSubjectId) {
    const item = subjectBreakdown.find(
      (s) => s.subjectId === strongestSubjectId
    )
    if (item) {
      item.label = "STRONGEST"
    }
  }

  return {
    uniqueQuestionsAnswered,
    totalQuestions,
    correctAnswers,
    totalAnswered,
    correctPercent,
    averageTimePerQuestion,
    bestStreak,
    subjectBreakdown,
  }
}

// ─── Questions Answered Timeline ──────────────────────────────────────────────

function getWeekBuckets(offset: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find Monday of current week
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + offset * 7)

  const buckets: { date: Date; key: string; label: string }[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    buckets.push({
      date,
      key: toDayKey(date),
      label: getWeekdayShort(date),
    })
  }

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    buckets,
    rangeLabel: `${formatDateShort(monday)} - ${formatDateShort(sunday)}`,
    startDate: monday,
    endDate: sunday,
  }
}

function getMonthBuckets(offset: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Group into ~4 weeks (7-day spans)
  const buckets: { date: Date; key: string; label: string }[] = []
  for (let week = 0; week < 4; week++) {
    const startDay = week * 7 + 1
    const endDay = Math.min(startDay + 6, daysInMonth)
    const date = new Date(year, month, startDay)
    buckets.push({
      date,
      key: `${year}-${String(month + 1).padStart(2, "0")}-w${week}`,
      label: `${startDay}-${endDay}`,
    })
  }

  return {
    buckets,
    rangeLabel: new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(monthDate),
    startDate: new Date(year, month, 1),
    endDate: new Date(year, month + 1, 0),
  }
}

function getYearBuckets(offset: number) {
  const today = new Date()
  const year = today.getFullYear() + offset

  const buckets: { date: Date; key: string; label: string }[] = []
  for (let month = 0; month < 12; month++) {
    const date = new Date(year, month, 1)
    buckets.push({
      date,
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: getMonthShort(date),
    })
  }

  return {
    buckets,
    rangeLabel: String(year),
    startDate: new Date(year, 0, 1),
    endDate: new Date(year, 11, 31),
  }
}

export async function getQuestionsAnsweredTimeline(
  userId: string,
  window: TimelineWindow,
  offset = 0
): Promise<QuestionsAnsweredTimeline> {
  // Fetch all done attempts
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_ATTEMPTS,
    queries: [
      Query.equal("userId", userId),
      Query.equal("status", "done"),
      Query.orderDesc("$updatedAt"),
      Query.limit(QUERY_LIMIT),
    ],
  })

  const attempts = rows as unknown as ExamAttemptDocument[]

  let bucketConfig: ReturnType<typeof getWeekBuckets>

  if (window === "week") {
    bucketConfig = getWeekBuckets(offset)
  } else if (window === "month") {
    bucketConfig = getMonthBuckets(offset)
  } else {
    bucketConfig = getYearBuckets(offset)
  }

  // For weekly view, count totalItems per day
  // For monthly view, count totalItems per week bucket
  // For yearly view, count totalItems per month
  const countByBucket = new Map<string, number>(
    bucketConfig.buckets.map((b) => [b.key, 0])
  )

  // Also track per-day counts (for "most answered in one day")
  const countByDay = new Map<string, number>()

  for (const attempt of attempts) {
    const refDate = attempt.finishedAt ?? attempt.startedAt
    const timestamp = new Date(refDate)

    if (Number.isNaN(timestamp.getTime())) continue
    if (
      timestamp < bucketConfig.startDate ||
      timestamp > bucketConfig.endDate
    ) {
      // Still track for "most answered" if within range
      continue
    }

    const dayKey = toDayKey(timestamp)
    countByDay.set(dayKey, (countByDay.get(dayKey) ?? 0) + attempt.totalItems)

    if (window === "week") {
      countByBucket.set(dayKey, (countByBucket.get(dayKey) ?? 0) + attempt.totalItems)
    } else if (window === "month") {
      // Find which week bucket this day falls into
      const dayOfMonth = timestamp.getDate()
      const weekIndex = clamp(Math.floor((dayOfMonth - 1) / 7), 0, 3)
      const bucketKey = bucketConfig.buckets[weekIndex]?.key
      if (bucketKey) {
        countByBucket.set(
          bucketKey,
          (countByBucket.get(bucketKey) ?? 0) + attempt.totalItems
        )
      }
    } else {
      // Year — group by month
      const monthKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}`
      countByBucket.set(
        monthKey,
        (countByBucket.get(monthKey) ?? 0) + attempt.totalItems
      )
    }
  }

  // Points for the chart
  const points: TimelineBarPoint[] = bucketConfig.buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: countByBucket.get(bucket.key) ?? 0,
    dateLabel: formatDateShortNoYear(bucket.date),
  }))

  // Summary stats
  const questionsThisPeriod = points.reduce((sum, p) => sum + p.value, 0)
  let mostAnsweredInOneDay = 0
  let mostAnsweredDate = ""

  for (const [dayKey, count] of countByDay) {
    if (count > mostAnsweredInOneDay) {
      mostAnsweredInOneDay = count
      mostAnsweredDate = formatDateShort(new Date(dayKey))
    }
  }

  return {
    window,
    points,
    rangeLabel: bucketConfig.rangeLabel,
    questionsThisPeriod,
    mostAnsweredInOneDay,
    mostAnsweredDate: mostAnsweredDate || "—",
    offset,
  }
}
