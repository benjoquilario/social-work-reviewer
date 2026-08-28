import {
  BookOpen,
  Calculator,
  ClipboardCheck,
  GraduationCap,
  Layers,
  Scale,
  TrendingUp,
  type LucideIcon,
} from "lucide-react-native"

import type { LearningSubject } from "@/lib/learning-content"
import type { UserActivityFeed } from "@/lib/progress"
import { getThemeChartPalette, type ThemePalette } from "@/lib/theme"
import type { Tone } from "@/lib/tone"

/**
 * ─── Study dashboard presentation ─────────────────────────────────────────
 *
 * Shapes Appwrite data into the props the Home and Profile sections render.
 * Both screens show the same subjects, the same progress totals and the same
 * activity list, so they derive them from one place rather than each rolling
 * its own and drifting. Kept apart
 * from the screen so the mapping rules — what counts as "studied", which hue a
 * subject gets, how a timestamp becomes "12 mins ago" — are testable without
 * mounting anything, and so the screen stays a layout file.
 */

/** Cycled so neighbouring subject cards never share a hue. */
const SUBJECT_ICONS: LucideIcon[] = [
  Scale,
  Calculator,
  ClipboardCheck,
  TrendingUp,
  BookOpen,
  Layers,
  GraduationCap,
]

export function getGreetingSalutation(now: Date = new Date()) {
  const hour = now.getHours()

  if (hour < 12) {
    return "Good morning"
  }

  if (hour < 18) {
    return "Good afternoon"
  }

  return "Good evening"
}

export type SubjectProgressItem = {
  id: string
  title: string
  Icon: LucideIcon
  color: string
  completed: number
  total: number
  percent: number
  unitLabel: string
  isLocked: boolean
}

/**
 * Per-subject completion, measured in learning materials.
 *
 * Materials rather than topics because that is what the data actually records:
 * `learning_history` has one row per material with a `status`, while topic
 * completion is never written anywhere. Counting distinct material IDs — not
 * rows — keeps a material reopened three times from counting three times.
 */
export function buildSubjectProgressItems(
  subjects: LearningSubject[],
  activityFeed: UserActivityFeed | null,
  theme: ThemePalette
): SubjectProgressItem[] {
  const palette = getThemeChartPalette(theme)
  const completedBySubject = new Map<string, Set<string>>()

  for (const entry of activityFeed?.learningHistory ?? []) {
    if (entry.status !== "completed" || !entry.subjectId) {
      continue
    }

    const bucket =
      completedBySubject.get(entry.subjectId) ?? new Set<string>()
    bucket.add(entry.learningMaterialId)
    completedBySubject.set(entry.subjectId, bucket)
  }

  return subjects.map((subject, index) => {
    const total = Math.max(subject.materialCount, 0)
    const completed = Math.min(
      completedBySubject.get(subject.id)?.size ?? 0,
      total
    )

    return {
      id: subject.id,
      title: subject.name,
      Icon: SUBJECT_ICONS[index % SUBJECT_ICONS.length],
      color: palette[index % palette.length],
      completed,
      total,
      percent: total > 0 ? (completed / total) * 100 : 0,
      unitLabel: total === 1 ? "Material" : "Materials",
      isLocked: subject.isLocked,
    }
  })
}

export type StudyProgressSummary = {
  progressPercent: number
  topicsStudied: number
  /** Total materials across every subject, for the "48 / 67" reading. */
  topicsTotal: number
  questionsSolved: number
  averageScore: number
  dayStreak: number
  /** Time spent in finished quiz attempts. Learning time is not recorded. */
  hoursStudied: number
}

/**
 * The four headline numbers plus the overall bar.
 *
 * `progressPercent` is materials completed across every subject, so it agrees
 * with the per-subject cards below it rather than being a second, differently
 * derived number that happens to sit on the same screen.
 */
export function buildStudyProgressSummary(
  subjects: SubjectProgressItem[],
  activityFeed: UserActivityFeed | null
): StudyProgressSummary {
  const totals = subjects.reduce(
    (accumulator, subject) => ({
      completed: accumulator.completed + subject.completed,
      total: accumulator.total + subject.total,
    }),
    { completed: 0, total: 0 }
  )

  // Finished attempts only. `totalItems` is the size of the set, not how much
  // of it was answered, so counting an ongoing attempt credits every question
  // the learner has not reached yet — a 100-item mock opened once would add
  // 100 to "Questions Solved".
  const questionsSolved = (activityFeed?.quizAttempts ?? [])
    .filter((attempt) => attempt.status === "done")
    .reduce((sum, attempt) => sum + Math.max(attempt.totalItems, 0), 0)

  // Only finished attempts carry a meaningful `timeTaken`; an ongoing one is
  // still accumulating. Quiz time only — nothing records reading time, so this
  // deliberately under-reports rather than inventing a number.
  const secondsStudied = (activityFeed?.quizAttempts ?? [])
    .filter((attempt) => attempt.status === "done")
    .reduce((sum, attempt) => sum + Math.max(attempt.timeTaken, 0), 0)

  return {
    progressPercent:
      totals.total > 0 ? (totals.completed / totals.total) * 100 : 0,
    topicsStudied: totals.completed,
    topicsTotal: totals.total,
    questionsSolved,
    averageScore: Math.round(activityFeed?.averageQuizScore ?? 0),
    dayStreak: activityFeed?.dayStreak ?? 0,
    hoursStudied: secondsStudied / 3600,
  }
}

