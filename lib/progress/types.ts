import type { LearningAchievementDocument } from "../schema"
import type { StudyStatus } from "../session/study-session"

/**
 * ─── Progress vocabulary ──────────────────────────────────────────────────
 *
 * Everything here now speaks the schema's nouns. The previous version used
 * `examId`, `questionnaireKey`, `setName: "Set A"` and `sourceQuestionId` —
 * none of which are columns any more, and two of which could not survive a
 * sixth set or a content re-import.
 *
 * The mapping, for anyone reading old code:
 *
 *   examId            → categoryId, or categoryId + questionnaireId
 *   questionnaireKey  → questionnaireId (the row ID of the set)
 *   setName           → the set's `setCode`, which is display-only
 *   questionId        → questionSku
 *   attemptId         → sessionId
 */

export type LearningHistoryStatus = "in_progress" | "paused" | "completed"

/**
 * A snapshot of who earned a badge, copied onto the badge row.
 *
 * Copied rather than joined so a name change next year does not rewrite what a
 * certificate said when it was issued.
 */
export type AchievementProfileSnapshot = {
  fullName?: string | null
  schoolName?: string | null
  /** The member-type label at the time — "Retaker", "Licensed social worker". */
  reviewType?: string | null
  avatarUrl?: string | null
}

// ─── user_progress ──────────────────────────────────────────────────────────

/**
 * Where a member is in one paper, plus their running totals.
 *
 * Keyed by `userId` + `categoryId`, and `questionnaireId` as well when they are
 * inside a set. The reading side reuses the same table keyed by
 * `subjectId` + `topicId`, and the app keeps one "global" row for
 * streak/lifetime numbers that belong to nothing in particular.
 */
export type UpsertUserProgressParams = {
  userId: string
  /** Exam side. */
  categoryId?: string
  questionnaireId?: string
  /** Reading side. */
  subjectId?: string
  topicId?: string
  nowIso?: string
  averageScore?: number
  completedMaterialsDelta?: number
  answeredCountDelta?: number
  correctCountDelta?: number
  incorrectCountDelta?: number
  scoreDelta?: number
  totalStudyMinutesDelta?: number
  achievementsCountDelta?: number
  /** The row ID of the last item seen, for a "resume" jump. */
  lastQuestionId?: string
  /** Position in the run, 0-based. */
  lastQuestionIndex?: number
  /**
   * **SKUs**, despite the column name. Row IDs do not survive a re-import, so
   * storing them would orphan the list the next time content is re-uploaded.
   */
  answeredQuestionSkusToAdd?: string[]
}

export type UserProgressUpsertData = {
  userId: string
  categoryId: string | null
  questionnaireId: string | null
  subjectId: string | null
  topicId: string | null
  completedMaterials: number
  averageScore: number
  lastStudied: string
  lastQuestionId: string | null
  lastQuestionIndex: number
  score: number
  answeredCount: number
  correctCount: number
  incorrectCount: number
  accuracyRate: number
  answeredQuestionIds: string[]
  dayStreak: number
  weeklyAverageScore: number
  lastActiveAt: string
  totalStudyMinutes: number
  activeDaysCount: number
  achievementsCount: number
}

export type UserProgressSummary = {
  categoryId: string
  questionnaireId: string | null
  totalAttempts: number
  totalCorrect: number
  totalItems: number
  averageScore: number
  lastStudied: string | null
}

// ─── Activity feed ──────────────────────────────────────────────────────────

export type ActivityFeedOptions = {
  sessionsLimit?: number
  learningHistoryLimit?: number
  achievementsLimit?: number
}

/** One sitting, as the profile and home screens render it. */
export type ActivitySession = {
  id: string
  sessionId: string
  categoryId: string
  questionnaireId: string
  /** Copied at the start of the sitting; shown as written. */
  title: string
  correctCount: number
  questionCount: number
  answeredCount: number
  percent: number
  durationSeconds: number
  status: StudyStatus
  startedAt: string
  endedAt: string | null
  /** The stored `order` of the last item seen — where "resume" picks up. */
  lastQuestionOrder: number
}

export type ActivityLearningHistory = {
  id: string
  learningMaterialId: string
  materialTitle: string
  subjectId: string | null
  topicId: string | null
  status: LearningHistoryStatus
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
  completedSessions: number
  averageSessionScore: number
  learningHistory: ActivityLearningHistory[]
  learningHistoryHasMore: boolean
  sessions: ActivitySession[]
  sessionsHasMore: boolean
  achievements: ActivityAchievement[]
  achievementsHasMore: boolean
}

// ─── Reading side ───────────────────────────────────────────────────────────

export type LearningActivityPayload = {
  userId: string
  subjectId: string
  topicId: string
  learningMaterialId: string
  profileSnapshot?: AchievementProfileSnapshot
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
  status: LearningHistoryStatus
  progressPercent: number
  lastAccessedAt: string
  completedAt: string | null
}

// ─── Aggregates ─────────────────────────────────────────────────────────────

export type AwardMilestoneParams = {
  userId: string
  metricValue: number
  dayStreak: number
  weeklyAverageScore: number
  profileSnapshot?: AchievementProfileSnapshot
  /** What the badge is about — a category, a set, a material. */
  referenceId?: string
  subjectId?: string
  topicId?: string
  metricKey?: string
  badgeKey?: string
  thresholdValue?: number
  periodType?: "instant" | "daily" | "weekly" | "lifetime"
  periodStartDate?: string
  periodEndDate?: string
}

export type ActivityCounters = {
  answeredCount: number
  correctCount: number
  incorrectCount: number
  studyMinutes: number
  completedMaterials: number
  earnedAchievementsCount: number
  averageScore?: number
}

export type RecordDailyActivityParams = {
  userId: string
  nowIso?: string
  categoryId?: string
  questionnaireId?: string
  subjectId?: string
  topicId?: string
  counters: ActivityCounters
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

export type EntityTitleMapParams = {
  entityIds: string[]
}
