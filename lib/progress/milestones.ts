import { COLLECTIONS, DB_ID, ID, Query, tablesDB } from "../appwrite"
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
  profileSnapshot?: AchievementProfileSnapshot
}) {
  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_ACHIEVEMENTS,
    queries: [
      Query.equal("userId", params.userId),
      Query.equal("achievementType", params.achievementType),
      Query.equal("title", params.title),
      Query.limit(25),
    ],
  })

  const existingRows = rows as unknown as LearningAchievementDocument[]
  const alreadyExists = existingRows.some((row) => {
    return (
      (row.examId ?? null) === (params.examId ?? null) &&
      (row.learningMaterialId ?? null) === (params.learningMaterialId ?? null)
    )
  })

  if (alreadyExists) {
    return
  }

  const nowIso = new Date().toISOString()

  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.LEARNING_ACHIEVEMENTS,
    rowId: ID.unique(),
    data: {
      userId: params.userId,
      fullName: params.profileSnapshot?.fullName ?? null,
      schoolName: params.profileSnapshot?.schoolName ?? null,
      reviewType: params.profileSnapshot?.reviewType ?? null,
      avatarUrl: params.profileSnapshot?.avatarUrl ?? null,
      subjectId: params.subjectId ?? null,
      topicId: params.topicId ?? null,
      learningMaterialId: params.learningMaterialId ?? null,
      examId: params.examId ?? null,
      achievementType: params.achievementType,
      title: params.title,
      description: params.description,
      metricValue: params.metricValue,
      dayStreak: params.dayStreak,
      weeklyAverageScore: params.weeklyAverageScore,
      earnedAt: nowIso,
      createdAt: nowIso,
    },
  })
}

export async function awardMilestoneIfEligible(params: {
  configType: "streak" | "quiz_completion" | "material_completion"
  payload: AwardMilestoneParams
}) {
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
    return
  }

  const meta = tierMeta[payload.metricValue]

  await createAchievementIfMissing({
    userId: payload.userId,
    achievementType,
    title: meta?.title ?? defaultTitleFn(payload.metricValue),
    description: meta?.description ?? defaultDescFn(payload.metricValue),
    metricValue: payload.metricValue,
    dayStreak: payload.dayStreak,
    weeklyAverageScore: payload.weeklyAverageScore,
    profileSnapshot: payload.profileSnapshot,
  })
}

export async function awardQuizScoreMilestones(payload: AwardMilestoneParams) {
  for (const threshold of QUIZ_SCORE_MILESTONES) {
    if (payload.metricValue < threshold) {
      continue
    }

    const tierMeta = QUIZ_SCORE_TIER_META[threshold]

    await createAchievementIfMissing({
      userId: payload.userId,
      achievementType: "consistency",
      title: tierMeta?.title ?? `Quiz Score ${threshold}% Milestone`,
      description:
        tierMeta?.description ??
        `Reached at least ${threshold}% in a quiz attempt.`,
      metricValue: payload.metricValue,
      dayStreak: payload.dayStreak,
      weeklyAverageScore: payload.weeklyAverageScore,
      examId: payload.examId,
      profileSnapshot: payload.profileSnapshot,
    })
  }
}
