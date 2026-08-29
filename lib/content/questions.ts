import { Query } from "../appwrite"
import { assertContentConfigured, countRows, listAll, resolveCmsAssetUrl } from "../db"
import {
  toChoiceLabel,
  type QuestionDifficulty,
  type QuestionDocument,
  type QuestionType,
} from "../schema"
import { canOpenQuestion, type ContentViewer } from "./access"

/**
 * ─── Questions ────────────────────────────────────────────────────────────
 *
 * Two rules run through everything here, and both are silent when broken.
 *
 * **A choice is a position, not a letter** (gotcha 6). `choices` is an ordered
 * array; index 0 displays as "A". The label is presentation, produced by
 * `toChoiceLabel`. Nothing is ever derived back from the letter — which is
 * what makes shuffling the display safe, because `index` travels with the
 * choice.
 *
 * **The SKU is the identity** (gotcha 5). Row IDs are reissued whenever the
 * CMS re-imports a sheet; `Q-000142` is assigned once and reused forever. Every
 * answer, every progress entry and every statistic keys off `sku`.
 */

export type QuestionChoice = {
  /** Position in the stored array. The only source of truth for correctness. */
  index: number
  /** Display label for that position: 0 → "A", 25 → "Z", 26 → "AA". */
  label: string
  text: string
}

export type ExamQuestion = {
  id: string
  /** Permanent item identifier. Answer history records this, never `id`. */
  sku: string
  categoryId: string
  /** "" when the question sits directly under the category, with no set. */
  questionnaireId: string
  /** The item number. Unique per destination, but gappy — never an array index. */
  order: number
  prompt: string
  questionType: QuestionType
  difficulty: QuestionDifficulty
  explanation: string
  /** Absolute, with the CMS base URL applied when the stored value is a path. */
  imageUrl: string | null
  /** Render `choices.length` — the real bank has 3, 4, 5 and 6-choice items. */
  choices: QuestionChoice[]
  answerIndex: number
  /** Opt-in free sample inside a premium category. */
  isFree: boolean
}

/** The stored choice list becomes a labelled, render-ready list. */
export function toExamQuestion(row: QuestionDocument): ExamQuestion {
  const stored = Array.isArray(row.choices) ? row.choices : []

  const choices: QuestionChoice[] = stored.map((text, index) => ({
    index,
    label: toChoiceLabel(index),
    text: typeof text === "string" ? text.trim() : "",
  }))

  const answerIndex = row.answerIndex ?? 0

  return {
    id: row.$id,
    sku: row.sku ?? "",
    categoryId: row.categoryId ?? "",
    questionnaireId: row.questionnaireId ?? "",
    order: row.order ?? 1,
    prompt: row.prompt ?? "",
    questionType: row.questionType ?? "multiple_choice",
    difficulty: row.difficulty ?? "medium",
    explanation: row.explanation?.trim() ?? "",
    imageUrl: resolveCmsAssetUrl(row.imageUrl),
    choices,
    // Clamped so a bad import cannot mark every answer wrong.
    answerIndex:
      answerIndex >= 0 && answerIndex < choices.length ? answerIndex : 0,
    isFree: row.isFree === true,
  }
}

export function isAnswerCorrect(question: ExamQuestion, choiceIndex: number) {
  return choiceIndex === question.answerIndex
}

