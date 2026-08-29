import { Query } from "../appwrite"
import { createRow, listAll, updateRow } from "../db"
import type {
  UserDailyActivityDocument,
  UserWeeklyReportDocument,
} from "../schema"
import { awardMilestoneIfEligible } from "./milestones"
import type {
  AchievementProfileSnapshot,
  RecordDailyActivityParams,
} from "./types"
import { getGlobalProgress, globalProgressParams, upsertUserProgress } from "./user-progress"
import {
  getWeekEndDateKey,
  getWeekStartDateKey,
  ownedPermissions,
  resolveDeterministicRow,
  sumNumbers,
  toIsoDateKey,
} from "./utils"

/**
 * ─── Aggregates ───────────────────────────────────────────────────────────
 *
 * `user_daily_activity` is one row per member per active day, and
 * `user_weekly_reports` is rebuilt from those rows rather than accumulated —
 * an accumulated total drifts the first time a write is retried, and a rebuilt
 * one cannot.
 *
 * `activityDate`, `weekStartDate` and `weekEndDate` are strings. Keep them
 * `YYYY-MM-DD` and zero-padded or the range queries stop sorting.
 */

/** Bumps the global row and awards a streak badge when one is due. */
export async function touchGlobalActivity(params: {
  userId: string
  nowIso?: string
  profileSnapshot?: AchievementProfileSnapshot
}) {
  const progress = await upsertUserProgress(
    globalProgressParams(params.userId, params.nowIso)
  )

  const earnedAchievementsCount = await awardMilestoneIfEligible({
    configType: "streak",
    payload: {
      userId: params.userId,
      metricValue: progress.dayStreak,
      dayStreak: progress.dayStreak,
      weeklyAverageScore: progress.weeklyAverageScore,
      metricKey: "study_streak",
      badgeKey: `streak-${progress.dayStreak}`,
      periodType: "lifetime",
      profileSnapshot: params.profileSnapshot,
    },
  })

  if (earnedAchievementsCount > 0) {
    const updated = await upsertUserProgress({
      ...globalProgressParams(params.userId, params.nowIso),
      achievementsCountDelta: earnedAchievementsCount,
    })

    return { ...updated, earnedAchievementsCount }
  }

  return { ...progress, earnedAchievementsCount }
}

async function upsertUserDailyActivity(
  params: RecordDailyActivityParams
): Promise<UserDailyActivityDocument> {
  const nowIso = params.nowIso ?? new Date().toISOString()
  const activityDate = toIsoDateKey(nowIso)
  const weekStartDate = getWeekStartDateKey(nowIso)

  const { row: existing, rowId } = await resolveDeterministicRow(
    "user_daily_activity",
    "daily",
    [params.userId, activityDate],
    params.userId
  )

  const answeredCount = Math.max(
    0,
    (existing?.answeredCount ?? 0) + params.counters.answeredCount
  )
  const correctCount = Math.max(
    0,
    (existing?.correctCount ?? 0) + params.counters.correctCount
  )
  const incorrectCount = Math.max(
    0,
    (existing?.incorrectCount ?? 0) + params.counters.incorrectCount
  )
  const accuracyRate =
    answeredCount > 0
      ? Math.round((correctCount / answeredCount) * 10000) / 100
      : 0
  const averageScore =
    typeof params.counters.averageScore === "number"
      ? params.counters.averageScore
      : accuracyRate

  const data = {
    userId: params.userId,
    activityDate,
    weekStartDate,
    categoryId: params.categoryId ?? existing?.categoryId ?? "",
    questionnaireId: params.questionnaireId ?? existing?.questionnaireId ?? "",
    subjectId: params.subjectId ?? existing?.subjectId ?? "",
    topicId: params.topicId ?? existing?.topicId ?? "",
    answeredCount,
    correctCount,
    incorrectCount,
    accuracyRate,
    averageScore,
    studyMinutes: Math.max(
      0,
      (existing?.studyMinutes ?? 0) + params.counters.studyMinutes
    ),
    completedMaterials: Math.max(
      0,
      (existing?.completedMaterials ?? 0) + params.counters.completedMaterials
    ),
    earnedAchievementsCount: Math.max(
      0,
      (existing?.earnedAchievementsCount ?? 0) +
        params.counters.earnedAchievementsCount
    ),
    firstAnsweredAt:
      existing?.firstAnsweredAt ??
      (params.counters.answeredCount > 0 ? nowIso : undefined),
    lastAnsweredAt:
      params.counters.answeredCount > 0
        ? nowIso
        : (existing?.lastAnsweredAt ?? undefined),
    createdAt: existing?.createdAt ?? nowIso,
  }

  if (existing) {
    await updateRow("user_daily_activity", existing.$id, data)
    return { ...existing, ...data }
  }

  return createRow("user_daily_activity", data, {
    rowId,
    ownerId: params.userId,
  })
}

