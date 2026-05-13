import { COLLECTIONS, DB_ID, tablesDB } from "../appwrite"
import type { LearningAchievementDocument } from "../schema"
import {
  MATERIAL_COMPLETION_MILESTONES,
  MATERIAL_COMPLETION_TIER_META,
  QUIZ_COMPLETION_MILESTONES,
  QUIZ_COMPLETION_TIER_META,
  QUIZ_SCORE_MILESTONES,
  QUIZ_SCORE_TIER_META,
  STREAK_MILESTONES,
  STREAK_TIER_META,
} from "./constants"
import type { AchievementProfileSnapshot, AwardMilestoneParams } from "./types"
import { buildDeterministicRowId, isAppwriteConflictError } from "./utils"

function buildAchievementRowId(params: {
  userId: string
  achievementType: LearningAchievementDocument["achievementType"]
  title: string
  learningMaterialId?: string
  examId?: string
  badgeKey?: string
  periodStartDate?: string
}) {
  return buildDeterministicRowId("achieve", [
    params.userId,
    params.achievementType,
    params.title,
    params.badgeKey ?? "",
    params.examId ?? "",
    params.learningMaterialId ?? "",
    params.periodStartDate ?? "",
  ])
}

export async function createAchievementIfMissing(params: {
  userId: string
  achievementType: LearningAchievementDocument["achievementType"]
  title: string
  description: string
  metricValue: number
  dayStreak: number
  weeklyAverageScore: number
  subjectId?: string
  topicId?: string
  learningMaterialId?: string
  examId?: string
  badgeKey?: string
  metricKey?: string
  thresholdValue?: number
  periodType?: LearningAchievementDocument["periodType"]
  periodStartDate?: string
  periodEndDate?: string
  profileSnapshot?: AchievementProfileSnapshot
}): Promise<boolean> {
  const nowIso = new Date().toISOString()

  try {
    await tablesDB.createRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.LEARNING_ACHIEVEMENTS,
      rowId: buildAchievementRowId(params),
      data: {
        userId: params.userId,
        fullName: params.profileSnapshot?.fullName ?? null,
        schoolName: params.profileSnapshot?.schoolName ?? null,
        reviewType: params.profileSnapshot?.reviewType ?? null,
        avatarUrl: params.profileSnapshot?.avatarUrl ?? null,
        subjectId: params.subjectId ?? null,
        topicId: params.topicId ?? null,
        learningMaterialId: params.learningMaterialId ?? null,
        achievementType: params.achievementType,
        badgeKey: params.badgeKey ?? null,
        title: params.title,
        description: params.description,
        metricValue: params.metricValue,
        thresholdValue: params.thresholdValue ?? null,
        metricKey: params.metricKey ?? null,
        periodType: params.periodType ?? "instant",
        periodStartDate: params.periodStartDate ?? null,
        periodEndDate: params.periodEndDate ?? null,
        dayStreak: params.dayStreak,
        weeklyAverageScore: params.weeklyAverageScore,
        earnedAt: nowIso,
        createdAt: nowIso,
      },
    })
    return true
  } catch (error) {
    if (!isAppwriteConflictError(error)) {
      throw error
    }

    return false
  }
}

export async function awardMilestoneIfEligible(params: {
  configType: "streak" | "quiz_completion" | "material_completion"
  payload: AwardMilestoneParams
}): Promise<number> {
  const { configType, payload } = params
  let milestones: number[]
  let tierMeta: Record<number, { title: string; description: string }>
  let achievementType: LearningAchievementDocument["achievementType"]
  let defaultTitleFn: (val: number) => string
  let defaultDescFn: (val: number) => string

  switch (configType) {
    case "streak":
      milestones = STREAK_MILESTONES
      tierMeta = STREAK_TIER_META
      achievementType = "streak"
      defaultTitleFn = (val) => `${val}-Day Study Streak`
      defaultDescFn = (val) =>
        `Stayed active for ${val} consecutive day${val > 1 ? "s" : ""}.`
      break
    case "quiz_completion":
      milestones = QUIZ_COMPLETION_MILESTONES
      tierMeta = QUIZ_COMPLETION_TIER_META
      achievementType = "quiz_completion"
      defaultTitleFn = (val) => `${val} Quizzes Completed`
      defaultDescFn = (val) =>
        `Completed ${val} quiz attempt${val > 1 ? "s" : ""} in total.`
      break
    case "material_completion":
      milestones = MATERIAL_COMPLETION_MILESTONES
      tierMeta = MATERIAL_COMPLETION_TIER_META
      achievementType = "completion"
      defaultTitleFn = (val) => `${val} Materials Completed`
      defaultDescFn = (val) =>
        `Finished ${val} learning material${val > 1 ? "s" : ""}.`
      break
  }

  if (!milestones.includes(payload.metricValue)) {
    return 0
  }

  const meta = tierMeta[payload.metricValue]

  const created = await createAchievementIfMissing({
    userId: payload.userId,
    achievementType,
    title: meta?.title ?? defaultTitleFn(payload.metricValue),
    description: meta?.description ?? defaultDescFn(payload.metricValue),
    metricValue: payload.metricValue,
    thresholdValue: payload.thresholdValue ?? payload.metricValue,
    metricKey: payload.metricKey ?? configType,
    badgeKey:
      payload.badgeKey ??
      `${achievementType}-${String(payload.metricValue).toLowerCase()}`,
    periodType: payload.periodType ?? "lifetime",
    periodStartDate: payload.periodStartDate,
    periodEndDate: payload.periodEndDate,
    subjectId: payload.subjectId,
    topicId: payload.topicId,
    examId: payload.examId,
    dayStreak: payload.dayStreak,
    weeklyAverageScore: payload.weeklyAverageScore,
    profileSnapshot: payload.profileSnapshot,
  })

  return created ? 1 : 0
}

export async function awardQuizScoreMilestones(
  payload: AwardMilestoneParams
): Promise<number> {
  let createdCount = 0

  for (const threshold of QUIZ_SCORE_MILESTONES) {
    if (payload.metricValue < threshold) {
      continue
    }

    const tierMeta = QUIZ_SCORE_TIER_META[threshold]

    const created = await createAchievementIfMissing({
      userId: payload.userId,
      achievementType: "consistency",
      title: tierMeta?.title ?? `Quiz Score ${threshold}% Milestone`,
      description:
        tierMeta?.description ??
        `Reached at least ${threshold}% in a quiz attempt.`,
      metricValue: payload.metricValue,
      thresholdValue: threshold,
      metricKey: payload.metricKey ?? "quiz_score",
      badgeKey: payload.badgeKey ?? `quiz-score-${threshold}`,
      periodType: payload.periodType ?? "instant",
      periodStartDate: payload.periodStartDate,
      periodEndDate: payload.periodEndDate,
      subjectId: payload.subjectId,
      topicId: payload.topicId,
      dayStreak: payload.dayStreak,
      weeklyAverageScore: payload.weeklyAverageScore,
      examId: payload.examId,
      profileSnapshot: payload.profileSnapshot,
    })

    if (created) {
      createdCount += 1
    }
  }

  return createdCount
}
