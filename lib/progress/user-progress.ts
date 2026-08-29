import { Query } from "../appwrite"
import { createRow, findFirst, updateRow } from "../db"
import type { UserProgressDocument } from "../schema"
import { GLOBAL_PROGRESS_CATEGORY_ID, GLOBAL_PROGRESS_TOPIC_ID } from "./constants"
import type {
  UpsertUserProgressParams,
  UserProgressUpsertData,
} from "./types"
import {
  buildDeterministicRowId,
  computeNextDayStreak,
  isAppwriteConflictError,
  isSameUtcDay,
  ownedPermissions,
  resolveAverageScoreValues,
  resolveDeterministicRow,
  uniqueStrings,
} from "./utils"

/**
 * ─── user_progress ────────────────────────────────────────────────────────
 *
 * Section 10. Fourteen required columns with no stored default, which is the
 * single most common reason a first write to this table fails — every create
 * here goes through `createRow`, which spreads `newRowDefaults` for exactly
 * that reason.
 *
 * One row per destination. The exam side keys on `categoryId` (plus
 * `questionnaireId` inside a set); the reading side keys on
 * `subjectId` + `topicId`; and one "global" row per member carries the
 * lifetime numbers — streak, active days, total minutes — that belong to no
 * single paper.
 */

function toKeyParts(params: UpsertUserProgressParams) {
  return [
    params.userId,
    params.categoryId ?? "",
    params.questionnaireId ?? "",
    params.subjectId ?? "",
    params.topicId ?? "",
  ]
}

/**
 * The existing row for this destination.
 *
 * Deterministic ID first (current scheme, then the pre-widening one), then a
 * query on the identifying columns. The query is what keeps rows written
 * before deterministic IDs existed reachable at all.
 */
export async function findUserProgressRow(params: UpsertUserProgressParams) {
  const { row } = await resolveDeterministicRow(
    "user_progress",
    "progress",
    toKeyParts(params),
    params.userId
  )

  if (row) {
    return row
  }

  const identityQueries = [
    Query.equal("userId", params.userId),
    ...(params.categoryId
      ? [Query.equal("categoryId", params.categoryId)]
      : []),
    ...(params.questionnaireId
      ? [Query.equal("questionnaireId", params.questionnaireId)]
      : []),
    ...(params.subjectId ? [Query.equal("subjectId", params.subjectId)] : []),
    ...(params.topicId ? [Query.equal("topicId", params.topicId)] : []),
  ]

  return findFirst("user_progress", identityQueries)
}

export function buildUserProgressUpsertData(
  params: UpsertUserProgressParams,
  existing: UserProgressDocument | null,
  nowIso: string
): UserProgressUpsertData {
  const answeredCount = Math.max(
    0,
    (existing?.answeredCount ?? 0) + (params.answeredCountDelta ?? 0)
  )
  const correctCount = Math.max(
    0,
    (existing?.correctCount ?? 0) + (params.correctCountDelta ?? 0)
  )
  const incorrectCount = Math.max(
    0,
    (existing?.incorrectCount ?? 0) + (params.incorrectCountDelta ?? 0)
  )
  const completedMaterials = Math.max(
    0,
    (existing?.completedMaterials ?? 0) + (params.completedMaterialsDelta ?? 0)
  )
  const score = Math.max(0, (existing?.score ?? 0) + (params.scoreDelta ?? 0))
  const totalStudyMinutes = Math.max(
    0,
    (existing?.totalStudyMinutes ?? 0) + (params.totalStudyMinutesDelta ?? 0)
  )
  const achievementsCount = Math.max(
    0,
    (existing?.achievementsCount ?? 0) + (params.achievementsCountDelta ?? 0)
  )
  const dayStreak = computeNextDayStreak(
    existing?.dayStreak ?? 0,
    existing?.lastActiveAt,
    nowIso
  )
  const activeDaysCount = isSameUtcDay(existing?.lastActiveAt, nowIso)
    ? (existing?.activeDaysCount ?? 0)
    : (existing?.activeDaysCount ?? 0) + 1
  const { averageScore, weeklyAverageScore } = resolveAverageScoreValues(
    existing,
    params.averageScore
  )
  // SKUs, not row IDs — the column name is historical (gotcha 5).
  const answeredQuestionIds = uniqueStrings([
    ...(existing?.answeredQuestionIds ?? []),
    ...(params.answeredQuestionSkusToAdd ?? []),
  ])
  const accuracyRate =
    answeredCount > 0
      ? Math.round((correctCount / answeredCount) * 10000) / 100
      : (existing?.accuracyRate ?? 0)

  return {
    userId: params.userId,
    categoryId: params.categoryId ?? existing?.categoryId ?? null,
    questionnaireId: params.questionnaireId ?? existing?.questionnaireId ?? null,
    subjectId: params.subjectId ?? existing?.subjectId ?? null,
    topicId: params.topicId ?? existing?.topicId ?? null,
    completedMaterials,
    averageScore,
    lastStudied: nowIso,
    lastQuestionId: params.lastQuestionId ?? existing?.lastQuestionId ?? null,
    lastQuestionIndex: Math.max(
      params.lastQuestionIndex ?? existing?.lastQuestionIndex ?? 0,
      0
    ),
    score,
    answeredCount,
    correctCount,
    incorrectCount,
    accuracyRate,
    answeredQuestionIds,
    dayStreak,
    weeklyAverageScore,
    lastActiveAt: nowIso,
    totalStudyMinutes,
    activeDaysCount,
    achievementsCount,
  }
}

export function buildUserProgressRowId(params: UpsertUserProgressParams) {
  return buildDeterministicRowId("progress", toKeyParts(params))
}

export async function upsertUserProgress(params: UpsertUserProgressParams) {
  const nowIso = params.nowIso ?? new Date().toISOString()
  const existing = await findUserProgressRow(params)
  const data = buildUserProgressUpsertData(params, existing, nowIso)

  if (existing) {
    await updateRow("user_progress", existing.$id, data)
    return { ...existing, ...data }
  }

  try {
    const created = await createRow("user_progress", data, {
      rowId: buildUserProgressRowId(params),
      ownerId: params.userId,
    })

    return created
  } catch (error) {
    if (!isAppwriteConflictError(error)) {
      throw error
    }

    // Two writes raced. Re-read and fold this delta into whichever won.
    const winner = await findUserProgressRow(params)

    if (!winner) {
      throw error
    }

    const merged = buildUserProgressUpsertData(params, winner, nowIso)
    await updateRow("user_progress", winner.$id, merged)

    return { ...winner, ...merged }
  }
}

/** The one row per member that carries streak and lifetime totals. */
export function globalProgressParams(userId: string, nowIso?: string) {
  return {
    userId,
    subjectId: GLOBAL_PROGRESS_CATEGORY_ID,
    topicId: GLOBAL_PROGRESS_TOPIC_ID,
    nowIso,
  } satisfies UpsertUserProgressParams
}

export async function getGlobalProgress(userId: string) {
  return findUserProgressRow(globalProgressParams(userId))
}
