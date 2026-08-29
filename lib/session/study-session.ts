import { ID, Query } from "../appwrite"
import {
  createRow,
  findFirst,
  getRowSafe,
  listAll,
  listPage,
  updateRow,
} from "../db"
import type { StudySessionDocument } from "../schema"

/**
 * ─── One sitting ──────────────────────────────────────────────────────────
 *
 * Section 7. A row is written when a sitting starts and updated as it goes,
 * and the same `sessionId` goes on every `user_answers` row from that sitting —
 * that is the only thing tying them together.
 *
 * Before this existed the app reconstructed sittings by grouping answer rows,
 * which meant a paged read could hand back a half-loaded session and report a
 * finished exam as still in progress.
 *
 * `(userId, sessionId)` is unique, so a retried start cannot split one sitting
 * into two rows. We use the session ID as the row ID as well, which makes every
 * later update a direct write with no lookup.
 */

export type StudyMode = NonNullable<StudySessionDocument["mode"]>
export type StudyStatus = StudySessionDocument["status"]

export type StudySession = {
  sessionId: string
  userId: string
  categoryId: string
  /** "" when the sitting is over loose questions rather than a set. */
  questionnaireId: string
  /** Copied at the start, so a later rename does not rewrite old history. */
  label: string
  mode: StudyMode
  status: StudyStatus
  startedAt: string
  endedAt: string | null
  durationSeconds: number
  questionCount: number
  answeredCount: number
  correctCount: number
  scorePercent: number
  /** The stored `order` of the last item seen — not an array position. */
  lastQuestionOrder: number
}

export function toStudySession(row: StudySessionDocument): StudySession {
  return {
    sessionId: row.sessionId,
    userId: row.userId,
    categoryId: row.categoryId ?? "",
    questionnaireId: row.questionnaireId ?? "",
    label: row.label?.trim() ?? "",
    mode: row.mode ?? "quiz",
    status: row.status,
    startedAt: row.startedAt,
    endedAt: row.endedAt ?? null,
    durationSeconds: row.durationSeconds ?? 0,
    questionCount: row.questionCount ?? 0,
    answeredCount: row.answeredCount ?? 0,
    correctCount: row.correctCount ?? 0,
    scorePercent: row.scorePercent ?? 0,
    lastQuestionOrder: row.lastQuestionOrder ?? 0,
  }
}

export type StartSessionInput = {
  userId: string
  categoryId: string
  /** Omit or pass "" for a category with no sets. */
  questionnaireId?: string
  /** What the member will see in their history: "Social Work Foundation - Set A". */
  label: string
  mode: StudyMode
  questionCount: number
}

/**
 * Opens a sitting.
 *
 * `label` is copied now rather than resolved at render time, so renaming a set
 * in the CMS next month does not rewrite what somebody did last week.
 */
export async function startStudySession(
  input: StartSessionInput
): Promise<StudySession> {
  const sessionId = ID.unique()

  const row = await createRow(
    "study_sessions",
    {
      userId: input.userId,
      sessionId,
      categoryId: input.categoryId,
      questionnaireId: input.questionnaireId ?? "",
      label: input.label,
      mode: input.mode,
      status: "in_progress",
      startedAt: new Date().toISOString(),
      questionCount: input.questionCount,
      answeredCount: 0,
      correctCount: 0,
      scorePercent: 0,
      lastQuestionOrder: 0,
    },
    { rowId: sessionId, ownerId: input.userId }
  )

  return toStudySession(row)
}

export type SessionProgressInput = {
  sessionId: string
  /** The stored `order` of the item they are on. */
  lastQuestionOrder: number
  answeredCount: number
  correctCount: number
  durationSeconds: number
  /**
   * The run length. Written on the first checkpoint rather than at start,
   * because the pool is only built once the paper and the member's filters
   * have both resolved — and "3 of 0 answered" on the resume card is what
   * happens when it never arrives.
   */
  questionCount?: number
}

/**
 * Checkpoint mid-sitting. Best-effort by design: a failed checkpoint must not
 * interrupt somebody answering questions, and the next one supersedes it.
 */
