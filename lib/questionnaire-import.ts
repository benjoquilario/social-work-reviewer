import {
  fromChoiceLabel,
  toChoiceLabel,
  type QuestionDifficulty,
  type QuestionnaireMode,
  type QuestionnaireSetCode,
  type QuestionType,
  type ReviewerCreateInput,
} from "./schema"

/**
 * ─── Spreadsheet import contract ──────────────────────────────────────────
 *
 * The shape the dashboard's Excel/CSV upload speaks, and the only place that
 * translates a spreadsheet row into a database row.
 *
 * Two sheets, because questionnaire metadata and question items have different
 * cardinality — cramming both into one would repeat the paper's title on all
 * 183 of its rows:
 *
 *   Sheet "Questionnaires"  one row per paper
 *   Sheet "Questions"       one row per item, tied back by the paper's Code
 *
 * Every column maps to exactly one database column. No delimiters, no JSON in
 * cells, nothing to un-encode on the way in — a choice containing a comma, a
 * quote or a newline is just a cell.
 *
 * The sheet round-trips. Export, edit, re-upload: rows carrying a SKU update
 * in place, blank-SKU rows are created and assigned one. That is why nothing
 * here matches on row position.
 */

// ─── Identifiers ────────────────────────────────────────────────────────────

export const QUESTION_SKU_PREFIX = "Q-"
const SKU_DIGITS = 6

/** `Q-000142`. Zero-padded so a plain text sort matches numeric order. */
export function formatQuestionSku(sequence: number) {
  return `${QUESTION_SKU_PREFIX}${String(Math.max(sequence, 1)).padStart(
    SKU_DIGITS,
    "0"
  )}`
}

export function parseQuestionSku(sku: string): number | null {
  const match = /^Q-(\d+)$/i.exec(sku.trim())

  if (!match) {
    return null
  }

  const parsed = Number.parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Hands out the next unused SKU, continuing past whatever already exists.
 *
 * Import runs from a single dashboard session, so a max+1 counter is safe
 * here. If imports ever run concurrently this needs a reserved counter row —
 * two sessions allocating from the same starting point would collide.
 */
export function createSkuAllocator(existingSkus: Iterable<string>) {
  let highest = 0

  for (const sku of existingSkus) {
    const sequence = parseQuestionSku(sku)

    if (sequence !== null && sequence > highest) {
      highest = sequence
    }
  }

  return () => {
    highest += 1
    return formatQuestionSku(highest)
  }
}

/**
 * `HSCI` + `A` → `HSCI-A`, `HSCI` + none → `HSCI`.
 *
 * Short on purpose: this string is repeated on every question row in the
 * sheet, and the previous slug (`history_social_conditions_issues_co_drill_
 * set_a`, 46 characters) made that column unreadable and unusable to type.
 */
export function buildQuestionnaireCode(
  categoryCode: string,
  setCode?: string | null
) {
  const base = categoryCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 16)
  const set = (setCode ?? "").trim().toUpperCase().replace(/^SET\s*/, "")

  return set ? `${base}-${set}` : base
}

export function normalizeQuestionnaireCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "")
}

// ─── Column headers ─────────────────────────────────────────────────────────

export const QUESTIONNAIRE_SHEET_NAME = "Questionnaires"
export const QUESTION_SHEET_NAME = "Questions"

/** Header row for the Questionnaires sheet, left to right. */
export const QUESTIONNAIRE_COLUMNS = [
  "Code",
  "Category",
  "Category Code",
  "Set",
  "Mode",
  "Title",
  "Description",
  "Order",
  "Premium",
  "Published",
] as const

/**
 * Header row for the Questions sheet, left to right.
 *
 * SKU leads because it is the identity column: it is what makes a re-upload an
 * edit rather than a duplicate.
 *
 * `Choices` is a single cell holding one choice per line (Alt+Enter in Excel).
 * That is what keeps the sheet at one row per question while placing no limit
 * on how many choices an item has — a grid of A/B/C columns cannot do both.
 * Excel renders the cell as a stacked list, which reads much like the printed
 * paper it came from.
 */
export const QUESTION_COLUMNS = [
  "SKU",
  "Questionnaire",
  "No",
  "Question",
  "Choices",
  "Answer",
  "Type",
  "Difficulty",
  "Free",
  "Explanation",
  "Image",
] as const

export type QuestionnaireSheetRow = Record<
  (typeof QUESTIONNAIRE_COLUMNS)[number],
  string
>
export type QuestionSheetRow = Record<
  (typeof QUESTION_COLUMNS)[number],
  string
>

// ─── Cell coercion ──────────────────────────────────────────────────────────

function readCell(row: Record<string, unknown>, column: string) {
  const value = row[column]

  if (value === null || value === undefined) {
    return ""
  }

  return String(value).trim()
}

