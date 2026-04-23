import { COLLECTIONS, DB_ID, Query, tablesDB } from "./appwrite"
import type {
  ExamAttemptDocument,
  SubjectDocument,
  UserAnswerDocument,
  UserProgressDocument,
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
const ATTEMPT_ID_QUERY_CHUNK_SIZE = 50
const GLOBAL_PROGRESS_SUBJECT_ID = "__global__"

type SubjectProgressTotals = {
  totalCorrect: number
  totalAnswered: number
}

type TimelineBucket = {
  date: Date
  key: string
  label: string
}

type TimelineBucketConfig = {
  buckets: TimelineBucket[]
  rangeLabel: string
  startDate: Date
  endDate: Date
}

// Hoist Intl formatters to module scope — constructing Intl objects is expensive
// on Hermes because it allocates locale data each time.
const DATE_FMT_SHORT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})
const DATE_FMT_SHORT_NO_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})
const WEEKDAY_FMT = new Intl.DateTimeFormat("en-US", { weekday: "short" })
const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "short" })
const MONTH_YEAR_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
})

function toDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDateShort(date: Date) {
  return DATE_FMT_SHORT.format(date)
}

function formatDateShortNoYear(date: Date) {
  return DATE_FMT_SHORT_NO_YEAR.format(date)
}

function getWeekdayShort(date: Date) {
  return WEEKDAY_FMT.format(date)[0]
}

function getMonthShort(date: Date) {
  return MONTH_FMT.format(date)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

function calculatePercent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

function incrementCount(
  counts: Map<string, number>,
  key: string,
  value: number
) {
  counts.set(key, (counts.get(key) ?? 0) + value)
}

async function listDoneAttempts(
  userId: string
): Promise<ExamAttemptDocument[]> {
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

  return rows as unknown as ExamAttemptDocument[]
}

async function listSubjects(): Promise<SubjectDocument[]> {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.SUBJECTS,
    queries: [Query.orderAsc("order"), Query.limit(QUERY_LIMIT)],
  })

  return rows as unknown as SubjectDocument[]
}

async function listTotalQuestions(): Promise<number> {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.QUESTIONS,
    queries: [Query.limit(QUERY_LIMIT)],
  })

  return rows.length
}

async function listUserProgressRows(
  userId: string
): Promise<UserProgressDocument[]> {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_PROGRESS,
    queries: [
      Query.equal("userId", userId),
      Query.orderDesc("$updatedAt"),
      Query.limit(QUERY_LIMIT),
    ],
  })

  return rows as unknown as UserProgressDocument[]
}

async function listAnswersByAttemptIds(
  attemptIds: string[]
): Promise<UserAnswerDocument[]> {
  if (attemptIds.length === 0) {
    return []
  }

  const attemptIdChunks = chunkValues(attemptIds, ATTEMPT_ID_QUERY_CHUNK_SIZE)
  const answerResults = await Promise.all(
    attemptIdChunks.map((chunk) =>
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.USER_ANSWERS,
        queries: [Query.equal("attemptId", chunk), Query.limit(QUERY_LIMIT)],
      })
    )
  )

  return answerResults.flatMap(
    (result) => result.rows as unknown as UserAnswerDocument[]
  )
}

function filterAnswersByAttemptIds(
  allAnswers: UserAnswerDocument[],
  attemptIds: Set<string>
) {
  return allAnswers.filter((answer) => attemptIds.has(answer.attemptId))
}

function computeBestStreak(userAnswers: UserAnswerDocument[]) {
  const answersByAttempt = new Map<string, UserAnswerDocument[]>()

  for (const answer of userAnswers) {
    const existing = answersByAttempt.get(answer.attemptId) ?? []
    existing.push(answer)
    answersByAttempt.set(answer.attemptId, existing)
  }

  let bestStreak = 0

  for (const attemptAnswers of answersByAttempt.values()) {
    let streak = 0

    for (const answer of attemptAnswers) {
      if (!answer.isCorrect) {
        streak = 0
        continue
      }

      streak += 1
      bestStreak = Math.max(bestStreak, streak)
    }
  }

  return bestStreak
}

function summarizeAnswers(userAnswers: UserAnswerDocument[]) {
  const uniqueQuestionIds = new Set(
    userAnswers.map((answer) => answer.questionId)
  )
  const correctAnswers = userAnswers.filter((answer) => answer.isCorrect).length
  const totalAnswered = userAnswers.length

  return {
    uniqueQuestionsAnswered: uniqueQuestionIds.size,
    correctAnswers,
    totalAnswered,
    correctPercent: calculatePercent(correctAnswers, totalAnswered),
    bestStreak: computeBestStreak(userAnswers),
  }
}