export async function saveSessionProgress(input: SessionProgressInput) {
  try {
    await updateRow("study_sessions", input.sessionId, {
      lastQuestionOrder: input.lastQuestionOrder,
      answeredCount: input.answeredCount,
      correctCount: input.correctCount,
      durationSeconds: input.durationSeconds,
      ...(input.questionCount !== undefined
        ? { questionCount: input.questionCount }
        : {}),
    })
  } catch (error) {
    console.warn("[session] Checkpoint failed:", error)
  }
}

export type FinishSessionInput = {
  sessionId: string
  answeredCount: number
  correctCount: number
  questionCount: number
  durationSeconds: number
  lastQuestionOrder: number
}

export async function finishStudySession(
  input: FinishSessionInput
): Promise<StudySession | null> {
  const denominator = Math.max(input.questionCount, 1)
  const scorePercent =
    Math.round((input.correctCount / denominator) * 1000) / 10

  const row = await updateRow("study_sessions", input.sessionId, {
    status: "completed",
    endedAt: new Date().toISOString(),
    durationSeconds: input.durationSeconds,
    answeredCount: input.answeredCount,
    correctCount: input.correctCount,
    questionCount: input.questionCount,
    scorePercent,
    lastQuestionOrder: input.lastQuestionOrder,
  })

  return toStudySession(row)
}

export async function abandonStudySession(sessionId: string) {
  try {
    await updateRow("study_sessions", sessionId, {
      status: "abandoned",
      endedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.warn("[session] Could not mark the sitting abandoned:", error)
  }
}

export async function getStudySession(
  sessionId: string
): Promise<StudySession | null> {
  const row = await getRowSafe("study_sessions", sessionId)
  return row ? toStudySession(row) : null
}

/**
 * "Continue where you left off".
 *
 * A row left `in_progress` with `lastQuestionOrder` set is the whole feature.
 * Backed by `idx_session_user_started`.
 */
export async function findResumableSession(params: {
  userId: string
  categoryId?: string
  questionnaireId?: string
}): Promise<StudySession | null> {
  const row = await findFirst("study_sessions", [
    Query.equal("userId", params.userId),
    Query.equal("status", "in_progress"),
    ...(params.categoryId ? [Query.equal("categoryId", params.categoryId)] : []),
    ...(params.questionnaireId !== undefined
      ? [Query.equal("questionnaireId", params.questionnaireId)]
      : []),
    Query.orderDesc("startedAt"),
  ])

  return row ? toStudySession(row) : null
}

export async function listResumableSessions(params: {
  userId: string
  limit?: number
}): Promise<StudySession[]> {
  const { rows } = await listPage(
    "study_sessions",
    [
      Query.equal("userId", params.userId),
      Query.equal("status", "in_progress"),
      Query.orderDesc("startedAt"),
    ],
    params.limit ?? 10
  )

  return rows.map(toStudySession)
}

export async function listRecentSessions(params: {
  userId: string
  limit?: number
  status?: StudyStatus
}): Promise<StudySession[]> {
  const { rows } = await listPage(
    "study_sessions",
    [
      Query.equal("userId", params.userId),
      ...(params.status ? [Query.equal("status", params.status)] : []),
      Query.orderDesc("startedAt"),
    ],
    params.limit ?? 20
  )

  return rows.map(toStudySession)
}

/** Every completed sitting, for the performance screens. */
export async function listCompletedSessions(params: {
  userId: string
  maxRows?: number
}): Promise<StudySession[]> {
  const rows = await listAll(
    "study_sessions",
    [
      Query.equal("userId", params.userId),
      Query.equal("status", "completed"),
      Query.orderDesc("startedAt"),
    ],
    { maxRows: params.maxRows ?? 500, label: "completed sittings" }
  )

  return rows.map(toStudySession)
}

/**
 * The label a sitting shows in history.
 *
 * `study_sessions.mode` carries a third value the category's own `mode` does
 * not: `review`. A mistake drill is not a fresh attempt, and recording it as
 * one makes the history meaningless.
 */
export const STUDY_MODE_LABELS: Record<StudyMode, string> = {
  quiz: "Quiz",
  board_exam: "Board exam",
  review: "Mistake drill",
}
