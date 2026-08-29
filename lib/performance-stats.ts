import { COLLECTIONS, DB_ID, Query, tablesDB } from "./appwrite"
import { countRows, listAll } from "./db"
import type {
  LearningAchievementDocument,
  SubjectDocument,
  UserAnswerDocument,
  UserDailyActivityDocument,
  UserProgressDocument,
  UserWeeklyReportDocument,
} from "./schema"
import {
  GLOBAL_PROGRESS_SUBJECT_ID,
  GLOBAL_PROGRESS_TOPIC_ID,
} from "./progress/constants"

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
  averageTimePerQuestion: number
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
  offset: number
}

export type DashboardSnapshot = {
  label: string
  answeredCount: number
  correctCount: number
  incorrectCount: number
  accuracyRate: number
  studyMinutes: number
  completedMaterials: number
  earnedAchievementsCount: number
  activeDaysCount: number
  averageScore: number
}

export type DashboardReportMetrics = {
  today: DashboardSnapshot
  week: DashboardSnapshot
  month: DashboardSnapshot
  year: DashboardSnapshot
  lifetime: {
    totalStudyMinutes: number
    activeDaysCount: number
    achievementsCount: number
    weeklyAverageScore: number
    dayStreak: number
    accuracyRate: number
    answeredCount: number
    correctCount: number
    incorrectCount: number
    completedMaterials: number
  }
}

export type DashboardTrendSnapshot = {
  label: string
  currentLabel: string
  previousLabel: string
  currentAnsweredCount: number
  previousAnsweredCount: number
  answeredDelta: number
  accuracyDelta: number
  studyMinutesDelta: number
  achievementsDelta: number
  activeDaysDelta: number
  trend: "up" | "down" | "flat"
}

export type AchievementHighlight = {
  id: string
  title: string
  description: string | null
  earnedAt: string
  achievementType: LearningAchievementDocument["achievementType"]
  badgeKey: string | null
}

export type DashboardInsights = {
  weekOverWeek: DashboardTrendSnapshot
  monthOverMonth: DashboardTrendSnapshot
  consistency: {
    currentWeekActiveDays: number
    targetActiveDays: number
    remainingDaysToGoal: number
    currentStreak: number
    weeklyAverageScore: number
  }
  strongestSubject: SubjectPerformance | null
  weakestSubject: SubjectPerformance | null
  focusSubjects: SubjectPerformance[]
  recentAchievements: AchievementHighlight[]
}

const QUERY_LIMIT = 500
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

type SubjectTotals = {
  totalAnswered: number
  totalCorrect: number
}

function toIsoDateKey(date: Date) {
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

async function listSubjects() {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.SUBJECTS,
    queries: [Query.orderAsc("order"), Query.limit(QUERY_LIMIT)],
  })

  return rows as unknown as SubjectDocument[]
}

/**
 * Exam categories, for naming the breakdown.
 *
 * "Subject performance" is measured over `user_answers.categoryId`, and a
 * category is a row in `exam_categories` — a different table from
 * `subjects`, with no join between them (section 1). Both name maps are built
 * so a breakdown row can be labelled whichever side it came from.
 */
async function listAnsweredCategories() {
  return listAll(
    "exam_categories",
    [Query.equal("isPublished", true), Query.orderAsc("order")],
    { label: "exam categories" }
  )
}

async function listUserAnswers(userId: string) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_ANSWERS,
    queries: [
      Query.equal("userId", userId),
      Query.orderAsc("answeredAt"),
      Query.limit(QUERY_LIMIT),
    ],
  })

  return rows as unknown as UserAnswerDocument[]
}

async function listUserDailyActivity(userId: string) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_DAILY_ACTIVITY,
    queries: [
      Query.equal("userId", userId),
      Query.orderAsc("activityDate"),
      Query.limit(QUERY_LIMIT),
    ],
  })

  return rows as unknown as UserDailyActivityDocument[]
}

