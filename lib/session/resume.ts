import { fromChoiceLabel } from "../schema"
import { listSessionAnswers } from "./answers"
import type { PresentedQuestion } from "./question-pool"

/**
 * ─── Resuming a sitting ───────────────────────────────────────────────────
 *
 * The pool is rebuilt from the same seed, so the sequence and the choice
 * arrangement come back identical — nothing about the shuffle is stored,
 * because nothing needs to be.
 *
 * What *is* stored is the answers, and they come back keyed by SKU. Not by
 * position: `shuffleQuestions` moves items between runs of the same paper, and
 * not by row ID either, since a re-import reissues those (gotcha 5).
 */

export type RestoredAnswers = {
  /** Run position → the **original** choice index they picked. */
  byPosition: Map<number, number>
  /** Positions that were graded before they left. */
  revealedPositions: Set<number>
  correctCount: number
  /** Where to drop them back in: the first unanswered position. */
  resumeIndex: number
}

const EMPTY: RestoredAnswers = {
  byPosition: new Map(),
  revealedPositions: new Set(),
  correctCount: 0,
  resumeIndex: 0,
}

/**
 * Recovers an answer's original choice index.
 *
 * `selectedAnswerKey` is the letter of the **stored** position, written with
 * `toChoiceLabel(originalIndex)` — never the row it was drawn on. Matching the
 * text is the fallback for rows written before that was true, and for a paper
 * whose choices were re-ordered in the CMS since.
 */
function resolveSelectedIndex(
  presented: PresentedQuestion,
  selectedAnswerKey: string | null | undefined,
  selectedAnswerText: string | null | undefined
): number | null {
  const fromLabel = fromChoiceLabel(selectedAnswerKey ?? "")

  if (
    fromLabel !== null &&
    presented.choices.some((choice) => choice.index === fromLabel)
  ) {
    return fromLabel
  }

  const text = selectedAnswerText?.trim()

  if (text) {
    const match = presented.choices.find((choice) => choice.text === text)

    if (match) {
      return match.index
    }
  }

  return null
}

export async function restoreSessionAnswers(params: {
  sessionId: string
  questions: PresentedQuestion[]
  /** True when answers were graded as they were given. */
  revealsAsAnswered: boolean
}): Promise<RestoredAnswers> {
  if (!params.sessionId || params.questions.length === 0) {
    return EMPTY
  }

  const rows = await listSessionAnswers(params.sessionId)

  if (rows.length === 0) {
    return EMPTY
  }

  const rowBySku = new Map(rows.map((row) => [row.questionSku, row]))
  const byPosition = new Map<number, number>()
  const revealedPositions = new Set<number>()
  let correctCount = 0
  let resumeIndex = params.questions.length - 1

  params.questions.forEach((presented, index) => {
    const row = rowBySku.get(presented.question.sku)

    if (!row) {
      resumeIndex = Math.min(resumeIndex, index)
      return
    }

    const selectedIndex = resolveSelectedIndex(
      presented,
      row.selectedAnswerKey,
      row.selectedAnswerText
    )

    if (selectedIndex === null) {
      resumeIndex = Math.min(resumeIndex, index)
      return
    }

    byPosition.set(index, selectedIndex)

    if (params.revealsAsAnswered) {
      revealedPositions.add(index)
    }

    if (selectedIndex === presented.question.answerIndex) {
      correctCount += 1
    }
  })

  return {
    byPosition,
    revealedPositions,
    correctCount,
    resumeIndex: Math.max(Math.min(resumeIndex, params.questions.length - 1), 0),
  }
}
