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
}

export type UserProgressUpsertData = {
  userId: string
  subjectId: string
  topicId: string
  completedMaterials: number
  averageScore: number
  lastStudied: string
  dayStreak: number
  weeklyAverageScore: number
  lastActiveAt: string
}

export type UserAnswerRowData = {
  attemptId: string
  questionId: string
  choiceId: string
  isCorrect: boolean
}

export type AwardMilestoneParams = {
  userId: string
  metricValue: number
  dayStreak: number
  weeklyAverageScore: number
  profileSnapshot?: AchievementProfileSnapshot
  examId?: string
}

export type EntityTitleMapParams = {
  entityIds: string[]
}
