import { COLLECTIONS, DB_ID, ID, Query, tablesDB } from "./appwrite"

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuizResultPayload = {
  userId: string
  examId: string
  score: number
  totalItems: number
  timeTaken: number // seconds
  status: "ongoing" | "done"
}

export type ExamAttempt = {
  $id: string
  userId: string
  examId: string
  score: number
  totalItems: number
  timeTaken: number
  status: "ongoing" | "done"
  startedAt: string
  finishedAt: string | null
}

export type UserProgressSummary = {
  examId: string
  totalAttempts: number
  totalCorrect: number
  totalItems: number
  averageScore: number
  lastStudied: string | null
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

/**
 * Saves a completed quiz result as an exam_attempt document.
 */
export async function saveQuizResult(
  payload: QuizResultPayload
): Promise<void> {
  const now = new Date().toISOString()

  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_ATTEMPTS,
    rowId: ID.unique(),
    data: {
      userId: payload.userId,
      examId: payload.examId,
      score: payload.score,
      totalItems: payload.totalItems,
      timeTaken: payload.timeTaken,
      status: payload.status,
      startedAt: now,
      finishedAt: payload.status === "done" ? now : null,
    },
  })
}

/**
 * Fetches all exam attempts for a given user.
 */
export async function getUserAttempts(userId: string): Promise<ExamAttempt[]> {
  try {
    const { rows } = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: COLLECTIONS.EXAM_ATTEMPTS,
      queries: [
        Query.equal("userId", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ],
    })
    return rows as unknown as ExamAttempt[]
  } catch {
    return []
  }
}

/**
 * Aggregates attempts into per-exam progress summaries.
 */
export function aggregateProgress(
  attempts: ExamAttempt[]
): UserProgressSummary[] {
  const examMap = new Map<
    string,
    { correct: number; total: number; lastStudied: string }
  >()

  for (const attempt of attempts) {
    if (attempt.status !== "done") continue

    const existing = examMap.get(attempt.examId) ?? {
      correct: 0,
      total: 0,
      lastStudied: attempt.finishedAt ?? attempt.startedAt,
    }

    existing.correct += attempt.score
    existing.total += attempt.totalItems
    if (attempt.finishedAt && attempt.finishedAt > existing.lastStudied) {
      existing.lastStudied = attempt.finishedAt
    }

    examMap.set(attempt.examId, existing)
  }

  return Array.from(examMap.entries()).map(([examId, data]) => ({
    examId,
    totalAttempts: attempts.filter((a) => a.examId === examId).length,
    totalCorrect: data.correct,
    totalItems: data.total,
    averageScore:
      data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    lastStudied: data.lastStudied,
  }))
}