/**
 * Spreadsheets are typed loosely by the people filling them in: "yes", "TRUE",
 * "1" and "x" all mean the same thing to a human and none of them are a
 * boolean. Accept the lot rather than rejecting a clear intent on formatting.
 */
function readBoolean(value: string, fallback: boolean) {
  const normalized = value.toLowerCase()

  if (!normalized) {
    return fallback
  }

  return ["true", "yes", "y", "1", "x"].includes(normalized)
}

function readInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

// ─── Validation results ─────────────────────────────────────────────────────

export type ImportIssue = {
  /** 1-based row number as it appears in the spreadsheet, header included. */
  row: number
  column?: string
  message: string
}

export type ParsedQuestionnaire = {
  code: string
  categoryTitle: string
  categoryCode: string
  mode: QuestionnaireMode
  setCode: QuestionnaireSetCode | null
  title: string
  description: string
  order: number
  isPremium: boolean
  isPublished: boolean
}

export type ParsedQuestion = {
  /** Blank for a new item; the allocator fills it in. */
  sku: string
  questionnaireCode: string
  order: number
  prompt: string
  /** Ordered; position is identity. */
  choices: string[]
  /** Zero-based index into `choices`. */
  answerIndex: number
  questionType: QuestionType
  difficulty: QuestionDifficulty
  isFree: boolean
  explanation: string
  imageFileId: string
}

export type ParseResult<T> = {
  rows: T[]
  issues: ImportIssue[]
}

// ─── Value normalisation ────────────────────────────────────────────────────

const MODE_ALIASES: Record<string, QuestionnaireMode> = {
  quiz: "quiz",
  practice: "quiz",
  drill: "quiz",
  board: "board_exam",
  board_exam: "board_exam",
  "board exam": "board_exam",
  mock: "board_exam",
  exam: "board_exam",
}

const TYPE_ALIASES: Record<string, QuestionType> = {
  mcq: "multiple_choice",
  multiple_choice: "multiple_choice",
  "multiple choice": "multiple_choice",
  true_false: "true_false",
  "true false": "true_false",
  "true/false": "true_false",
  tf: "true_false",
  boolean: "true_false",
}

const DIFFICULTY_ALIASES: Record<string, QuestionDifficulty> = {
  easy: "easy",
  e: "easy",
  medium: "medium",
  m: "medium",
  average: "medium",
  hard: "hard",
  h: "hard",
  difficult: "hard",
}

const SET_CODES: readonly string[] = ["A", "B", "C", "D", "E"]

/** True/false is stored as a two-choice item so one renderer covers both. */
const TRUE_FALSE_DEFAULTS = ["True", "False"]

/**
 * Strips an optional leading label so both of these work:
 *
 *   A. Manila        <- pasted from a printed paper
 *   Manila           <- typed fresh
 *
 * The label is only ever a hint. Position decides the answer, so a mislabelled
 * paste cannot repoint the answer at the wrong entry.
 */
function stripChoiceLabel(line: string) {
  return line.replace(/^\s*[A-Za-z]{1,2}\s*[.)\-:]\s+/, "").trim()
}

/** Splits the Choices cell on newlines, dropping blank lines. */
export function parseChoicesCell(value: string) {
  return value
    .split(/\r?\n/)
    .map(stripChoiceLabel)
    .filter((line) => line.length > 0)
}

// ─── Parsers ────────────────────────────────────────────────────────────────

export function parseQuestionnaireSheet(
  rows: Record<string, unknown>[]
): ParseResult<ParsedQuestionnaire> {
  const parsed: ParsedQuestionnaire[] = []
  const issues: ImportIssue[] = []
  const seenCodes = new Set<string>()

  rows.forEach((raw, index) => {
    // +2: one for the header row, one because spreadsheets are 1-based.
    const rowNumber = index + 2
    const title = readCell(raw, "Title")
    const categoryTitle = readCell(raw, "Category")
    const categoryCode = readCell(raw, "Category Code")

    if (!categoryTitle) {
      issues.push({
        row: rowNumber,
        column: "Category",
        message: "Category is required — it is what groups papers in the app.",
      })
      return
    }

    if (!categoryCode) {
      issues.push({
        row: rowNumber,
        column: "Category Code",
        message:
          "Category Code is required, e.g. HSCI. Paper codes are built from it.",
      })
      return
    }

    const setCell = readCell(raw, "Set").toUpperCase().replace(/^SET\s*/, "")

    if (setCell && !SET_CODES.includes(setCell)) {
      issues.push({
        row: rowNumber,
        column: "Set",
        message: `Set must be blank or one of A-E, got "${setCell}".`,
      })
      return
    }

    const setCode = setCell ? (setCell as QuestionnaireSetCode) : null
    const code =
      normalizeQuestionnaireCode(readCell(raw, "Code")) ||
      buildQuestionnaireCode(categoryCode, setCode)

    if (!code) {
      issues.push({ row: rowNumber, column: "Code", message: "Code is required." })
      return
    }

    if (seenCodes.has(code)) {
      issues.push({
        row: rowNumber,
        column: "Code",
        message: `Duplicate code "${code}". Each paper needs its own.`,
      })
      return
    }
    seenCodes.add(code)

    const modeCell = readCell(raw, "Mode").toLowerCase()
    const mode = modeCell ? MODE_ALIASES[modeCell] : "board_exam"

    if (!mode) {
      issues.push({
        row: rowNumber,
        column: "Mode",
        message: `Unrecognised mode "${modeCell}". Use "quiz" or "board exam".`,
      })
      return
    }

    parsed.push({
      code,
      categoryTitle,
      categoryCode: categoryCode.toUpperCase(),
      mode,
      setCode,
      title: title || (setCode ? `Set ${setCode}` : categoryTitle),
      description: readCell(raw, "Description"),
      order: readInteger(readCell(raw, "Order"), index + 1),
      isPremium: readBoolean(readCell(raw, "Premium"), true),
      // Unpublished by default: a paper reaching learners should be a
      // deliberate act, not what happens when a column is left blank.
      isPublished: readBoolean(readCell(raw, "Published"), false),
    })
  })

  return { rows: parsed, issues }
}