export function getCorrectChoice(question: ExamQuestion) {
  return question.choices[question.answerIndex] ?? null
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export type QuestionReadOptions = {
  /**
   * Ask the server for the free sample only.
   *
   * The paywall used to be applied after the fact: every item in a paid paper
   * was downloaded and then filtered out of the render. The member never saw
   * them, but the prompts, the answer keys and the explanations for content
   * they had not bought were sitting on their device — and a paid paper is the
   * whole product.
   *
   * This is still not *security* — `questions` is `app_readonly`, so any
   * signed-in member can query the table directly, and a real guarantee has to
   * come from a server-side gate (section 9). It does mean the app stops
   * handing paid content out unasked, and it makes a free-tier read
   * dramatically smaller.
   */
  freeOnly?: boolean
}

function freeOnlyQueries(options?: QuestionReadOptions) {
  return options?.freeOnly ? [Query.equal("isFree", true)] : []
}

/** Every item in one set, in stored order. Backed by `idx_question_paper_order`. */
export async function listQuestionsInSet(
  setId: string,
  options?: QuestionReadOptions
): Promise<ExamQuestion[]> {
  assertContentConfigured()

  if (!setId) {
    return []
  }

  const rows = await listAll(
    "questions",
    [
      Query.equal("questionnaireId", setId),
      ...freeOnlyQueries(options),
      Query.orderAsc("order"),
    ],
    { label: `questions in set ${setId}` }
  )

  return rows.map(toExamQuestion)
}

/** How many items a paper holds in total, free and paid. */
export function countQuestionsInSet(setId: string) {
  assertContentConfigured()

  return countRows("questions", [Query.equal("questionnaireId", setId)])
}

/** How many items sit directly under a category, free and paid. */
export function countDirectQuestions(categoryId: string) {
  assertContentConfigured()

  return countRows("questions", [
    Query.equal("categoryId", categoryId),
    Query.equal("questionnaireId", ""),
  ])
}

/**
 * Items sitting directly under a category, outside any set.
 *
 * `Query.equal("questionnaireId", "")` and not `Query.isNull` — Appwrite
 * stores an unset string as `""`, so `isNull` matches nothing at all and the
 * screen comes up empty with no error (gotcha 4).
 */
export async function listDirectQuestions(
  categoryId: string,
  options?: QuestionReadOptions
): Promise<ExamQuestion[]> {
  assertContentConfigured()

  if (!categoryId) {
    return []
  }

  const rows = await listAll(
    "questions",
    [
      Query.equal("categoryId", categoryId),
      Query.equal("questionnaireId", ""),
      ...freeOnlyQueries(options),
      Query.orderAsc("order"),
    ],
    { label: `direct questions in ${categoryId}` }
  )

  return rows.map(toExamQuestion)
}

/** Everything in a category, sets included. */
export async function listQuestionsInCategory(
  categoryId: string,
  options?: QuestionReadOptions
): Promise<ExamQuestion[]> {
  assertContentConfigured()

  if (!categoryId) {
    return []
  }

  const rows = await listAll(
    "questions",
    [
      Query.equal("categoryId", categoryId),
      ...freeOnlyQueries(options),
      Query.orderAsc("order"),
    ],
    { label: `questions in ${categoryId}` }
  )

  return rows.map(toExamQuestion)
}

/**
 * The real number of published items in a category.
 *
 * `exam_categories.questionCount` is denormalised and accurate only as of the
 * last CMS write, so it is fine for a card and wrong for a denominator
 * (gotcha 9).
 */
export function countQuestionsInCategory(categoryId: string) {
  assertContentConfigured()

  return countRows("questions", [Query.equal("categoryId", categoryId)])
}

// ─── Paywall ────────────────────────────────────────────────────────────────

export type PaywalledQuestions = {
  visible: ExamQuestion[]
  /** Items withheld from this viewer. */
  hiddenCount: number
  /** True when the category is paid and this viewer is not. */
  isSample: boolean
}

/**
 * Applies section 9 on the way out.
 *
 * Which items make up the free sample is an editorial decision — a
 * representative spread, not whichever ones happen to sort first — so it lives
 * on the rows as `isFree` rather than as a count on the paper.
 *
 * Still used as a belt-and-braces pass even when the read was `freeOnly`: it
 * costs nothing over an already-filtered list, and it means a caller that
 * forgets the option cannot leak a paid item into the render.
 */
export function applyQuestionPaywall(
  questions: ExamQuestion[],
  category: { isPremium: boolean },
  viewer: ContentViewer
): PaywalledQuestions {
  if (!category.isPremium || viewer.isPremium) {
    return { visible: questions, hiddenCount: 0, isSample: false }
  }

  const visible = questions.filter((question) =>
    canOpenQuestion(question, category, viewer)
  )

  return {
    visible,
    hiddenCount: questions.length - visible.length,
    isSample: true,
  }
}
