import type { LearningAchievementDocument } from "../schema"

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

export type LearningHistoryStatus = "in_progress" | "paused" | "completed"

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
  selectedAnswerKey: string
  selectedAnswerText: string
  correctAnswerKey: string
  correctAnswerText: string
  isCorrect: boolean
  currentQuestionIndex: number
  totalItems: number
  subjectId?: string
  topicId?: string
  questionnaireKey?: string
  setName?: "Set A" | "Set B" | "Set C" | "Set D"
  sourceQuestionId?: number
  responseTimeSeconds?: number
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

export type UpsertUserProgressParams = {
  userId: string
  subjectId: string
  topicId: string
  nowIso?: string
  averageScore?: number
  completedMaterialsDelta?: number
  answeredCountDelta?: number
  correctCountDelta?: number
  incorrectCountDelta?: number
  scoreDelta?: number
  totalStudyMinutesDelta?: number
  achievementsCountDelta?: number
  questionnaireKey?: string
  setName?: "Set A" | "Set B" | "Set C" | "Set D"
  lastQuestionId?: string
  lastQuestionIndex?: number
  lastSourceQuestionId?: number
  answeredQuestionIdsToAdd?: string[]
}

export type UserProgressUpsertData = {
  userId: string
  subjectId: string
  topicId: string
  questionnaireKey: string | null
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
  lastSourceQuestionId: number | null
  answeredQuestionIds: string[]
  setName: "Set A" | "Set B" | "Set C" | "Set D"
  dayStreak: number
  weeklyAverageScore: number
  lastActiveAt: string
  totalStudyMinutes: number
  activeDaysCount: number
  achievementsCount: number
}

export type UserAnswerRowData = {
  userId: string
  sessionId: string
  questionId: string
  sourceQuestionId?: number | null
  subjectId?: string | null
  topicId?: string | null
  questionnaireKey?: string | null
  setName?: "Set A" | "Set B" | "Set C" | "Set D" | null
  selectedAnswerKey: string
  selectedAnswerText: string
  correctAnswerKey: string
  correctAnswerText: string
  isCorrect: boolean
  answeredAt: string
  responseTimeSeconds?: number | null
}

export type AwardMilestoneParams = {
  userId: string
  metricValue: number
  dayStreak: number
  weeklyAverageScore: number
  profileSnapshot?: AchievementProfileSnapshot
  examId?: string
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
  subjectId?: string
  topicId?: string
  questionnaireKey?: string
  setName?: "Set A" | "Set B" | "Set C" | "Set D"
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