export function parseQuestionSheet(
  rows: Record<string, unknown>[],
  knownQuestionnaireCodes: ReadonlySet<string>
): ParseResult<ParsedQuestion> {
  const parsed: ParsedQuestion[] = []
  const issues: ImportIssue[] = []
  const seenSkus = new Set<string>()
  const orderByQuestionnaire = new Map<string, Set<number>>()

  rows.forEach((raw, index) => {
    const rowNumber = index + 2
    const questionnaireCode = normalizeQuestionnaireCode(
      readCell(raw, "Questionnaire")
    )
    const prompt = readCell(raw, "Question")

    if (!questionnaireCode) {
      issues.push({
        row: rowNumber,
        column: "Questionnaire",
        message: "Every question row must name its questionnaire code.",
      })
      return
    }

    if (!knownQuestionnaireCodes.has(questionnaireCode)) {
      issues.push({
        row: rowNumber,
        column: "Questionnaire",
        message: `No paper with code "${questionnaireCode}" on the ${QUESTIONNAIRE_SHEET_NAME} sheet.`,
      })
      return
    }

    if (!prompt) {
      issues.push({
        row: rowNumber,
        column: "Question",
        message: "Question text is required.",
      })
      return
    }

    const sku = readCell(raw, "SKU").toUpperCase()

    if (sku) {
      if (parseQuestionSku(sku) === null) {
        issues.push({
          row: rowNumber,
          column: "SKU",
          message: `"${sku}" is not a valid SKU. Leave it blank for a new question — never invent one by hand.`,
        })
        return
      }

      if (seenSkus.has(sku)) {
        issues.push({
          row: rowNumber,
          column: "SKU",
          message: `SKU ${sku} appears twice. Two rows cannot be the same question.`,
        })
        return
      }
      seenSkus.add(sku)
    }

    const typeCell = readCell(raw, "Type").toLowerCase()
    const questionType = typeCell ? TYPE_ALIASES[typeCell] : "multiple_choice"

    if (!questionType) {
      issues.push({
        row: rowNumber,
        column: "Type",
        message: `Unrecognised type "${typeCell}". Use "mcq" or "true/false".`,
      })
      return
    }

    const difficultyCell = readCell(raw, "Difficulty").toLowerCase()
    const difficulty = difficultyCell
      ? DIFFICULTY_ALIASES[difficultyCell]
      : "medium"

    if (!difficulty) {
      issues.push({
        row: rowNumber,
        column: "Difficulty",
        message: `Unrecognised difficulty "${difficultyCell}". Use easy, medium or hard.`,
      })
      return
    }

    const choices =
      parseChoicesCell(readCell(raw, "Choices")) ||
      ([] as string[])

    if (choices.length === 0 && questionType === "true_false") {
      // So a true/false row only needs a question and an answer.
      choices.push(...TRUE_FALSE_DEFAULTS)
    }

    if (choices.length < 2) {
      issues.push({
        row: rowNumber,
        column: "Choices",
        message: `A question needs at least two choices, one per line; found ${choices.length}.`,
      })
      return
    }

    const duplicate = choices.find(
      (choice, choiceIndex) => choices.indexOf(choice) !== choiceIndex
    )

    if (duplicate) {
      // Two identical choices make the item unanswerable — whichever the
      // learner picks, half the time they are marked wrong for the same text.
      issues.push({
        row: rowNumber,
        column: "Choices",
        message: `Choice "${duplicate}" appears twice.`,
      })
      return
    }

    // Accept either a letter or a 1-based line number, because both are how
    // people actually write an answer key.
    const answerCell = readCell(raw, "Answer")
    const asLabel = fromChoiceLabel(answerCell)
    const asNumber = Number.parseInt(answerCell, 10)
    const answerIndex =
      asLabel !== null
        ? asLabel
        : Number.isFinite(asNumber)
          ? asNumber - 1
          : -1

    if (answerIndex < 0) {
      issues.push({
        row: rowNumber,
        column: "Answer",
        message:
          'Answer is required — a letter such as "C" or the line number "3".',
      })
      return
    }

    if (answerIndex >= choices.length) {
      issues.push({
        row: rowNumber,
        column: "Answer",
        message: `Answer "${answerCell}" points past the last choice; this item has ${choices.length}.`,
      })
      return
    }

    const order = readInteger(readCell(raw, "No"), index + 1)
    const seenOrders =
      orderByQuestionnaire.get(questionnaireCode) ?? new Set<number>()

    if (seenOrders.has(order)) {
      issues.push({
        row: rowNumber,
        column: "No",
        message: `Item number ${order} is used twice in "${questionnaireCode}".`,
      })
      return
    }
    seenOrders.add(order)
    orderByQuestionnaire.set(questionnaireCode, seenOrders)

    parsed.push({
      sku,
      questionnaireCode,
      order,
      prompt,
      choices,
      answerIndex,
      questionType,
      difficulty,
      // Blank means premium. The safe direction: a forgotten column locks
      // content rather than giving the whole bank away.
      isFree: readBoolean(readCell(raw, "Free"), false),
      explanation: readCell(raw, "Explanation"),
      imageFileId: readCell(raw, "Image"),
    })
  })

  return { rows: parsed, issues }
}

