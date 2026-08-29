import { DAILY_TRACKER, PERFORMANCE_METRICS } from "@/data/reviewer-data"

import type {
  TrackingMetrics,
  TrackingSnapshot,
  WeeklyCalendarDay,
} from "@/lib/home-types"
import type {
  ActivityLearningHistory,
  ActivitySession,
  UserActivityFeed,
} from "@/lib/progress"

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
  sessions: ActivitySession[],
  learningHistory: ActivityLearningHistory[]
): TrackingSnapshot {
  const activityCountByDay = new Map<string, number>()
  const todayKey = toDayKey(new Date())
  const weeklyKeys = buildRecentDayKeys(7)

  collectActivityCounts(
    sessions,
    (session) => session.endedAt ?? session.startedAt,
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
    activityFeed?.sessions ?? [],
    activityFeed?.learningHistory ?? []
  )
  const hasActivityData = Boolean(
    activityFeed?.sessions || activityFeed?.learningHistory
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

/**
 * Two letters, not one: a single-letter strip reads "S M T W T F S", where
 * the two S's and two T's are indistinguishable from each other.
 */
function getWeekdayGlyph(date: Date) {
  return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][date.getDay()] ?? "?"
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

  for (const session of activityFeed?.sessions ?? []) {
    const dayKey = parseDayKey(session.endedAt ?? session.startedAt)
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
