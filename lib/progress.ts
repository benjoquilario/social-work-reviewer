import { COLLECTIONS, databases, DB_ID, ID, Query } from "./appwrite"

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuizResultPayload = {
  userId: string
  subjectId: string
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
  subjectId: string
  totalAttempts: number
  totalCorrect: number
  totalItems: number
  averageScore: number
  lastStudied: string | null
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

/**
 * Saves a completed quiz result as an exam_attempt document.
 * examId is set to the categoryId since we're using local questions.
 */
export async function saveQuizResult(payload: QuizResultPayload): Promise<void> {
  const now = new Date().toISOString()

  await databases.createDocument(
    DB_ID,
    COLLECTIONS.EXAM_ATTEMPTS,
    ID.unique(),
    {
      userId: payload.userId,
      examId: payload.subjectId, // maps to local categoryId
      score: payload.score,
      totalItems: payload.totalItems,
      timeTaken: payload.timeTaken,
      status: payload.status,
      startedAt: now,
      finishedAt: payload.status === "done" ? now : null,
    }
  )
}

/**
 * Fetches all exam attempts for a given user.
 */
export async function getUserAttempts(userId: string): Promise<ExamAttempt[]> {
  try {
    const { documents } = await databases.listDocuments(
      DB_ID,
      COLLECTIONS.EXAM_ATTEMPTS,
      [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(100)]
    )
    return documents as unknown as ExamAttempt[]
  } catch {
    return []
  }
}

/**
 * Aggregates attempts into per-subject progress summaries.
 */
export function aggregateProgress(attempts: ExamAttempt[]): UserProgressSummary[] {
  const subjectMap = new Map<string, { correct: number; total: number; lastStudied: string }>()

  for (const attempt of attempts) {
    if (attempt.status !== "done") continue

    const existing = subjectMap.get(attempt.examId) ?? {
      correct: 0,
      total: 0,
      lastStudied: attempt.finishedAt ?? attempt.startedAt,
    }

    existing.correct += attempt.score
    existing.total += attempt.totalItems
    if (attempt.finishedAt && attempt.finishedAt > existing.lastStudied) {
      existing.lastStudied = attempt.finishedAt
    }

    subjectMap.set(attempt.examId, existing)
  }

  return Array.from(subjectMap.entries()).map(([subjectId, data]) => ({
    subjectId,
    totalAttempts: attempts.filter((a) => a.examId === subjectId).length,
    totalCorrect: data.correct,
    totalItems: data.total,
    averageScore: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    lastStudied: data.lastStudied,
  }))
}