function computeAverageTimePerQuestion(attempts: ExamAttemptDocument[]) {
  const totalTime = attempts.reduce(
    (sum, attempt) => sum + attempt.timeTaken,
    0
  )
  const totalItems = attempts.reduce(
    (sum, attempt) => sum + attempt.totalItems,
    0
  )

  return totalItems > 0 ? Math.round(totalTime / totalItems) : 0
}

function buildExamProgressLookup(progressRows: UserProgressDocument[]) {
  const lookup = new Map<string, UserProgressDocument>()

  for (const progress of progressRows) {
    if (progress.subjectId === GLOBAL_PROGRESS_SUBJECT_ID) {
      continue
    }

    if (!lookup.has(progress.topicId)) {
      lookup.set(progress.topicId, progress)
    }

    if (!lookup.has(progress.subjectId)) {
      lookup.set(progress.subjectId, progress)
    }
  }

  return lookup
}

function resolveSubjectIdForAttempt(
  attempt: ExamAttemptDocument,
  subjectIdSet: Set<string>,
  examProgressLookup: Map<string, UserProgressDocument>
) {
  if (subjectIdSet.has(attempt.examId)) {
    return attempt.examId
  }

  const matchingProgress = examProgressLookup.get(attempt.examId)
  if (!matchingProgress) {
    return null
  }

  return subjectIdSet.has(matchingProgress.subjectId)
    ? matchingProgress.subjectId
    : null
}

function buildSubjectProgressMap(
  attempts: ExamAttemptDocument[],
  subjectIdSet: Set<string>,
  examProgressLookup: Map<string, UserProgressDocument>
) {
  const subjectProgressMap = new Map<string, SubjectProgressTotals>()

  for (const attempt of attempts) {
    const subjectId = resolveSubjectIdForAttempt(
      attempt,
      subjectIdSet,
      examProgressLookup
    )

    if (!subjectId) {
      continue
    }

    const totals = subjectProgressMap.get(subjectId) ?? {
      totalCorrect: 0,
      totalAnswered: 0,
    }
    totals.totalCorrect += attempt.score
    totals.totalAnswered += attempt.totalItems
    subjectProgressMap.set(subjectId, totals)
  }

  return subjectProgressMap
}

function markStrongestSubject(
  subjectBreakdown: SubjectPerformance[],
  strongestSubjectId: string | null
) {
  if (!strongestSubjectId) {
    return subjectBreakdown
  }

  const strongest = subjectBreakdown.find(
    (subject) => subject.subjectId === strongestSubjectId
  )

  if (strongest) {
    strongest.label = "STRONGEST"
  }

  return subjectBreakdown
}

function buildSubjectBreakdown(
  subjects: SubjectDocument[],
  subjectProgressMap: Map<string, SubjectProgressTotals>
) {
  let highestPercent = -1
  let strongestSubjectId: string | null = null

  const subjectBreakdown: SubjectPerformance[] = subjects.map((subject) => {
    const progress = subjectProgressMap.get(subject.$id)
    const totalCorrect = progress?.totalCorrect ?? 0
    const totalAnswered = progress?.totalAnswered ?? 0
    const correctPercent = calculatePercent(totalCorrect, totalAnswered)

    if (totalAnswered > 0 && correctPercent > highestPercent) {
      highestPercent = correctPercent
      strongestSubjectId = subject.$id
    }

    return {
      subjectId: subject.$id,
      subjectName: subject.name,
      correctPercent,
      totalAnswered,
      totalCorrect,
      label: null,
    }
  })

  return markStrongestSubject(subjectBreakdown, strongestSubjectId)
}

// ─── Overall Performance ──────────────────────────────────────────────────────

export async function getOverallPerformanceStats(
  userId: string
): Promise<OverallPerformanceStats> {
  const [attempts, subjects, totalQuestions, progressRows] = await Promise.all([
    listDoneAttempts(userId),
    listSubjects(),
    listTotalQuestions(),
    listUserProgressRows(userId),
  ])

  const attemptIds = attempts.map((attempt) => attempt.$id)
  const allAnswers = await listAnswersByAttemptIds(attemptIds)
  const userAnswers = filterAnswersByAttemptIds(allAnswers, new Set(attemptIds))
  const answerSummary = summarizeAnswers(userAnswers)

  const subjectIdSet = new Set(subjects.map((subject) => subject.$id))
  const examProgressLookup = buildExamProgressLookup(progressRows)
  const subjectProgressMap = buildSubjectProgressMap(
    attempts,
    subjectIdSet,
    examProgressLookup
  )

  return {
    ...answerSummary,
    totalQuestions,
    averageTimePerQuestion: computeAverageTimePerQuestion(attempts),
    subjectBreakdown: buildSubjectBreakdown(subjects, subjectProgressMap),
  }
}

