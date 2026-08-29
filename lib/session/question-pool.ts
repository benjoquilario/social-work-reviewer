import { toChoiceLabel } from "../schema"
import type { ExamQuestion } from "../content/questions"
import type { MemberSettings } from "../member/settings"

/**
 * ─── Building the run ─────────────────────────────────────────────────────
 *
 * Turns a paper plus the member's settings into the exact sequence they will
 * see. Two traps live here and both corrupt data rather than crash (section 8).
 *
 * **`shuffleChoices` reorders the display only.** The correct answer is stored
 * as a position in `choices`, so the mapping has to survive the shuffle and be
 * translated back before anything is written. `PresentedChoice.index` is that
 * mapping: it is always the original position, whatever row it is drawn on.
 *
 * **`shuffleQuestions` never changes `order`.** It changes the sequence shown.
 * The answer row still records the item's real SKU, and the session's
 * `lastQuestionOrder` still refers to the stored number — or resuming lands
 * somewhere else entirely.
 */

/** One choice as it is drawn, carrying the position it came from. */
export type PresentedChoice = {
  /** The **original** index in `question.choices`. The source of truth. */
  index: number
  /** Label for the row it is drawn on: the first row is always "A". */
  displayLabel: string
  /** Label for the position it came from — what gets stored. */
  storedLabel: string
  text: string
}

export type PresentedQuestion = {
  question: ExamQuestion
  /** Position in this run, 1-based. Not the stored `order`. */
  position: number
  choices: PresentedChoice[]
}

export type QuestionPool = {
  questions: PresentedQuestion[]
  /** How many the filters removed from the paper. */
  filteredOutCount: number
  /** How many the session length cut. */
  trimmedCount: number
  /** True when the filters left nothing to answer. */
  isEmpty: boolean
}

// ─── Seeded shuffle ─────────────────────────────────────────────────────────
//
// Seeded rather than random so resuming a sitting reproduces the same sequence.
// With `Math.random` a member who closed the app mid-paper would come back to a
// different order, and `lastQuestionOrder` would point at the wrong item.

function hashSeed(value: string) {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

function createRandom(seed: string) {
  let state = hashSeed(seed) || 1

  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0

    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }

  return result
}

// ─── Presentation ───────────────────────────────────────────────────────────

export function presentChoices(
  question: ExamQuestion,
  shuffle: boolean,
  seed: string
): PresentedChoice[] {
  const source = question.choices.map((choice) => ({
    index: choice.index,
    storedLabel: choice.label,
    text: choice.text,
  }))

  const ordered = shuffle
    ? shuffled(source, createRandom(`${seed}:${question.sku || question.id}`))
    : source

  return ordered.map((choice, displayPosition) => ({
    ...choice,
    displayLabel: toChoiceLabel(displayPosition),
  }))
}

/** True when the tapped row is the right answer. Always compares positions. */
export function isChoiceCorrect(
  question: ExamQuestion,
  choice: PresentedChoice
) {
  return choice.index === question.answerIndex
}

export function findCorrectChoice(presented: PresentedQuestion) {
  return (
    presented.choices.find(
      (choice) => choice.index === presented.question.answerIndex
    ) ?? null
  )
}

// ─── Filters ────────────────────────────────────────────────────────────────

export type PoolInput = {
  questions: ExamQuestion[]
  settings: MemberSettings
  /** Stable across resumes — pass the session ID. */
  seed: string
  /** SKUs already answered, for `questionSource: "unanswered"`. */
  answeredSkus?: ReadonlySet<string>
  /** SKUs answered wrong, for `questionSource: "incorrect"`. */
  incorrectSkus?: ReadonlySet<string>
  /** SKUs the member saved, for `questionSource: "bookmarked"`. */
  bookmarkedSkus?: ReadonlySet<string>
  /** Overrides `settings.questionsPerSession` when the screen asked for a size. */
  questionLimit?: number
}

function applySourceFilter(
  questions: ExamQuestion[],
  input: PoolInput
): ExamQuestion[] {
  switch (input.settings.questionSource) {
    case "unanswered":
      return input.answeredSkus
        ? questions.filter((question) => !input.answeredSkus!.has(question.sku))
        : questions
    case "incorrect":
      return input.incorrectSkus
        ? questions.filter((question) => input.incorrectSkus!.has(question.sku))
        : questions
    case "bookmarked":
      return input.bookmarkedSkus
        ? questions.filter((question) => input.bookmarkedSkus!.has(question.sku))
        : questions
    case "all":
    default:
      return questions
  }
}

function applyDifficultyFilter(
  questions: ExamQuestion[],
  settings: MemberSettings
) {
  if (settings.difficultyFilter === "all") {
    return questions
  }

  return questions.filter(
    (question) => question.difficulty === settings.difficultyFilter
  )
}

/**
 * The sequence for one sitting.
 *
 * Filters narrow the pool, then the length cuts it, then the order is decided —
 * in that order, so "20 items" means twenty of the ones that survived the
 * filters rather than twenty from the top of the paper.
 */
export function buildQuestionPool(input: PoolInput): QuestionPool {
  const { settings } = input
  const total = input.questions.length

  const filtered = applyDifficultyFilter(
    applySourceFilter(input.questions, input),
    settings
  )

  // Falling back to the whole paper is deliberate: "you have no mistakes to
  // drill" should not read as "this paper is empty".
  const usable = filtered.length > 0 ? filtered : input.questions
  const filteredOutCount = total - usable.length

  const requested =
    input.questionLimit && input.questionLimit > 0
      ? input.questionLimit
      : settings.questionsPerSession

  const length =
    requested > 0 ? Math.min(requested, usable.length) : usable.length

  const random = createRandom(input.seed)
  const sequenced = settings.shuffleQuestions
    ? shuffled(usable, random)
    : [...usable].sort((left, right) => left.order - right.order)

  const selected = sequenced.slice(0, length)

  return {
    questions: selected.map((question, index) => ({
      question,
      position: index + 1,
      choices: presentChoices(question, settings.shuffleChoices, input.seed),
    })),
    filteredOutCount,
    trimmedCount: Math.max(usable.length - length, 0),
    isEmpty: selected.length === 0,
  }
}

/**
 * Rebuilds the same sequence for a resumed sitting.
 *
 * The seed is the session ID, so this is the same list in the same order with
 * the same choice arrangement — nothing is stored about the shuffle because
 * nothing needs to be.
 */
export function rebuildQuestionPool(input: PoolInput) {
  return buildQuestionPool(input)
}