async function listUserWeeklyReports(userId: string) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_WEEKLY_REPORTS,
    queries: [
      Query.equal("userId", userId),
      Query.orderAsc("weekStartDate"),
      Query.limit(QUERY_LIMIT),
    ],
  })

  return rows as unknown as UserWeeklyReportDocument[]
}

async function listRecentAchievements(userId: string, limit = 4) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_ACHIEVEMENTS,
    queries: [
      Query.equal("userId", userId),
      Query.orderDesc("earnedAt"),
      Query.limit(Math.max(limit, 1)),
    ],
  })

  return rows as unknown as LearningAchievementDocument[]
}

async function listUserProgressRows(userId: string) {
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

/**
 * Every published item in the bank.
 *
 * Counted from the database rather than summed from the category rollups:
 * `questionCount` is denormalised and only accurate as of the last CMS write,
 * which is fine on a card and wrong as a denominator (gotcha 9).
 */
function getQuestionBankTotal() {
  return countRows("questions", [])
}

function computeBestStreak(answerRows: UserAnswerDocument[]) {
  const answersBySession = new Map<string, UserAnswerDocument[]>()

  for (const row of answerRows) {
    const current = answersBySession.get(row.sessionId ?? row.$id) ?? []
    current.push(row)
    answersBySession.set(row.sessionId ?? row.$id, current)
  }

  let bestStreak = 0

  for (const rows of answersBySession.values()) {
    const sortedRows = [...rows].sort((left, right) =>
      (left.answeredAt ?? left.$createdAt).localeCompare(
        right.answeredAt ?? right.$createdAt
      )
    )
    let streak = 0

    for (const row of sortedRows) {
      if (!row.isCorrect) {
        streak = 0
        continue
      }

      streak += 1
      bestStreak = Math.max(bestStreak, streak)
    }
  }

  return bestStreak
}

function buildSubjectNameMap(
  subjects: SubjectDocument[],
  categories: { $id: string; title: string }[] = []
) {
  const map = new Map<string, string>()

  for (const subject of subjects) {
    map.set(subject.$id, subject.name)
  }

  for (const category of categories) {
    map.set(category.$id, category.title)
  }

  return map
}

function buildSubjectBreakdown(
  subjectNameMap: Map<string, string>,
  answerRows: UserAnswerDocument[]
) {
  const totals = new Map<string, SubjectTotals>()
  let strongestSubjectId: string | null = null
  let highestPercent = -1

  for (const row of answerRows) {
    // The exam side keys on `categoryId`; `user_answers` has no `subjectId`.
    const subjectId = row.categoryId?.trim()
    if (!subjectId) {
      continue
    }

    const current = totals.get(subjectId) ?? {
      totalAnswered: 0,
      totalCorrect: 0,
    }
    current.totalAnswered += 1
    current.totalCorrect += row.isCorrect ? 1 : 0
    totals.set(subjectId, current)
  }

  const breakdown = Array.from(totals.entries()).map(([subjectId, total]) => {
    const correctPercent = calculatePercent(
      total.totalCorrect,
      total.totalAnswered
    )

    if (total.totalAnswered > 0 && correctPercent > highestPercent) {
      highestPercent = correctPercent
      strongestSubjectId = subjectId
    }

    return {
      subjectId,
      subjectName:
        subjectNameMap.get(subjectId) ?? `Subject ${subjectId.slice(0, 8)}`,
      correctPercent,
      totalAnswered: total.totalAnswered,
      totalCorrect: total.totalCorrect,
      label: null as "STRONGEST" | null,
    }
  })

  for (const subject of breakdown) {
    if (subject.subjectId === strongestSubjectId) {
      subject.label = "STRONGEST"
    }
  }

  return breakdown.sort((left, right) => right.correctPercent - left.correctPercent)
}

function getWeekBuckets(offset: number): TimelineBucketConfig {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + offset * 7)

  const buckets: TimelineBucket[] = []
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    buckets.push({
      date,
      key: toIsoDateKey(date),
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
  const buckets: TimelineBucket[] = []

  for (let week = 0; week < 5; week += 1) {
    const startDay = week * 7 + 1
    if (startDay > daysInMonth) {
      break
    }
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

  for (let month = 0; month < 12; month += 1) {
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

function getTimelineBucketConfig(window: TimelineWindow, offset: number) {
  if (window === "week") {
    return getWeekBuckets(offset)
  }

  if (window === "month") {
    return getMonthBuckets(offset)
  }

  return getYearBuckets(offset)
}

function isWithinRange(dateKey: string, bucketConfig: TimelineBucketConfig) {
  const date = new Date(`${dateKey}T00:00:00`)
  return date >= bucketConfig.startDate && date <= bucketConfig.endDate
}

function getTimelineBucketKey(
  window: TimelineWindow,
  activityDate: string,
  bucketConfig: TimelineBucketConfig
) {
  const date = new Date(`${activityDate}T00:00:00`)

  if (window === "week") {
    return activityDate
  }

  if (window === "month") {
    const dayOfMonth = date.getDate()
    const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), 4)
    return bucketConfig.buckets[weekIndex]?.key ?? null
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function buildDashboardSnapshot(
  label: string,
  rows: UserDailyActivityDocument[]
): DashboardSnapshot {
  const answeredCount = rows.reduce((total, row) => total + row.answeredCount, 0)
  const correctCount = rows.reduce((total, row) => total + row.correctCount, 0)
  const incorrectCount = rows.reduce(
    (total, row) => total + row.incorrectCount,
    0
  )
  const studyMinutes = rows.reduce((total, row) => total + row.studyMinutes, 0)
  const completedMaterials = rows.reduce(
    (total, row) => total + row.completedMaterials,
    0
  )
  const earnedAchievementsCount = rows.reduce(
    (total, row) => total + row.earnedAchievementsCount,
    0
  )
  const accuracyRate =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 10000) / 100 : 0

  return {
    label,
    answeredCount,
    correctCount,
    incorrectCount,
    accuracyRate,
    studyMinutes,
    completedMaterials,
    earnedAchievementsCount,
    activeDaysCount: rows.filter(
      (row) =>
        row.answeredCount > 0 || row.studyMinutes > 0 || row.completedMaterials > 0
    ).length,
    averageScore: accuracyRate,
  }
}

function filterRowsByMonth(
  rows: UserDailyActivityDocument[],
  year: number,
  monthIndex: number
) {
  return rows.filter((row) => {
    const date = new Date(`${row.activityDate}T00:00:00`)
    return date.getFullYear() === year && date.getMonth() === monthIndex
  })
}

function filterRowsByYear(rows: UserDailyActivityDocument[], year: number) {
  return rows.filter((row) => {
    const date = new Date(`${row.activityDate}T00:00:00`)
    return date.getFullYear() === year
  })
}

function subtractDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() - days)
  return next
}

function getWeekStartDate(date: Date) {
  const weekStart = new Date(date)
  weekStart.setHours(0, 0, 0, 0)
  const day = weekStart.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  weekStart.setDate(weekStart.getDate() + mondayOffset)
  return weekStart
}

function buildTrendSnapshot(params: {
  label: string
  currentLabel: string
  previousLabel: string
  current: DashboardSnapshot
  previous: DashboardSnapshot
}): DashboardTrendSnapshot {
  const answeredDelta = params.current.answeredCount - params.previous.answeredCount
  const accuracyDelta =
    Math.round((params.current.accuracyRate - params.previous.accuracyRate) * 100) /
    100
  const studyMinutesDelta = params.current.studyMinutes - params.previous.studyMinutes
  const achievementsDelta =
    params.current.earnedAchievementsCount - params.previous.earnedAchievementsCount
  const activeDaysDelta =
    params.current.activeDaysCount - params.previous.activeDaysCount

  return {
    label: params.label,
    currentLabel: params.currentLabel,
    previousLabel: params.previousLabel,
    currentAnsweredCount: params.current.answeredCount,
    previousAnsweredCount: params.previous.answeredCount,
    answeredDelta,
    accuracyDelta,
    studyMinutesDelta,
    achievementsDelta,
    activeDaysDelta,
    trend:
      answeredDelta > 0
        ? "up"
        : answeredDelta < 0
          ? "down"
          : "flat",
  }
}

function formatMonthLabel(date: Date) {
  return MONTH_YEAR_FMT.format(date)
}

function filterFocusableSubjects(subjects: SubjectPerformance[]) {
  return subjects.filter((subject) => subject.totalAnswered >= 3)
}

export async function getOverallPerformanceStats(
  userId: string
): Promise<OverallPerformanceStats> {
  const [subjects, categories, answers, totalQuestions] = await Promise.all([
    listSubjects(),
    listAnsweredCategories(),
    listUserAnswers(userId),
    getQuestionBankTotal(),
  ])

  // SKUs, not row IDs — a re-import reissues row IDs and would make the same
  // item look like several (gotcha 5).
  const uniqueQuestionIds = new Set(answers.map((row) => row.questionSku))
  const correctAnswers = answers.filter((row) => row.isCorrect).length
  const totalAnswered = answers.length
  const averageTimePerQuestion =
    answers.length > 0
      ? Math.round(
          answers.reduce(
            (total, row) => total + (row.responseTimeSeconds ?? 0),
            0
          ) / answers.length
        )
      : 0

  return {
    uniqueQuestionsAnswered: uniqueQuestionIds.size,
    totalQuestions,
    correctAnswers,
    totalAnswered,
    correctPercent: calculatePercent(correctAnswers, totalAnswered),
    averageTimePerQuestion,
    bestStreak: computeBestStreak(answers),
    subjectBreakdown: buildSubjectBreakdown(
      buildSubjectNameMap(subjects, categories),
      answers
    ),
  }
}

export async function getQuestionsAnsweredTimeline(
  userId: string,
  window: TimelineWindow,
  offset = 0
): Promise<QuestionsAnsweredTimeline> {
  const rows = await listUserDailyActivity(userId)
  const bucketConfig = getTimelineBucketConfig(window, offset)
  const countByBucket = new Map<string, number>(
    bucketConfig.buckets.map((bucket) => [bucket.key, 0])
  )
  let mostAnsweredInOneDay = 0
  let mostAnsweredDate = "—"

  for (const row of rows) {
    if (!isWithinRange(row.activityDate, bucketConfig)) {
      continue
    }

    if (row.answeredCount > mostAnsweredInOneDay) {
      mostAnsweredInOneDay = row.answeredCount
      mostAnsweredDate = formatDateShort(new Date(`${row.activityDate}T00:00:00`))
    }

    const bucketKey = getTimelineBucketKey(window, row.activityDate, bucketConfig)
    if (!bucketKey) {
      continue
    }

    incrementCount(countByBucket, bucketKey, row.answeredCount)
  }

  const points = bucketConfig.buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: countByBucket.get(bucket.key) ?? 0,
    dateLabel: formatDateShortNoYear(bucket.date),
  }))

  return {
    window,
    points,
    rangeLabel: bucketConfig.rangeLabel,
    questionsThisPeriod: points.reduce((total, point) => total + point.value, 0),
    mostAnsweredInOneDay,
    mostAnsweredDate,
    offset,
  }
}