// ─── Row builders ───────────────────────────────────────────────────────────

export function toQuestionnaireRow(
  parsed: ParsedQuestionnaire,
  categoryId: string,
  questionCount: number
): ReviewerCreateInput<"questionnaires"> {
  return {
    code: parsed.code,
    categoryId,
    mode: parsed.mode,
    title: parsed.title,
    setCode: parsed.setCode ?? undefined,
    description: parsed.description || undefined,
    order: parsed.order,
    questionCount,
    isPremium: parsed.isPremium,
    isPublished: parsed.isPublished,
  }
}

export function toQuestionRow(
  parsed: ParsedQuestion,
  sku: string,
  questionnaireId: string,
  categoryId: string
): ReviewerCreateInput<"questions"> {
  return {
    sku,
    questionnaireId,
    categoryId,
    order: parsed.order,
    prompt: parsed.prompt,
    questionType: parsed.questionType,
    difficulty: parsed.difficulty,
    choices: parsed.choices,
    answerIndex: parsed.answerIndex,
    explanation: parsed.explanation || undefined,
    imageFileId: parsed.imageFileId || undefined,
    isFree: parsed.isFree,
  }
}

/**
 * Splits parsed rows into what to create and what to update.
 *
 * A row with a SKU that already exists is an edit; a row with a blank SKU is
 * new and gets one allocated. Matching on SKU rather than position is what
 * lets someone insert a question at number 12 without the importer treating
 * every row below it as a rewrite of its neighbour.
 */
export function planQuestionImport(
  parsedRows: ParsedQuestion[],
  existingSkus: ReadonlySet<string>
) {
  const allocate = createSkuAllocator(existingSkus)
  const creates: { parsed: ParsedQuestion; sku: string }[] = []
  const updates: { parsed: ParsedQuestion; sku: string }[] = []
  const unknownSkus: string[] = []

  for (const parsed of parsedRows) {
    if (!parsed.sku) {
      creates.push({ parsed, sku: allocate() })
      continue
    }

    if (existingSkus.has(parsed.sku)) {
      updates.push({ parsed, sku: parsed.sku })
      continue
    }

    // A SKU that is not in the database is almost always a copy-paste from
    // another environment. Importing it would mint an item whose statistics
    // belong to a different question, so it is surfaced rather than accepted.
    unknownSkus.push(parsed.sku)
  }

  return { creates, updates, unknownSkus }
}

/**
 * Renders stored choices back into a Choices cell, labelled for readability.
 *
 * Used when exporting for editing: the labels round-trip harmlessly because
 * `parseChoicesCell` strips them again on the way back in.
 */
export function formatChoicesCell(choices: readonly string[]) {
  return choices
    .map((choice, index) => `${toChoiceLabel(index)}. ${choice}`)
    .join("\n")
}

/** Header rows for a blank template the dashboard can hand out. */
export function buildImportTemplate() {
  return {
    [QUESTIONNAIRE_SHEET_NAME]: [[...QUESTIONNAIRE_COLUMNS]],
    [QUESTION_SHEET_NAME]: [[...QUESTION_COLUMNS]],
  }
}