// ─── Questions Answered Timeline ──────────────────────────────────────────────

function getWeekBuckets(offset: number): TimelineBucketConfig {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find Monday of current week
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + offset * 7)

  const buckets: TimelineBucket[] = []
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

function getMonthBuckets(offset: number): TimelineBucketConfig {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Group into ~4 weeks (7-day spans)
  const buckets: TimelineBucket[] = []
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
    rangeLabel: MONTH_YEAR_FMT.format(monthDate),
    startDate: new Date(year, month, 1),
    endDate: new Date(year, month + 1, 0),
  }
}

function getYearBuckets(offset: number): TimelineBucketConfig {
  const today = new Date()
  const year = today.getFullYear() + offset

  const buckets: TimelineBucket[] = []
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

function getTimelineBucketConfig(
  window: TimelineWindow,
  offset: number
): TimelineBucketConfig {
  if (window === "week") {
    return getWeekBuckets(offset)
  }

  if (window === "month") {
    return getMonthBuckets(offset)
  }

  return getYearBuckets(offset)
}

function toAttemptTimestamp(attempt: ExamAttemptDocument) {
  const refDate = attempt.finishedAt ?? attempt.startedAt
  const timestamp = new Date(refDate)
  return Number.isNaN(timestamp.getTime()) ? null : timestamp
}

function isWithinRange(timestamp: Date, bucketConfig: TimelineBucketConfig) {
  return (
    timestamp >= bucketConfig.startDate && timestamp <= bucketConfig.endDate
  )
}

function getTimelineBucketKey(
  window: TimelineWindow,
  timestamp: Date,
  bucketConfig: TimelineBucketConfig
) {
  if (window === "week") {
    return toDayKey(timestamp)
  }

  if (window === "month") {
    const dayOfMonth = timestamp.getDate()
    const weekIndex = clamp(Math.floor((dayOfMonth - 1) / 7), 0, 3)
    return bucketConfig.buckets[weekIndex]?.key ?? null
  }

  return `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}`
}

function aggregateTimelineCounts(
  attempts: ExamAttemptDocument[],
  window: TimelineWindow,
  bucketConfig: TimelineBucketConfig
) {
  const countByBucket = new Map<string, number>(
    bucketConfig.buckets.map((bucket) => [bucket.key, 0])
  )
  const countByDay = new Map<string, number>()

  for (const attempt of attempts) {
    const timestamp = toAttemptTimestamp(attempt)
    if (!timestamp || !isWithinRange(timestamp, bucketConfig)) {
      continue
    }

    const dayKey = toDayKey(timestamp)
    incrementCount(countByDay, dayKey, attempt.totalItems)

    const bucketKey = getTimelineBucketKey(window, timestamp, bucketConfig)
    if (!bucketKey) {
      continue
    }

    incrementCount(countByBucket, bucketKey, attempt.totalItems)
  }

  return { countByBucket, countByDay }
}

function buildTimelinePoints(
  bucketConfig: TimelineBucketConfig,
  countByBucket: Map<string, number>
) {
  return bucketConfig.buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: countByBucket.get(bucket.key) ?? 0,
    dateLabel: formatDateShortNoYear(bucket.date),
  }))
}

function getMostAnsweredDay(countByDay: Map<string, number>) {
  let mostAnsweredInOneDay = 0
  let mostAnsweredDate = ""

  for (const [dayKey, count] of countByDay) {
    if (count <= mostAnsweredInOneDay) {
      continue
    }

    mostAnsweredInOneDay = count
    mostAnsweredDate = formatDateShort(new Date(dayKey))
  }

  return {
    mostAnsweredInOneDay,
    mostAnsweredDate: mostAnsweredDate || "—",
  }
}

export async function getQuestionsAnsweredTimeline(
  userId: string,
  window: TimelineWindow,
  offset = 0
): Promise<QuestionsAnsweredTimeline> {
  const attempts = await listDoneAttempts(userId)
  const bucketConfig = getTimelineBucketConfig(window, offset)
  const { countByBucket, countByDay } = aggregateTimelineCounts(
    attempts,
    window,
    bucketConfig
  )
  const points = buildTimelinePoints(bucketConfig, countByBucket)
  const questionsThisPeriod = points.reduce(
    (sum, point) => sum + point.value,
    0
  )
  const { mostAnsweredInOneDay, mostAnsweredDate } =
    getMostAnsweredDay(countByDay)

  return {
    window,
    points,
    rangeLabel: bucketConfig.rangeLabel,
    questionsThisPeriod,
    mostAnsweredInOneDay,
    mostAnsweredDate,
    offset,
  }
}