export async function getDashboardReportMetrics(
  userId: string
): Promise<DashboardReportMetrics> {
  const [dailyRows, progressRows] = await Promise.all([
    listUserDailyActivity(userId),
    listUserProgressRows(userId),
  ])
  const today = new Date()
  const todayKey = toIsoDateKey(today)
  const currentWeekStart = (() => {
    const current = new Date(today)
    const day = current.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    current.setDate(current.getDate() + mondayOffset)
    return toIsoDateKey(current)
  })()
  const globalProgress =
    progressRows.find(
      (row) =>
        row.subjectId === GLOBAL_PROGRESS_SUBJECT_ID &&
        row.topicId === GLOBAL_PROGRESS_TOPIC_ID
    ) ?? null

  const todayRows = dailyRows.filter((row) => row.activityDate === todayKey)
  const weekRows = dailyRows.filter((row) => row.weekStartDate === currentWeekStart)
  const monthRows = filterRowsByMonth(
    dailyRows,
    today.getFullYear(),
    today.getMonth()
  )
  const yearRows = filterRowsByYear(dailyRows, today.getFullYear())

  const lifetimeAnsweredCount =
    globalProgress?.answeredCount ??
    dailyRows.reduce((total, row) => total + row.answeredCount, 0)
  const lifetimeCorrectCount =
    globalProgress?.correctCount ??
    dailyRows.reduce((total, row) => total + row.correctCount, 0)
  const lifetimeIncorrectCount =
    globalProgress?.incorrectCount ??
    dailyRows.reduce((total, row) => total + row.incorrectCount, 0)

  return {
    today: buildDashboardSnapshot("Today", todayRows),
    week: buildDashboardSnapshot("This Week", weekRows),
    month: buildDashboardSnapshot("This Month", monthRows),
    year: buildDashboardSnapshot("This Year", yearRows),
    lifetime: {
      totalStudyMinutes:
        globalProgress?.totalStudyMinutes ??
        dailyRows.reduce((total, row) => total + row.studyMinutes, 0),
      activeDaysCount:
        globalProgress?.activeDaysCount ??
        dailyRows.filter(
          (row) =>
            row.answeredCount > 0 ||
            row.studyMinutes > 0 ||
            row.completedMaterials > 0
        ).length,
      achievementsCount:
        globalProgress?.achievementsCount ??
        dailyRows.reduce((total, row) => total + row.earnedAchievementsCount, 0),
      weeklyAverageScore: globalProgress?.weeklyAverageScore ?? 0,
      dayStreak: globalProgress?.dayStreak ?? 0,
      accuracyRate:
        lifetimeAnsweredCount > 0
          ? Math.round((lifetimeCorrectCount / lifetimeAnsweredCount) * 10000) /
            100
          : globalProgress?.accuracyRate ?? 0,
      answeredCount: lifetimeAnsweredCount,
      correctCount: lifetimeCorrectCount,
      incorrectCount: lifetimeIncorrectCount,
      completedMaterials:
        globalProgress?.completedMaterials ??
        dailyRows.reduce((total, row) => total + row.completedMaterials, 0),
    },
  }
}

