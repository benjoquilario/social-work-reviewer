import { DAILY_TRACKER, PERFORMANCE_METRICS } from "@/data/reviewer-data"
import type {
  ActivityLearningHistory,
  ActivityQuizAttempt,
  UserActivityFeed,
} from "@/lib/progress"
import type {
  TrackingMetrics,
  TrackingSnapshot,
  WeeklyCalendarDay,
} from "@/lib/home-types"

export const DAILY_ACTIVITY_TARGET = 4

export function formatDurationCompact(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safeSeconds / 60)

  if (minutes <= 0) {
    return `${safeSeconds}s`
  }

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function formatRelativeDateLabel(value: string | null) {
  if (!value) {
    return "Recently updated"
  }

  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) {
    return "Recently updated"
  }

  const deltaMinutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000)
  if (deltaMinutes < 1) return "Just now"
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`

  const deltaHours = Math.floor(deltaMinutes / 60)
  if (deltaHours < 24) return `${deltaHours}h ago`

  const deltaDays = Math.floor(deltaHours / 24)
  return `${deltaDays}d ago`
}

export function parseBoardExamAttemptExamId(examId: string) {
  if (!examId.startsWith("board-exam:")) {
    return null
  }

  const [, setId = "", totalQuestions = "", minutes = ""] = examId.split(":")
  if (!setId || !totalQuestions || !minutes) {
    return null
  }

  return {
    setId,
    totalQuestions,
    minutes,
  }
}

export function matchesSearchQuery(value: string, query: string) {
  return value.toLowerCase().includes(query)
}

export function toDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function buildRecentDayKeys(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (days - 1 - index))

    return toDayKey(date)
  })
}

export function parseDayKey(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return null
  }

  return toDayKey(timestamp)
}

function incrementDayActivityCount(
  activityCountByDay: Map<string, number>,
  dayKey: string
) {
  activityCountByDay.set(dayKey, (activityCountByDay.get(dayKey) ?? 0) + 1)
}

function collectActivityCounts<T>(
  items: T[],
  getTimestamp: (item: T) => string | null | undefined,
  activityCountByDay: Map<string, number>
) {
  for (const item of items) {
    const dayKey = parseDayKey(getTimestamp(item))
    if (!dayKey) {
      continue
    }

    incrementDayActivityCount(activityCountByDay, dayKey)
  }
}

function summarizeWeeklySnapshot(
  activityCountByDay: Map<string, number>,
  weeklyKeys: string[]
) {
  let weeklyActiveDays = 0
  let weeklyTotalActivities = 0

  for (const dayKey of weeklyKeys) {
    const count = activityCountByDay.get(dayKey) ?? 0
    weeklyTotalActivities += count

    if (count > 0) {
      weeklyActiveDays += 1
    }
  }

  return {
    weeklyActiveDays,
    weeklyTotalActivities,
  }
}

function buildTrackingSnapshot(
  attempts: ActivityQuizAttempt[],
  learningHistory: ActivityLearningHistory[]
): TrackingSnapshot {
  const activityCountByDay = new Map<string, number>()
  const todayKey = toDayKey(new Date())
  const weeklyKeys = buildRecentDayKeys(7)

  collectActivityCounts(
    attempts,
    (attempt) => attempt.finishedAt ?? attempt.startedAt,
    activityCountByDay
  )
  collectActivityCounts(
    learningHistory,
    (entry) => entry.lastAccessedAt,
    activityCountByDay
  )

  const { weeklyActiveDays, weeklyTotalActivities } = summarizeWeeklySnapshot(
    activityCountByDay,
    weeklyKeys
  )

  return {
    dailyCount: activityCountByDay.get(todayKey) ?? 0,
    weeklyActiveDays,
    weeklyTotalActivities,
  }
}

export function buildTrackingMetrics(
  activityFeed: UserActivityFeed | null
): TrackingMetrics {
  const weeklyMetric = PERFORMANCE_METRICS.find(
    (metric) => metric.window === "week"
  )
  const trackingSnapshot = buildTrackingSnapshot(
    activityFeed?.quizAttempts ?? [],
    activityFeed?.learningHistory ?? []
  )
  const hasActivityData = Boolean(
    activityFeed?.quizAttempts || activityFeed?.learningHistory
  )
  const effectiveDayStreak = activityFeed?.dayStreak ?? DAILY_TRACKER.streakDays
  const effectiveWeeklyAverage = Math.round(
    activityFeed?.weeklyAverageScore ?? weeklyMetric?.averageScore ?? 0
  )
  const effectiveDailyTrackingCount = hasActivityData
    ? trackingSnapshot.dailyCount
    : DAILY_TRACKER.completedSessions
  const effectiveWeeklyActiveDays = hasActivityData
    ? trackingSnapshot.weeklyActiveDays
    : Math.min(DAILY_TRACKER.streakDays, 7)
  const dailyTrackingProgress = Math.min(
    100,
    Math.round((effectiveDailyTrackingCount / DAILY_ACTIVITY_TARGET) * 100)
  )
  const weeklyTrackingProgress = Math.min(
    100,
    Math.round((effectiveWeeklyActiveDays / 7) * 100)
  )

  return {
    trackingSnapshot,
    effectiveDayStreak,
    effectiveWeeklyAverage,
    effectiveDailyTrackingCount,
    effectiveWeeklyActiveDays,
    dailyTrackingProgress,
    weeklyTrackingProgress,
  }
}

function getWeekdayGlyph(date: Date) {
  return ["S", "M", "T", "W", "T", "F", "S"][date.getDay()] ?? "?"
}

export function buildWeeklyCalendarSummary(
  activityFeed: UserActivityFeed | null
) {
  const weeklyKeys = buildRecentDayKeys(7)
  const todayKey = toDayKey(new Date())
  const countsByDay = new Map<
    string,
    { quizCount: number; learningCount: number }
  >()

  for (const attempt of activityFeed?.quizAttempts ?? []) {
    const dayKey = parseDayKey(attempt.finishedAt ?? attempt.startedAt)
    if (!dayKey) {
      continue
    }

    const current = countsByDay.get(dayKey) ?? {
      quizCount: 0,
      learningCount: 0,
    }
    current.quizCount += 1
    countsByDay.set(dayKey, current)
  }

  for (const entry of activityFeed?.learningHistory ?? []) {
    const dayKey = parseDayKey(entry.lastAccessedAt)
    if (!dayKey) {
      continue
    }

    const current = countsByDay.get(dayKey) ?? {
      quizCount: 0,
      learningCount: 0,
    }
    current.learningCount += 1
    countsByDay.set(dayKey, current)
  }

  const days = weeklyKeys.map<WeeklyCalendarDay>((key) => {
    const parsedDate = new Date(`${key}T00:00:00`)
    const current = countsByDay.get(key) ?? { quizCount: 0, learningCount: 0 }

    return {
      key,
      label: getWeekdayGlyph(parsedDate),
      dayNumber: String(parsedDate.getDate()),
      quizCount: current.quizCount,
      learningCount: current.learningCount,
      totalCount: current.quizCount + current.learningCount,
      isToday: key === todayKey,
    }
  })

  const defaultSelectedDay =
    [...days].reverse().find((day) => day.totalCount > 0) ??
    days[days.length - 1]

  return {
    days,
    defaultSelectedDayKey: defaultSelectedDay?.key ?? null,
  }
}

export function fetchEnrichedResumableAttempts(
  ongoingAttempts: {
    $id: string
    examId: string
    timeTaken: number
    currentQuestionIndex: number
    totalItems: number
    lastAnsweredAt: string | null
    startedAt: string
  }[],
  getBoardExamSet: (
    setId: string
  ) => Promise<{
    title: string
    setCode: string
    categoryId: string
  } | null>,
  formatDuration: (seconds: number) => string
) {
  return Promise.all(
    ongoingAttempts.map(async (attempt) => {
      const boardExamMeta = parseBoardExamAttemptExamId(attempt.examId)

      if (boardExamMeta) {
        const set = await getBoardExamSet(boardExamMeta.setId).catch(
          () => null
        )

        const params = set
          ? {
              source: "board-exam",
              categoryId: set.categoryId,
              setId: boardExamMeta.setId,
              totalQuestions: boardExamMeta.totalQuestions,
              minutes: boardExamMeta.minutes,
            }
          : null

        return {
          attempt,
          title: set?.title ?? "Board Exam",
          subtitle: set
            ? `${set.setCode} • ${formatDuration(attempt.timeTaken)} elapsed`
            : `${formatDuration(attempt.timeTaken)} elapsed`,
          params: params
            ? {
                pathname: "/quiz" as const,
                params,
              }
            : null,
        }
      }

      return {
        attempt,
        title: "Board Exam Session",
        subtitle: `${formatDuration(attempt.timeTaken)} elapsed`,
        params: null,
      }
    })
  )
}
