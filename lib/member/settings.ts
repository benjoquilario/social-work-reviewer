import { Query } from "../appwrite"
import { createRow, findFirst, updateRow } from "../db"
import {
  DEFAULT_USER_SETTINGS,
  resolveUserSettings,
  type UserSettings,
  type UserSettingsDocument,
} from "../schema"

/**
 * ─── Member settings ──────────────────────────────────────────────────────
 *
 * Section 8. One row per member, and **a member with no row is normal** — read
 * the defaults and carry on; the row appears the first time they change
 * something. Nothing here ever blocks on creating it.
 *
 * Every default comes from the schema through `DEFAULT_USER_SETTINGS`. A
 * default hardcoded in the app drifts from the one the CMS enforces, and the
 * drift shows up as a setting that appears not to save.
 */

type SettingsColumns = Omit<UserSettings, "userId" | "updatedAt">

/** Every setting, resolved — no optionals, no nulls, ready to branch on. */
export type MemberSettings = {
  [K in keyof SettingsColumns]-?: NonNullable<SettingsColumns[K]>
}

export type FeedbackTiming = MemberSettings["feedbackTiming"]
export type QuestionSource = MemberSettings["questionSource"]
export type DifficultyFilter = MemberSettings["difficultyFilter"]
export type TimerMode = MemberSettings["timerMode"]
export type FontScale = MemberSettings["fontScale"]
export type SettingsTheme = MemberSettings["theme"]
export type AppLanguage = MemberSettings["language"]

export const DEFAULT_MEMBER_SETTINGS =
  DEFAULT_USER_SETTINGS as unknown as MemberSettings

export function resolveMemberSettings(
  row?: Partial<UserSettings> | null
): MemberSettings {
  return resolveUserSettings(row) as unknown as MemberSettings
}

/**
 * This member's settings, or the defaults when they have never opened the
 * screen.
 *
 * Never throws for a missing row, and never throws for a failed read either —
 * a quiz that cannot start because a preferences lookup timed out is a worse
 * outcome than a quiz that starts with the defaults.
 */
export async function loadMemberSettings(
  userId: string
): Promise<MemberSettings> {
  if (!userId) {
    return DEFAULT_MEMBER_SETTINGS
  }

  try {
    const row = await findFirst("user_settings", [
      Query.equal("userId", userId),
    ])

    return resolveMemberSettings(row)
  } catch (error) {
    console.warn("[settings] Falling back to defaults:", error)
    return DEFAULT_MEMBER_SETTINGS
  }
}

export async function loadMemberSettingsRow(
  userId: string
): Promise<UserSettingsDocument | null> {
  if (!userId) {
    return null
  }

  return findFirst("user_settings", [Query.equal("userId", userId)])
}

/**
 * Writes a partial change and returns the full resolved settings.
 *
 * `userId` is uniquely indexed, so a racing second create is rejected rather
 * than silently producing two rows that disagree — which is exactly what makes
 * a setting look like it did not save. On that conflict we re-read and update
 * the row that won.
 */
export async function saveMemberSettings(
  userId: string,
  patch: Partial<MemberSettings>
): Promise<MemberSettings> {
  if (!userId) {
    return { ...DEFAULT_MEMBER_SETTINGS, ...patch }
  }

  const existing = await loadMemberSettingsRow(userId)

  if (existing) {
    const updated = await updateRow("user_settings", existing.$id, patch)
    return resolveMemberSettings(updated)
  }

  try {
    const created = await createRow(
      "user_settings",
      { ...patch, userId },
      { ownerId: userId }
    )

    return resolveMemberSettings(created)
  } catch (error) {
    const raced = await loadMemberSettingsRow(userId)

    if (!raced) {
      throw error
    }

    const updated = await updateRow("user_settings", raced.$id, patch)
    return resolveMemberSettings(updated)
  }
}

// ─── Derived rules ──────────────────────────────────────────────────────────

/**
 * `feedbackTiming` decides what kind of session this is, and two other
 * settings become meaningless under `at_end`:
 *
 *   instant  mark it right or wrong the moment a choice is tapped. Practice.
 *   on_next  the choice stays changeable until they confirm, then reveal.
 *   at_end   reveal nothing during the run. Mock exam.
 *
 * `autoAdvance` and `autoAdvanceSeconds` only mean something when there is a
 * reveal to advance away from — hide them in the UI when `at_end` is selected.
 */
export function isAutoAdvanceApplicable(settings: MemberSettings) {
  return settings.feedbackTiming !== "at_end"
}

export function isExplanationApplicable(settings: MemberSettings) {
  return settings.showExplanations && settings.feedbackTiming !== "at_end"
}

/** True when the run should behave like a timed mock exam. */
export function isMockExamMode(settings: MemberSettings) {
  return settings.feedbackTiming === "at_end"
}

/** `0` means the whole paper. */
export function resolveSessionLength(
  settings: MemberSettings,
  availableCount: number
) {
  if (settings.questionsPerSession <= 0) {
    return availableCount
  }

  return Math.min(settings.questionsPerSession, availableCount)
}

/**
 * Seconds on the clock, or null when there is no clock.
 *
 * `per_question` is `timerSeconds` per item; `whole_session` is
 * `timerSeconds` for the sitting.
 */
export function resolveTimerSeconds(
  settings: MemberSettings,
  questionCount: number
): number | null {
  switch (settings.timerMode) {
    case "per_question":
      return settings.timerSeconds * Math.max(questionCount, 1)
    case "whole_session":
      return settings.timerSeconds
    case "off":
    default:
      return null
  }
}

export const FEEDBACK_TIMING_LABELS: Record<
  FeedbackTiming,
  { title: string; description: string }
> = {
  instant: {
    title: "Instant",
    description: "Mark each answer as soon as you tap it.",
  },
  on_next: {
    title: "On confirm",
    description: "Change your mind until you move on, then see the answer.",
  },
  at_end: {
    title: "At the end",
    description: "Reveal nothing until you submit. Closest to the real exam.",
  },
}

export const QUESTION_SOURCE_LABELS: Record<
  QuestionSource,
  { title: string; description: string }
> = {
  all: { title: "Everything", description: "The whole bank for this paper." },
  unanswered: {
    title: "Not yet answered",
    description: "Only items you have never seen.",
  },
  incorrect: {
    title: "My mistakes",
    description: "Items you got wrong before — the drill that moves scores.",
  },
  bookmarked: {
    title: "Bookmarked",
    description: "Items you saved for later.",
  },
}

export const DIFFICULTY_FILTER_LABELS: Record<DifficultyFilter, string> = {
  all: "Any difficulty",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
}

export const TIMER_MODE_LABELS: Record<TimerMode, string> = {
  off: "No timer",
  per_question: "Per question",
  whole_session: "Whole session",
}

export const FONT_SCALE_STEPS: Record<FontScale, number> = {
  small: 0.9,
  medium: 1,
  large: 1.15,
  xlarge: 1.3,
}
