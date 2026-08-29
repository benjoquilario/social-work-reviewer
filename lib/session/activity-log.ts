import { Query } from "../appwrite"
import { createRow, listPage } from "../db"
import type { ActivityType, UserActivityDocument } from "../schema"

/**
 * ─── The timeline ─────────────────────────────────────────────────────────
 *
 * Section 7. One row per **notable** event — not per answer. Writing one per
 * question would put hundreds of thousands of rows in a table meant to be read.
 *
 * `title` is written to be shown directly. Do not rebuild the sentence from
 * `type` at render time, or shipping new copy silently rewords what somebody
 * did last year.
 */

/**
 * The events the app writes.
 *
 * Subscription and payment events are the **server's** — they happen when
 * Google reports a purchase or a renewal, or when a sweep expires a period.
 * `payment_submitted` and `payment_confirmed` are two ends of that flow, not
 * something to write when somebody taps Buy.
 */
export const APP_ACTIVITY_TYPES = [
  "signed_up",
  "signed_in",
  "session_completed",
  "material_completed",
  "achievement_earned",
  "post_created",
] as const satisfies readonly ActivityType[]

export type AppActivityType = (typeof APP_ACTIVITY_TYPES)[number]

export type ActivityEntry = {
  id: string
  type: ActivityType
  title: string
  detail: string | null
  /** The row this timeline entry can be tapped through to. */
  referenceId: string | null
  occurredAt: string
}

export function toActivityEntry(row: UserActivityDocument): ActivityEntry {
  return {
    id: row.$id,
    type: row.type,
    title: row.title,
    detail: row.detail?.trim() || null,
    referenceId: row.referenceId?.trim() || null,
    occurredAt: row.occurredAt,
  }
}

export type LogActivityInput = {
  userId: string
  type: AppActivityType
  /** Shown as written. */
  title: string
  detail?: string
  referenceId?: string
  occurredAt?: string
}

/**
 * Best-effort by design. A timeline entry that fails to write must never take
 * down the thing it was describing.
 */
export async function logActivity(input: LogActivityInput) {
  try {
    await createRow(
      "user_activity_log",
      {
        userId: input.userId,
        type: input.type,
        title: input.title,
        detail: input.detail ?? "",
        referenceId: input.referenceId ?? "",
        occurredAt: input.occurredAt ?? new Date().toISOString(),
      },
      { ownerId: input.userId }
    )
  } catch (error) {
    console.warn("[activity] Could not write a timeline entry:", error)
  }
}

export async function listActivity(params: {
  userId: string
  limit?: number
  type?: ActivityType
}): Promise<ActivityEntry[]> {
  const { rows } = await listPage(
    "user_activity_log",
    [
      Query.equal("userId", params.userId),
      ...(params.type ? [Query.equal("type", params.type)] : []),
      Query.orderDesc("occurredAt"),
    ],
    params.limit ?? 50
  )

  return rows.map(toActivityEntry)
}

// ─── Copy ───────────────────────────────────────────────────────────────────

/** Minutes, rendered the way a person would say it. */
function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60)

  if (minutes < 1) {
    return "under a minute"
  }

  return `${minutes} minute${minutes === 1 ? "" : "s"}`
}

export function buildSessionCompletedEntry(params: {
  label: string
  scorePercent: number
  durationSeconds: number
}) {
  return {
    title: `Completed ${params.label}`,
    detail: `Scored ${Math.round(params.scorePercent)}% in ${formatDuration(
      params.durationSeconds
    )}`,
  }
}

export function buildMaterialCompletedEntry(materialTitle: string) {
  return {
    title: `Finished reading ${materialTitle}`,
    detail: null,
  }
}
