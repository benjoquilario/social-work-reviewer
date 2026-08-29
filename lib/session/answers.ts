import { Query } from "../appwrite"
import { buildDeterministicRowId, listAll, listPage, upsertRowById } from "../db"
import { toChoiceLabel, type UserAnswerDocument } from "../schema"
import type { ExamQuestion } from "../content/questions"

/**
 * ─── Answer history ───────────────────────────────────────────────────────
 *
 * One row per answered item, and two rules decide every field on it.
 *
 * **Record the SKU, never `$id`** (gotcha 5). Row IDs are reissued whenever
 * content is re-imported, so an answer keyed by `$id` is orphaned the next time
 * the CMS re-uploads a sheet. `Q-000142` is assigned once and reused forever.
 *
 * **`answerIndex` is a position, not a letter** (gotcha 6). The letter is
 * written for display, derived from the position with `toChoiceLabel`; nothing
 * is ever derived back the other way.
 */

export type RecordedAnswer = {
  sku: string
  selectedIndex: number
  isCorrect: boolean
  answeredAt: string
  responseTimeSeconds: number | null
}

export type RecordAnswerInput = {
  userId: string
  sessionId: string
  question: ExamQuestion
  /**
   * The **original** index in `question.choices`, not the position the member
   * tapped. Under `shuffleChoices` those differ, and writing the tapped
   * position records the wrong answer and corrupts the item statistics — which
   * are keyed by SKU and shared across every member.
   */
  selectedIndex: number
  responseTimeSeconds?: number
}

/**
 * One row per (sitting, item), so changing an answer overwrites rather than
 * appending a second row that disagrees with the first.
 */
function buildAnswerRowId(sessionId: string, sku: string) {
  return buildDeterministicRowId("ans", [sessionId, sku])
}

export async function recordAnswer(
  input: RecordAnswerInput
): Promise<RecordedAnswer | null> {
  const { question, selectedIndex } = input

  if (!input.userId || !question.sku) {
    return null
  }

  const isCorrect = selectedIndex === question.answerIndex
  const answeredAt = new Date().toISOString()

  const payload = {
    userId: input.userId,
    questionSku: question.sku,
    categoryId: question.categoryId,
    // "" when there is no set — the column is a string, never null (gotcha 4).
    questionnaireId: question.questionnaireId,
    sessionId: input.sessionId,
    selectedAnswerKey: toChoiceLabel(selectedIndex),
    selectedAnswerText: question.choices[selectedIndex]?.text ?? "",
    correctAnswerKey: toChoiceLabel(question.answerIndex),
    correctAnswerText: question.choices[question.answerIndex]?.text ?? "",
    isCorrect,
    answeredAt,
    responseTimeSeconds: input.responseTimeSeconds ?? 0,
  }

  try {
    await upsertRowById(
      "user_answers",
      buildAnswerRowId(input.sessionId, question.sku),
      payload,
      // Almost every answer is a first answer; changing one is the exception.
      { ownerId: input.userId, createFirst: true }
    )
  } catch (error) {
    // Losing one answer row must not end the sitting. The session row still
    // carries the running totals, so the score survives.
    console.warn("[answers] Could not save an answer:", error)
    return null
  }

  return {
    sku: question.sku,
    selectedIndex,
    isCorrect,
    answeredAt,
    responseTimeSeconds: input.responseTimeSeconds ?? null,
  }
}

/** Every answer from one sitting, oldest first — used to resume a session. */
export async function listSessionAnswers(
  sessionId: string
): Promise<UserAnswerDocument[]> {
  if (!sessionId) {
    return []
  }

  return listAll(
    "user_answers",
    [Query.equal("sessionId", sessionId), Query.orderAsc("answeredAt")],
    { label: `answers in session ${sessionId}` }
  )
}

/**
 * SKUs this member got wrong in a category.
 *
 * Backing for `questionSource: "incorrect"` — the setting members actually
 * use, because it turns the bank into a mistake drill. Backed by
 * `idx_answer_user_category`.
 */
export async function listIncorrectSkus(params: {
  userId: string
  categoryId?: string
  questionnaireId?: string
}): Promise<Set<string>> {
  const rows = await listAll(
    "user_answers",
    [
      Query.equal("userId", params.userId),
      ...(params.categoryId ? [Query.equal("categoryId", params.categoryId)] : []),
      ...(params.questionnaireId
        ? [Query.equal("questionnaireId", params.questionnaireId)]
        : []),
      Query.equal("isCorrect", false),
    ],
    { label: "incorrect answers", maxRows: 2000 }
  )

  return new Set(rows.map((row) => row.questionSku).filter(Boolean))
}

/** Every SKU this member has answered at all — backs `questionSource: "unanswered"`. */
export async function listAnsweredSkus(params: {
  userId: string
  categoryId?: string
  questionnaireId?: string
}): Promise<Set<string>> {
  const rows = await listAll(
    "user_answers",
    [
      Query.equal("userId", params.userId),
      ...(params.categoryId ? [Query.equal("categoryId", params.categoryId)] : []),
      ...(params.questionnaireId
        ? [Query.equal("questionnaireId", params.questionnaireId)]
        : []),
    ],
    { label: "answered items", maxRows: 4000 }
  )

  return new Set(rows.map((row) => row.questionSku).filter(Boolean))
}

export type CategoryAnswerStats = {
  answered: number
  correct: number
  incorrect: number
  accuracy: number
}

/** Running accuracy for a category, from the answer rows themselves. */
export async function getCategoryAnswerStats(params: {
  userId: string
  categoryId: string
}): Promise<CategoryAnswerStats> {
  const rows = await listAll(
    "user_answers",
    [
      Query.equal("userId", params.userId),
      Query.equal("categoryId", params.categoryId),
    ],
    { label: "category answers", maxRows: 4000 }
  )

  // One row per (sitting, item) means a re-attempt counts again, which is what
  // an accuracy figure should reflect.
  const answered = rows.length
  const correct = rows.filter((row) => row.isCorrect).length

  return {
    answered,
    correct,
    incorrect: answered - correct,
    accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100),
  }
}

export async function listRecentAnswers(params: {
  userId: string
  limit?: number
}): Promise<UserAnswerDocument[]> {
  const { rows } = await listPage(
    "user_answers",
    [Query.equal("userId", params.userId), Query.orderDesc("answeredAt")],
    params.limit ?? 50
  )

  return rows
}
