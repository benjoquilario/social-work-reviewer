import {
  awardMilestoneIfEligible,
  awardQuizScoreMilestones,
  createAchievementIfMissing,
} from "../progress/milestones"
import {
  GLOBAL_PROGRESS_CATEGORY_ID,
  GLOBAL_PROGRESS_TOPIC_ID,
} from "../progress/constants"
import { recordDailyActivity, touchGlobalActivity } from "../progress/daily-activity"
import { countCompletedSessions } from "../progress/feed"
import { upsertUserProgress } from "../progress/user-progress"
import type { AchievementProfileSnapshot } from "../progress/types"
import { buildSessionCompletedEntry, logActivity } from "./activity-log"
import { finishStudySession, type StudySession } from "./study-session"

/**
 * ─── Finishing a sitting ──────────────────────────────────────────────────
 *
 * One place that closes a session and fans the result out to everything that
 * cares: the session row, the paper's progress row, the member's lifetime
 * totals, the day and week aggregates, the badge checks, and the timeline
 * entry.
 *
 * The order matters. The session row closes **first**, because it is the one
 * write that must land — everything after it is derived and can be recomputed,
 * but a sitting stuck at `in_progress` reappears under "Resume" forever.
 */

export type CompleteSessionInput = {
  userId: string
  session: Pick<
    StudySession,
    "sessionId" | "categoryId" | "questionnaireId" | "label"
  >
  correctCount: number
  answeredCount: number
  questionCount: number
  durationSeconds: number
  lastQuestionOrder: number
  /** SKUs answered in this sitting — never row IDs (gotcha 5). */
  answeredSkus: string[]
  profileSnapshot?: AchievementProfileSnapshot
}

export type CompleteSessionResult = {
  scorePercent: number
  unlockedAchievements: number
  dayStreak: number
}

function toScorePercent(correct: number, total: number) {
  return Math.round((correct / Math.max(total, 1)) * 100)
}

export async function completeStudySession(
  input: CompleteSessionInput
): Promise<CompleteSessionResult> {
  const nowIso = new Date().toISOString()
  const scorePercent = toScorePercent(input.correctCount, input.questionCount)
  const studyMinutes = Math.max(1, Math.round(input.durationSeconds / 60))
  const incorrectCount = Math.max(
    input.answeredCount - input.correctCount,
    0
  )

  await finishStudySession({
    sessionId: input.session.sessionId,
    answeredCount: input.answeredCount,
    correctCount: input.correctCount,
    questionCount: input.questionCount,
    durationSeconds: input.durationSeconds,
    lastQuestionOrder: input.lastQuestionOrder,
  })

  // Everything below is derived. A failure here loses a statistic, not the
  // member's result — which is why it does not take the sitting down with it.
  try {
    await upsertUserProgress({
      userId: input.userId,
      categoryId: input.session.categoryId,
      questionnaireId: input.session.questionnaireId || undefined,
      nowIso,
      averageScore: scorePercent,
      answeredCountDelta: input.answeredCount,
      correctCountDelta: input.correctCount,
      incorrectCountDelta: incorrectCount,
      scoreDelta: input.correctCount,
      totalStudyMinutesDelta: studyMinutes,
      lastQuestionIndex: Math.max(input.questionCount - 1, 0),
      answeredQuestionSkusToAdd: input.answeredSkus,
    })

    const globalProgress = await touchGlobalActivity({
      userId: input.userId,
      nowIso,
      profileSnapshot: input.profileSnapshot,
    })

    const unlockedAchievements = await awardSessionAchievements({
      input,
      scorePercent,
      dayStreak: globalProgress.dayStreak,
      weeklyAverageScore: globalProgress.weeklyAverageScore,
      nowIso,
    })

    if (unlockedAchievements > 0) {
      await Promise.all([
        upsertUserProgress({
          userId: input.userId,
          categoryId: input.session.categoryId,
          questionnaireId: input.session.questionnaireId || undefined,
          nowIso,
          achievementsCountDelta: unlockedAchievements,
        }),
        upsertUserProgress({
          userId: input.userId,
          subjectId: GLOBAL_PROGRESS_CATEGORY_ID,
          topicId: GLOBAL_PROGRESS_TOPIC_ID,
          nowIso,
          achievementsCountDelta: unlockedAchievements,
        }),
      ])
    }

    await recordDailyActivity({
      userId: input.userId,
      nowIso,
      categoryId: input.session.categoryId,
      questionnaireId: input.session.questionnaireId || undefined,
      counters: {
        answeredCount: input.answeredCount,
        correctCount: input.correctCount,
        incorrectCount,
        studyMinutes,
        completedMaterials: 0,
        earnedAchievementsCount:
          unlockedAchievements + (globalProgress.earnedAchievementsCount ?? 0),
        averageScore: scorePercent,
      },
    })

    const entry = buildSessionCompletedEntry({
      label: input.session.label || "a study session",
      scorePercent,
      durationSeconds: input.durationSeconds,
    })

    await logActivity({
      userId: input.userId,
      type: "session_completed",
      title: entry.title,
      detail: entry.detail,
      referenceId: input.session.sessionId,
      occurredAt: nowIso,
    })

    return {
      scorePercent,
      unlockedAchievements,
      dayStreak: globalProgress.dayStreak,
    }
  } catch (error) {
    console.warn("[session] Post-session bookkeeping failed:", error)
    return { scorePercent, unlockedAchievements: 0, dayStreak: 0 }
  }
}

