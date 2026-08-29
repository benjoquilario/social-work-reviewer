import { createRow } from "../db"
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
import { isAppwriteConflictError, resolveDeterministicRow } from "./utils"

function buildAchievementKeyParts(params: {
  userId: string
  achievementType: LearningAchievementDocument["achievementType"]
  title: string
  learningMaterialId?: string
  referenceId?: string
  badgeKey?: string
  periodStartDate?: string
}) {
  return [
    params.userId,
    params.achievementType,
    params.title,
    params.badgeKey ?? "",
    params.referenceId ?? "",
    params.learningMaterialId ?? "",
    params.periodStartDate ?? "",
  ]
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
  referenceId?: string
  badgeKey?: string
  metricKey?: string
  thresholdValue?: number
  periodType?: LearningAchievementDocument["periodType"]
  periodStartDate?: string
  periodEndDate?: string
  profileSnapshot?: AchievementProfileSnapshot
}): Promise<boolean> {
  const nowIso = new Date().toISOString()

  // Look before writing. A create-and-swallow-409 would no longer recognise an
  // achievement stored under the pre-widening row ID, and would award the badge
  // a second time under the new ID.
  const { row: existing, rowId } = await resolveDeterministicRow(
    "learning_achievements",
    "achieve",
    buildAchievementKeyParts(params),
    params.userId
  )

  if (existing) {
    return false
  }

  try {
    // `title` is shown as written, like `user_activity_log.title`. The
    // wording is decided here and stored — rebuilding the sentence from
    // `achievementType` at render time silently rewords old badges the next
    // time the copy ships.
    await createRow(
      "learning_achievements",
      {
        userId: params.userId,
        fullName: params.profileSnapshot?.fullName ?? "",
        schoolName: params.profileSnapshot?.schoolName ?? "",
        reviewType: params.profileSnapshot?.reviewType ?? "",
        avatarUrl: params.profileSnapshot?.avatarUrl ?? "",
        subjectId: params.subjectId ?? "",
        topicId: params.topicId ?? "",
        learningMaterialId: params.learningMaterialId ?? "",
        achievementType: params.achievementType,
        badgeKey: params.badgeKey ?? "",
        title: params.title,
        description: params.description,
        metricValue: params.metricValue,
        thresholdValue: params.thresholdValue ?? params.metricValue,
        metricKey: params.metricKey ?? "",
        periodType: params.periodType ?? "instant",
        periodStartDate: params.periodStartDate ?? "",
        periodEndDate: params.periodEndDate ?? "",
        dayStreak: params.dayStreak,
        weeklyAverageScore: params.weeklyAverageScore,
        earnedAt: nowIso,
        createdAt: nowIso,
      },
      { rowId, ownerId: params.userId }
    )
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
    referenceId: payload.referenceId,
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
      referenceId: payload.referenceId,
      profileSnapshot: payload.profileSnapshot,
    })

    if (created) {
      createdCount += 1
    }
  }

  return createdCount
}