export async function getDashboardInsights(
  userId: string
): Promise<DashboardInsights> {
  const [subjects, answers, dailyRows, weeklyRows, progressRows, achievements] =
    await Promise.all([
      listSubjects(),
      listUserAnswers(userId),
      listUserDailyActivity(userId),
      listUserWeeklyReports(userId),
      listUserProgressRows(userId),
      listRecentAchievements(userId, 4),
    ])

  const subjectBreakdown = buildSubjectBreakdown(
    buildSubjectNameMap(subjects),
    answers
  )
  const focusableSubjects = filterFocusableSubjects(subjectBreakdown)
  const strongestSubject = focusableSubjects[0] ?? subjectBreakdown[0] ?? null
  const weakestSubject =
    [...focusableSubjects].sort(
      (left, right) => left.correctPercent - right.correctPercent
    )[0] ??
    [...subjectBreakdown].sort(
      (left, right) => left.correctPercent - right.correctPercent
    )[0] ??
    null

  const today = new Date()
  const currentWeekStart = getWeekStartDate(today)
  const previousWeekStart = subtractDays(currentWeekStart, 7)
  const currentWeekKey = toIsoDateKey(currentWeekStart)
  const previousWeekKey = toIsoDateKey(previousWeekStart)

  const currentWeekReport =
    weeklyRows.find((row) => row.weekStartDate === currentWeekKey) ?? null
  const previousWeekReport =
    weeklyRows.find((row) => row.weekStartDate === previousWeekKey) ?? null

  const currentWeekSnapshot = currentWeekReport
    ? {
        label: "This Week",
        answeredCount: currentWeekReport.answeredCount,
        correctCount: currentWeekReport.correctCount,
        incorrectCount: currentWeekReport.incorrectCount,
        accuracyRate: currentWeekReport.accuracyRate,
        studyMinutes: currentWeekReport.studyMinutes,
        completedMaterials: currentWeekReport.completedMaterials,
        earnedAchievementsCount: currentWeekReport.earnedAchievementsCount,
        activeDaysCount: currentWeekReport.activeDaysCount,
        averageScore: currentWeekReport.averageScore,
      }
    : buildDashboardSnapshot(
        "This Week",
        dailyRows.filter((row) => row.weekStartDate === currentWeekKey)
      )
  const previousWeekSnapshot = previousWeekReport
    ? {
        label: "Last Week",
        answeredCount: previousWeekReport.answeredCount,
        correctCount: previousWeekReport.correctCount,
        incorrectCount: previousWeekReport.incorrectCount,
        accuracyRate: previousWeekReport.accuracyRate,
        studyMinutes: previousWeekReport.studyMinutes,
        completedMaterials: previousWeekReport.completedMaterials,
        earnedAchievementsCount: previousWeekReport.earnedAchievementsCount,
        activeDaysCount: previousWeekReport.activeDaysCount,
        averageScore: previousWeekReport.averageScore,
      }
    : buildDashboardSnapshot(
        "Last Week",
        dailyRows.filter((row) => row.weekStartDate === previousWeekKey)
      )

  const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1)
  const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const currentMonthSnapshot = buildDashboardSnapshot(
    "This Month",
    filterRowsByMonth(dailyRows, currentMonthDate.getFullYear(), currentMonthDate.getMonth())
  )
  const previousMonthSnapshot = buildDashboardSnapshot(
    "Last Month",
    filterRowsByMonth(
      dailyRows,
      previousMonthDate.getFullYear(),
      previousMonthDate.getMonth()
    )
  )

  const globalProgress =
    progressRows.find(
      (row) =>
        row.subjectId === GLOBAL_PROGRESS_SUBJECT_ID &&
        row.topicId === GLOBAL_PROGRESS_TOPIC_ID
    ) ?? null

  return {
    weekOverWeek: buildTrendSnapshot({
      label: "Week over Week",
      currentLabel: "This Week",
      previousLabel: "Last Week",
      current: currentWeekSnapshot,
      previous: previousWeekSnapshot,
    }),
    monthOverMonth: buildTrendSnapshot({
      label: "Month over Month",
      currentLabel: formatMonthLabel(currentMonthDate),
      previousLabel: formatMonthLabel(previousMonthDate),
      current: currentMonthSnapshot,
      previous: previousMonthSnapshot,
    }),
    consistency: {
      currentWeekActiveDays: currentWeekSnapshot.activeDaysCount,
      targetActiveDays: 5,
      remainingDaysToGoal: Math.max(5 - currentWeekSnapshot.activeDaysCount, 0),
      currentStreak: globalProgress?.dayStreak ?? 0,
      weeklyAverageScore: globalProgress?.weeklyAverageScore ?? 0,
    },
    strongestSubject,
    weakestSubject,
    focusSubjects: [...focusableSubjects]
      .sort((left, right) => left.correctPercent - right.correctPercent)
      .slice(0, 3),
    recentAchievements: achievements.map((achievement) => ({
      id: achievement.$id,
      title: achievement.title,
      description: achievement.description ?? null,
      earnedAt: achievement.earnedAt,
      achievementType: achievement.achievementType,
      badgeKey: achievement.badgeKey ?? null,
    })),
  }
}