async function awardSessionAchievements(params: {
  input: CompleteSessionInput
  scorePercent: number
  dayStreak: number
  weeklyAverageScore: number
  nowIso: string
}) {
  const { input, scorePercent, dayStreak, weeklyAverageScore, nowIso } = params
  const label = input.session.label || "a study session"
  let unlocked = 0

  const completedSession = await createAchievementIfMissing({
    userId: input.userId,
    achievementType: "quiz_completion",
    title: `Completed ${label}`,
    description: `Finished with a score of ${scorePercent}%.`,
    metricValue: scorePercent,
    metricKey: "session_result",
    badgeKey: `session-${input.session.sessionId}`,
    thresholdValue: 1,
    periodType: "instant",
    dayStreak,
    weeklyAverageScore,
    referenceId: input.session.sessionId,
    profileSnapshot: input.profileSnapshot,
  })

  if (completedSession) {
    unlocked += 1
  }

  if (weeklyAverageScore >= 80) {
    const weeklyBadge = await createAchievementIfMissing({
      userId: input.userId,
      achievementType: "weekly_average",
      title: "Strong Weekly Average",
      description:
        "Maintained a weekly average score of 80% or better across activity.",
      metricValue: weeklyAverageScore,
      thresholdValue: 80,
      metricKey: "weekly_average_score",
      badgeKey: "weekly-average-80",
      periodType: "weekly",
      periodStartDate: nowIso.slice(0, 10),
      dayStreak,
      weeklyAverageScore,
      profileSnapshot: input.profileSnapshot,
    })

    if (weeklyBadge) {
      unlocked += 1
    }
  }

  unlocked += await awardQuizScoreMilestones({
    userId: input.userId,
    metricValue: scorePercent,
    dayStreak,
    weeklyAverageScore,
    referenceId: input.session.categoryId,
    metricKey: "session_score",
    profileSnapshot: input.profileSnapshot,
  })

  const completedSessions = await countCompletedSessions({
    userId: input.userId,
  })

  unlocked += await awardMilestoneIfEligible({
    configType: "quiz_completion",
    payload: {
      userId: input.userId,
      metricValue: completedSessions,
      dayStreak,
      weeklyAverageScore,
      metricKey: "sessions_completed",
      badgeKey: `sessions-${completedSessions}`,
      periodType: "lifetime",
      profileSnapshot: input.profileSnapshot,
    },
  })

  return unlocked
}
