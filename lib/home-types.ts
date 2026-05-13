import type { ThemePalette } from "@/lib/theme"

export type { ThemePalette }

export type TrackingSnapshot = {
  dailyCount: number
  weeklyActiveDays: number
  weeklyTotalActivities: number
}

export type TrackingMetrics = {
  trackingSnapshot: TrackingSnapshot
  effectiveDayStreak: number
  effectiveWeeklyAverage: number
  effectiveDailyTrackingCount: number
  effectiveWeeklyActiveDays: number
  dailyTrackingProgress: number
  weeklyTrackingProgress: number
}

export type ResumeAttemptCard = {
  id: string
  title: string
  subtitle: string
  progressLabel: string
  updatedLabel: string
  onPressParams: { pathname: "/quiz"; params: Record<string, string> } | null
}

export type WeeklyCalendarDay = {
  key: string
  label: string
  dayNumber: string
  totalCount: number
  quizCount: number
  learningCount: number
  isToday: boolean
}

export type QuickAccessTone = "primary" | "support" | "accent"

export type QuickAccessItem = {
  Icon: React.ComponentType<{ size: number; color: string }>
  eyebrow: string
  label: string
  sub: string
  actionLabel: string
  path: string
  tone: QuickAccessTone
}
