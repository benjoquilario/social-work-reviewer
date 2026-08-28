import {
  COLLECTIONS,
  createAppwriteContentError,
  DB_ID,
  getAppwriteConfigurationError,
  Query,
  tablesDB,
} from "./appwrite"
import {
  toChoiceLabel,
  type ExamCategoryDocument,
  type QuestionDocument,
  type QuestionDifficulty,
  type QuestionnaireMode,
  type QuestionnaireRowDocument,
  type QuestionType,
} from "./schema"

/**
 * ─── Questionnaire data access ────────────────────────────────────────────
 *
 * Reads exam content from the `exam_categories`, `questionnaires` and
 * `questions` tables. This replaces the bundled-JSON loader: content is now
 * authored in the dashboard and imported from Excel, so the app can ship new
 * papers without a release.
 */

const PAGE_SIZE = 100
/** 100 × 20 = 2,000 items, comfortably above any real paper. */
const MAX_PAGES = 20

export type QuestionnaireChoice = {
  /** Display label derived from position: 0 -> A, 1 -> B. Never stored. */
  label: string
  text: string
  isCorrect: boolean
  order: number
}

export type QuestionnaireItem = {
  id: string
  /** Permanent item identifier; this is what answer history records. */
  sku: string
  questionnaireId: string
  categoryId: string
  order: number
  prompt: string
  questionType: QuestionType
  difficulty: QuestionDifficulty
  explanation: string
  imageFileId: string | null
  choices: QuestionnaireChoice[]
  answerIndex: number
  isFree: boolean
}

export type QuestionnaireSummary = {
  id: string
  categoryId: string
  mode: QuestionnaireMode
  title: string
  setCode: string | null
  description: string
  order: number
  code: string
  questionCount: number
  isPremium: boolean
  /** True when this viewer cannot open the whole paper. */
  isLocked: boolean
}

export type ExamCategorySummary = {
  id: string
  title: string
  code: string | null
  description: string
  order: number
  questionnaireCount: number
  questionCount: number
}

export type QuestionnaireDetail = {
  questionnaire: QuestionnaireSummary
  questions: QuestionnaireItem[]
  /** Items withheld behind the paywall for this viewer. */
  hiddenPremiumQuestionCount: number
}

function toContentError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return createAppwriteContentError("request", error.message)
  }

  return createAppwriteContentError("request", fallback)
}

function assertConfigured() {
  const configError = getAppwriteConfigurationError()

  if (configError) {
    throw createAppwriteContentError("config", configError)
  }
}

/**
 * Cursor-paged read.
 *
 * Appwrite's default page is 25 rows and a board-exam set runs to 183, so a
 * single unpaged `listRows` would silently return the first quarter of a paper
 * and the learner would never know the rest existed.
 */
async function listAllRows<T>(tableId: string, queries: string[]): Promise<T[]> {
  const rows: T[] = []
  let cursor: string | null = null

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId,
      queries: [
        ...queries,
        Query.limit(PAGE_SIZE),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ],
    })

    const pageRows = response.rows as unknown as (T & { $id: string })[]
    rows.push(...pageRows)

    if (pageRows.length < PAGE_SIZE) {
      return rows
    }

    const nextCursor = pageRows[pageRows.length - 1]?.$id ?? null

    if (!nextCursor || nextCursor === cursor) {
      return rows
    }

    cursor = nextCursor
  }

  console.warn(
    `[questionnaires] ${tableId} hit the ${MAX_PAGES}-page ceiling; results are truncated.`
  )

  return rows
}

/** The stored choice list becomes a labelled, render-ready list. */
export function toQuestionnaireItem(row: QuestionDocument): QuestionnaireItem {
  const stored = Array.isArray(row.choices) ? row.choices : []
  const answerIndex = row.answerIndex ?? 0

  const choices: QuestionnaireChoice[] = stored
    .map((text) => (typeof text === "string" ? text.trim() : ""))
    .filter((text) => text.length > 0)
    .map((text, index) => ({
      label: toChoiceLabel(index),
      text,
      isCorrect: index === answerIndex,
      order: index,
    }))

  return {
    id: row.$id,
    sku: row.sku ?? "",
    questionnaireId: row.questionnaireId ?? "",
    categoryId: row.categoryId ?? "",
    order: row.order ?? 0,
    prompt: row.prompt ?? "",
    questionType: (row.questionType ?? "multiple_choice") as QuestionType,
    difficulty: (row.difficulty ?? "medium") as QuestionDifficulty,
    explanation: row.explanation?.trim() ?? "",
    imageFileId: row.imageFileId?.trim() || null,
    choices,
    answerIndex,
    isFree: row.isFree === true,
  }
}

