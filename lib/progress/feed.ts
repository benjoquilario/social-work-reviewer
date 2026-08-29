import { Query } from "../appwrite"
import { countRows, listAll, listPage } from "../db"
import {
  listRecentSessions,
  toStudySession,
  type StudySession,
} from "../session/study-session"
import { ACTIVITY_QUERY_LIMIT, HISTORY_QUERY_LIMIT } from "./constants"
import type {
  ActivityFeedOptions,
  ActivitySession,
  UserActivityFeed,
} from "./types"
import { getGlobalProgress } from "./user-progress"
import {
  clampNumber,
  fetchEntityTitleMap,
  mapLearningHistoryRowsToActivityItems,
  uniqueStrings,
} from "./utils"

/**
 * ─── The activity feed ────────────────────────────────────────────────────
 *
 * What the home and profile screens read.
 *
 * Sittings come from `study_sessions` now. They used to be reconstructed by
 * grouping `user_answers` rows, which meant a paged read could deliver a
 * half-loaded session: `answeredCount` came out below `questionCount`, and a
 * finished exam reappeared under "Resume answering" forever.
 */

export function toActivitySession(session: StudySession): ActivitySession {
  const denominator = Math.max(session.questionCount, 1)

  return {
    id: session.sessionId,
    sessionId: session.sessionId,
    categoryId: session.categoryId,
    questionnaireId: session.questionnaireId,
    title: session.label || "Study session",
    correctCount: session.correctCount,
    questionCount: session.questionCount,
    answeredCount: session.answeredCount,
    percent:
      session.scorePercent > 0
        ? Math.round(session.scorePercent)
        : Math.round((session.correctCount / denominator) * 100),
    durationSeconds: session.durationSeconds,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    lastQuestionOrder: session.lastQuestionOrder,
  }
}

export async function countCompletedMaterials(payload: { userId: string }) {
  const rows = await listAll(
    "learning_history",
    [Query.equal("userId", payload.userId), Query.equal("status", "completed")],
    { label: "completed materials", maxRows: 2000 }
  )

  return uniqueStrings(rows.map((row) => row.learningMaterialId)).length
}

export function countCompletedSessions(payload: { userId: string }) {
  return countRows("study_sessions", [
    Query.equal("userId", payload.userId),
    Query.equal("status", "completed"),
  ])
}

export async function getUserActivityFeed(
  payload: { userId: string },
  options: ActivityFeedOptions = {}
): Promise<UserActivityFeed> {
  const userId = payload.userId
  const sessionsLimit = Math.floor(
    clampNumber(options.sessionsLimit ?? 8, 1, ACTIVITY_QUERY_LIMIT)
  )
  const learningHistoryLimit = Math.floor(
    clampNumber(options.learningHistoryLimit ?? 8, 1, HISTORY_QUERY_LIMIT)
  )
  const achievementsLimit = Math.floor(
    clampNumber(options.achievementsLimit ?? 8, 1, ACTIVITY_QUERY_LIMIT)
  )

  const [
    globalProgress,
    sessions,
    sessionTotal,
    historyResult,
    achievementsResult,
  ] = await Promise.all([
    getGlobalProgress(userId),
    listRecentSessions({ userId, limit: sessionsLimit }),
    countRows("study_sessions", [Query.equal("userId", userId)]),
    listPage(
      "learning_history",
      [Query.equal("userId", userId), Query.orderDesc("lastAccessedAt")],
      learningHistoryLimit
    ),
    listPage(
      "learning_achievements",
      [Query.equal("userId", userId), Query.orderDesc("earnedAt")],
      achievementsLimit
    ),
  ])

  const [completedMaterials, completedSessions, materialTitleMap] =
    await Promise.all([
      countCompletedMaterials({ userId }),
      countCompletedSessions({ userId }),
      fetchEntityTitleMap({
        tableKey: "learning_materials",
        entityIds: uniqueStrings(
          historyResult.rows.map((row) => row.learningMaterialId)
        ),
        fallbackPrefix: "Material",
      }),
    ])

  const activitySessions = sessions.map(toActivitySession)
  const finished = activitySessions.filter(
    (session) => session.status === "completed"
  )

  const averageSessionScore =
    finished.length === 0
      ? 0
      : Math.round(
          finished.reduce((sum, session) => sum + session.percent, 0) /
            finished.length
        )

  return {
    // `hasMore` comes from the server's `total`, not from the page length.
    // Testing `rows.length > limit` dead-ends the moment the +1 row is clipped
    // by a per-request ceiling: the query returns exactly `limit`, the test is
    // false, and "Load more" vanishes with rows still unread.
    sessionsHasMore: sessionTotal > activitySessions.length,
    learningHistoryHasMore:
      (historyResult.total ?? historyResult.rows.length) >
      historyResult.rows.length,
    achievementsHasMore:
      (achievementsResult.total ?? achievementsResult.rows.length) >
      achievementsResult.rows.length,

    dayStreak: globalProgress?.dayStreak ?? 0,
    weeklyAverageScore: globalProgress?.weeklyAverageScore ?? 0,
    lastActiveAt: globalProgress?.lastActiveAt ?? null,
    completedMaterials,
    completedSessions,
    averageSessionScore,

    sessions: activitySessions,
    learningHistory: mapLearningHistoryRowsToActivityItems(
      historyResult.rows,
      materialTitleMap
    ),
    achievements: achievementsResult.rows.map((row) => ({
      id: row.$id,
      achievementType: row.achievementType,
      title: row.title,
      description: row.description ?? null,
      metricValue: row.metricValue,
      dayStreak: row.dayStreak,
      weeklyAverageScore: row.weeklyAverageScore,
      earnedAt: row.earnedAt,
    })),
  }
}

export { toStudySession }