export type RecentActivityEntry = {
  id: string
  Icon: LucideIcon
  title: string
  timeLabel: string
  scoreLabel: string | null
  tone: Tone
  /** Set only for a paused attempt, which the row turns into a resume tap. */
  resumeAttemptId: string | null
  timestamp: string
}

const RELATIVE_UNITS: { limit: number; divisor: number; unit: string }[] = [
  { limit: 60_000, divisor: 1_000, unit: "sec" },
  { limit: 3_600_000, divisor: 60_000, unit: "min" },
  { limit: 86_400_000, divisor: 3_600_000, unit: "hour" },
  { limit: 604_800_000, divisor: 86_400_000, unit: "day" },
]

export function formatRelativeTimeLabel(
  value: string | null | undefined,
  now: Date = new Date()
) {
  if (!value) {
    return "Just now"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return "Just now"
  }

  const elapsed = Math.max(now.getTime() - parsed.getTime(), 0)

  for (const { limit, divisor, unit } of RELATIVE_UNITS) {
    if (elapsed < limit) {
      const amount = Math.max(Math.floor(elapsed / divisor), 1)
      return `${amount} ${unit}${amount === 1 ? "" : "s"} ago`
    }
  }

  const weeks = Math.floor(elapsed / 604_800_000)
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`
}

/** Score bands, so the pill's colour matches how the result actually reads. */
function getScoreTone(percent: number): Tone {
  if (percent >= 80) {
    return "success"
  }

  if (percent >= 60) {
    return "warning"
  }

  return "destructive"
}

/**
 * Quiz attempts and lesson opens, merged and sorted newest-first.
 *
 * A paused attempt keeps its `resumeAttemptId` so the row can offer to resume
 * it. Home has no dedicated resume rail in this layout, and dropping the
 * ability to continue an unfinished exam to make room for a visual refresh
 * would be a real loss of function.
 */
export function buildRecentActivityEntries(
  activityFeed: UserActivityFeed | null,
  limit = 4,
  now: Date = new Date()
): RecentActivityEntry[] {
  if (!activityFeed) {
    return []
  }

  const quizEntries: RecentActivityEntry[] = activityFeed.quizAttempts.map(
    (attempt) => {
      const isDone = attempt.status === "done"
      const timestamp = attempt.finishedAt ?? attempt.startedAt

      return {
        id: `quiz-${attempt.id}`,
        Icon: isDone ? ClipboardCheck : GraduationCap,
        title: isDone
          ? `You scored ${attempt.percent}% on ${attempt.examTitle}`
          : `Paused: ${attempt.examTitle}`,
        timeLabel: isDone
          ? formatRelativeTimeLabel(timestamp, now)
          : `Question ${attempt.currentQuestionIndex + 1} · ${formatRelativeTimeLabel(timestamp, now)}`,
        scoreLabel: isDone ? `${attempt.percent}%` : null,
        tone: isDone ? getScoreTone(attempt.percent) : "primary",
        resumeAttemptId: isDone ? null : attempt.id,
        timestamp,
      }
    }
  )

  const learningEntries: RecentActivityEntry[] =
    activityFeed.learningHistory.map((entry) => ({
      id: `learn-${entry.id}`,
      Icon: BookOpen,
      title:
        entry.status === "completed"
          ? `Completed: ${entry.materialTitle}`
          : `Reviewed: ${entry.materialTitle}`,
      timeLabel: formatRelativeTimeLabel(entry.lastAccessedAt, now),
      scoreLabel: null,
      tone: entry.status === "completed" ? "success" : "muted",
      resumeAttemptId: null,
      timestamp: entry.lastAccessedAt,
    }))

  return [...quizEntries, ...learningEntries]
    .sort((left, right) =>
      new Date(right.timestamp).getTime() -
      new Date(left.timestamp).getTime()
    )
    .slice(0, limit)
}