/**
 * Recomputes a week from its days.
 *
 * A week is at most seven rows, so this is cheap and always right — where an
 * incremented total would silently double-count a retried write.
 */
export async function rebuildUserWeeklyReport(params: {
  userId: string
  weekStartDate: string
  nowIso?: string
}): Promise<UserWeeklyReportDocument> {
  const nowIso = params.nowIso ?? new Date().toISOString()
  const weekEndDate = getWeekEndDateKey(params.weekStartDate)

  const [dailyRows, globalProgress] = await Promise.all([
    listAll(
      "user_daily_activity",
      [
        Query.equal("userId", params.userId),
        Query.equal("weekStartDate", params.weekStartDate),
      ],
      { pageSize: 10, label: "week days" }
    ),
    getGlobalProgress(params.userId),
  ])

  const answeredCount = sumNumbers(dailyRows.map((row) => row.answeredCount))
  const correctCount = sumNumbers(dailyRows.map((row) => row.correctCount))
  const incorrectCount = sumNumbers(dailyRows.map((row) => row.incorrectCount))
  const accuracyRate =
    answeredCount > 0
      ? Math.round((correctCount / answeredCount) * 10000) / 100
      : 0

  const data = {
    userId: params.userId,
    weekStartDate: params.weekStartDate,
    weekEndDate,
    answeredCount,
    correctCount,
    incorrectCount,
    accuracyRate,
    averageScore: accuracyRate,
    studyMinutes: sumNumbers(dailyRows.map((row) => row.studyMinutes)),
    activeDaysCount: dailyRows.filter(
      (row) =>
        (row.answeredCount ?? 0) > 0 ||
        (row.studyMinutes ?? 0) > 0 ||
        (row.completedMaterials ?? 0) > 0
    ).length,
    completedMaterials: sumNumbers(
      dailyRows.map((row) => row.completedMaterials)
    ),
    earnedAchievementsCount: sumNumbers(
      dailyRows.map((row) => row.earnedAchievementsCount)
    ),
    dayStreak: globalProgress?.dayStreak ?? 0,
    generatedAt: nowIso,
  }

  const { row: existing, rowId } = await resolveDeterministicRow(
    "user_weekly_reports",
    "weekly",
    [params.userId, params.weekStartDate],
    params.userId
  )

  if (existing) {
    await updateRow("user_weekly_reports", existing.$id, data)
    return { ...existing, ...data }
  }

  return createRow("user_weekly_reports", data, {
    rowId,
    ownerId: params.userId,
  })
}

export async function recordDailyActivity(params: RecordDailyActivityParams) {
  const nowIso = params.nowIso ?? new Date().toISOString()
  const dailyRow = await upsertUserDailyActivity({ ...params, nowIso })
  const weeklyReport = await rebuildUserWeeklyReport({
    userId: params.userId,
    weekStartDate: dailyRow.weekStartDate,
    nowIso,
  })

  return { dailyRow, weeklyReport }
}

export { ownedPermissions }