function toQuestionnaireSummary(
  row: QuestionnaireRowDocument,
  viewerIsPremium: boolean
): QuestionnaireSummary {
  const isPremium = row.isPremium === true

  return {
    id: row.$id,
    categoryId: row.categoryId ?? "",
    mode: (row.mode ?? "board_exam") as QuestionnaireMode,
    title: row.title ?? "Untitled",
    setCode: row.setCode?.trim() || null,
    description: row.description?.trim() ?? "",
    order: row.order ?? 1,
    code: row.code ?? "",
    questionCount: row.questionCount ?? 0,
    isPremium,
    isLocked: isPremium && !viewerIsPremium,
  }
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function listExamCategories(options?: {
  mode?: QuestionnaireMode
}): Promise<ExamCategorySummary[]> {
  assertConfigured()

  try {
    const [categoryRows, questionnaireRows] = await Promise.all([
      listAllRows<ExamCategoryDocument>(COLLECTIONS.EXAM_CATEGORIES, [
        Query.equal("isPublished", true),
        Query.orderAsc("order"),
      ]),
      listAllRows<QuestionnaireRowDocument>(COLLECTIONS.QUESTIONNAIRES, [
        Query.equal("isPublished", true),
        ...(options?.mode ? [Query.equal("mode", options.mode)] : []),
      ]),
    ])

    // Rolled up client-side because Appwrite has no aggregate query. The row
    // count here is categories × questionnaires, not questions, so it stays
    // small even with a full syllabus.
    const totals = new Map<string, { papers: number; questions: number }>()

    for (const row of questionnaireRows) {
      const categoryId = row.categoryId ?? ""
      const current = totals.get(categoryId) ?? { papers: 0, questions: 0 }

      current.papers += 1
      current.questions += row.questionCount ?? 0
      totals.set(categoryId, current)
    }

    return categoryRows
      .map((row) => {
        const total = totals.get(row.$id) ?? { papers: 0, questions: 0 }

        return {
          id: row.$id,
          title: row.title ?? "Untitled",
          code: row.code?.trim() || null,
          description: row.description?.trim() ?? "",
          order: row.order ?? 1,
          questionnaireCount: total.papers,
          questionCount: total.questions,
        }
      })
      // A category with no published papers is an authoring artefact, not
      // something a learner should be able to tap into an empty screen.
      .filter((category) => category.questionnaireCount > 0)
  } catch (error) {
    throw toContentError(error, "Unable to load exam categories.")
  }
}

export async function listQuestionnaires(options: {
  categoryId?: string
  mode?: QuestionnaireMode
  viewerIsPremium?: boolean
}): Promise<QuestionnaireSummary[]> {
  assertConfigured()

  try {
    const rows = await listAllRows<QuestionnaireRowDocument>(
      COLLECTIONS.QUESTIONNAIRES,
      [
        Query.equal("isPublished", true),
        ...(options.categoryId
          ? [Query.equal("categoryId", options.categoryId)]
          : []),
        ...(options.mode ? [Query.equal("mode", options.mode)] : []),
        Query.orderAsc("order"),
      ]
    )

    return rows.map((row) =>
      toQuestionnaireSummary(row, options.viewerIsPremium === true)
    )
  } catch (error) {
    throw toContentError(error, "Unable to load questionnaires.")
  }
}

export async function getQuestionnaireDetail(options: {
  questionnaireId: string
  viewerIsPremium?: boolean
}): Promise<QuestionnaireDetail> {
  assertConfigured()

  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const row = (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.QUESTIONNAIRES,
      rowId: options.questionnaireId,
    })) as unknown as QuestionnaireRowDocument

    const questionnaire = toQuestionnaireSummary(row, viewerIsPremium)

    const questionRows = await listAllRows<QuestionDocument>(
      COLLECTIONS.QUESTIONS,
      [
        Query.equal("questionnaireId", options.questionnaireId),
        Query.orderAsc("order"),
      ]
    )

    const allQuestions = questionRows.map(toQuestionnaireItem)

    // The paywall is applied on the way out, from each item's own `isFree`
    // flag. Which items make up the free sample is an editorial decision — you
    // want a representative spread, not whichever ones happen to sort first —
    // so it lives on the rows rather than as a count on the paper.
    if (viewerIsPremium || !questionnaire.isPremium) {
      return {
        questionnaire,
        questions: allQuestions,
        hiddenPremiumQuestionCount: 0,
      }
    }

    const visible = allQuestions.filter((question) => question.isFree)

    return {
      questionnaire,
      questions: visible,
      hiddenPremiumQuestionCount: allQuestions.length - visible.length,
    }
  } catch (error) {
    throw toContentError(error, "Unable to load this questionnaire.")
  }
}

/** Total published items in a category, for progress denominators. */
export async function countQuestionsInCategory(categoryId: string) {
  assertConfigured()

  try {
    const response = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: COLLECTIONS.QUESTIONS,
      queries: [Query.equal("categoryId", categoryId), Query.limit(1)],
    })

    return response.total ?? 0
  } catch (error) {
    throw toContentError(error, "Unable to count questions for this category.")
  }
}
