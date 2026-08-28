export const GLOBAL_PROGRESS_SUBJECT_ID = "__global__"
export const GLOBAL_PROGRESS_TOPIC_ID = "__activity__"

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]
export const QUIZ_SCORE_MILESTONES = [70, 85, 100]
export const MATERIAL_COMPLETION_MILESTONES = [1, 3, 5, 10, 25, 50]
export const QUIZ_COMPLETION_MILESTONES = [1, 5, 10, 25, 50]

/**
 * Per-request ceilings for the activity lists.
 *
 * These must stay >= the highest limit a caller can ask for (every call site
 * clamps its own limit to 100). When a ceiling sat below that clamp — 30 and 50
 * — the query silently returned fewer rows than requested and "Load more"
 * dead-ended partway through the list.
 */
export const ACTIVITY_QUERY_LIMIT = 100
export const HISTORY_QUERY_LIMIT = 100

export const STREAK_TIER_META: Record<number, { title: string; description: string }> = {
  3: {
    title: "Ignition Scout",
    description: "Lit a 3-day streak and started momentum.",
  },
  7: {
    title: "Weekly Flame",
    description: "Kept a full 7-day learning streak alive.",
  },
  14: {
    title: "Fortnight Focus",
    description: "Maintained focus for 14 straight days.",
  },
  30: {
    title: "Monthly Momentum",
    description: "Completed 30 consecutive active study days.",
  },
  60: {
    title: "Discipline Vanguard",
    description: "Sustained a 60-day streak of consistent study.",
  },
  100: {
    title: "Century Scholar",
    description: "Reached an elite 100-day study streak.",
  },
}

export const QUIZ_SCORE_TIER_META: Record<number, { title: string; description: string }> = {
  70: {
    title: "Bronze Breakthrough",
    description: "Scored 70% or higher on a quiz attempt.",
  },
  85: {
    title: "Silver Strategist",
    description: "Scored 85% or higher with strong precision.",
  },
  100: {
    title: "Perfect Ace",
    description: "Scored a perfect 100% on a quiz attempt.",
  },
}

export const QUIZ_COMPLETION_TIER_META: Record<number, { title: string; description: string }> = {
  1: {
    title: "First Quiz Cleared",
    description: "Completed your first quiz attempt.",
  },
  5: {
    title: "Quiz Cadet",
    description: "Completed 5 total quizzes.",
  },
  10: {
    title: "Quiz Specialist",
    description: "Completed 10 total quizzes.",
  },
  25: {
    title: "Exam Pathfinder",
    description: "Completed 25 total quizzes.",
  },
  50: {
    title: "Grand Examiner",
    description: "Completed 50 total quizzes.",
  },
}

export const MATERIAL_COMPLETION_TIER_META: Record<number, { title: string; description: string }> = {
  1: {
    title: "First Lesson Complete",
    description: "Finished your first learning material.",
  },
  3: {
    title: "Lesson Explorer",
    description: "Completed 3 learning materials.",
  },
  5: {
    title: "Knowledge Builder",
    description: "Completed 5 learning materials.",
  },
  10: {
    title: "Study Architect",
    description: "Completed 10 learning materials.",
  },
  25: {
    title: "Curriculum Conqueror",
    description: "Completed 25 learning materials.",
  },
  50: {
    title: "Master of Modules",
    description: "Completed 50 learning materials.",
  },
}
