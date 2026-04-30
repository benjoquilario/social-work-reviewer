import {
  COLLECTIONS,
  createAppwriteContentError,
  createAppwritePermissionMessage,
  DB_ID,
  getAppwriteConfigurationError,
  isAppwriteUnauthorizedError,
  Query,
  tablesDB,
} from "./appwrite"
import {
  type BoardExamCategoryDocument,
  type BoardExamChoiceDocument,
  type BoardExamQuestionDocument,
  type BoardExamSetDocument,
} from "./schema"

const BOARD_EXAM_QUERY_LIMIT = 500
const BOARD_EXAM_IN_QUERY_CHUNK_SIZE = 50
const BOARD_EXAM_RESOURCES = [
  COLLECTIONS.BOARD_EXAM_CATEGORIES,
  COLLECTIONS.BOARD_EXAM_SETS,
  COLLECTIONS.BOARD_EXAM_QUESTIONS,
  COLLECTIONS.BOARD_EXAM_CHOICES,
]

export type BoardExamCategorySummary = {
  id: string
  title: string
  description: string
  code: string | null
  order: number
  setCount: number
  totalQuestionCount: number
  availableQuestionCount: number
  freeQuestionCount: number
  premiumQuestionCount: number
  isLocked: boolean
}

export type BoardExamSetSummary = {
  id: string
  categoryId: string
  title: string
  setCode: string
  description: string
  questionType: BoardExamSetDocument["questionType"]
  totalItems: number
  order: number
  totalQuestionCount: number
  availableQuestionCount: number
  freeQuestionCount: number
  premiumQuestionCount: number
  hasPremiumQuestions: boolean
  isLocked: boolean
}

export type BoardExamChoice = {
  id: string
  key: string
  text: string
  isCorrect: boolean
  order: number
}

export type BoardExamQuestion = {
  id: string
  categoryId: string
  setId: string
  prompt: string
  explanation: string
  questionType: BoardExamQuestionDocument["questionType"]
  order: number
  isPremium: boolean
  choices: BoardExamChoice[]
  correctChoiceKeys: string[]
}

export type BoardExamSetListResult = {
  category: BoardExamCategorySummary | null
  sets: BoardExamSetSummary[]
}

export type BoardExamSetDetail = {
  category: BoardExamCategorySummary | null
  set: BoardExamSetSummary | null
  questions: BoardExamQuestion[]
  hiddenPremiumQuestionCount: number
}

function ensureBoardExamConfigured() {
  const configError = getAppwriteConfigurationError()

  if (configError) {
    throw createAppwriteContentError(
      "config",
      `${configError} Board exam resources now load only from Appwrite.`
    )
  }
}

function toBoardExamError(error: unknown, fallback: string) {
  if (isAppwriteUnauthorizedError(error)) {
    return createAppwriteContentError(
      "request",
      createAppwritePermissionMessage(BOARD_EXAM_RESOURCES)
    )
  }

  if (error instanceof Error && error.message) {
    return createAppwriteContentError("request", error.message)
  }

  return createAppwriteContentError("request", fallback)
}

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order)
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

async function listBoardExamCategoryDocuments() {
  ensureBoardExamConfigured()

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.BOARD_EXAM_CATEGORIES,
    queries: [Query.orderAsc("order"), Query.limit(BOARD_EXAM_QUERY_LIMIT)],
  })

  return rows as unknown as BoardExamCategoryDocument[]
}

async function getBoardExamCategoryDocument(categoryId: string) {
  ensureBoardExamConfigured()

  const row = await tablesDB.getRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.BOARD_EXAM_CATEGORIES,
    rowId: categoryId,
  })

  return row as unknown as BoardExamCategoryDocument
}

async function listBoardExamSetDocuments(categoryId?: string) {
  ensureBoardExamConfigured()

  const queries = [Query.orderAsc("order"), Query.limit(BOARD_EXAM_QUERY_LIMIT)]

  if (categoryId) {
    queries.unshift(Query.equal("categoryId", categoryId))
  }

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.BOARD_EXAM_SETS,
    queries,
  })

  return rows as unknown as BoardExamSetDocument[]
}

async function getBoardExamSetDocument(setId: string) {
  ensureBoardExamConfigured()

  const row = await tablesDB.getRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.BOARD_EXAM_SETS,
    rowId: setId,
  })

  return row as unknown as BoardExamSetDocument
}

async function listBoardExamQuestionDocuments(categoryId?: string) {
  ensureBoardExamConfigured()

  const queries = [Query.orderAsc("order"), Query.limit(BOARD_EXAM_QUERY_LIMIT)]

  if (categoryId) {
    queries.unshift(Query.equal("categoryId", categoryId))
  }

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.BOARD_EXAM_QUESTIONS,
    queries,
  })

  return rows as unknown as BoardExamQuestionDocument[]
}

async function listBoardExamQuestionDocumentsBySetId(setId: string) {
  ensureBoardExamConfigured()

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.BOARD_EXAM_QUESTIONS,
    queries: [
      Query.equal("setId", setId),
      Query.orderAsc("order"),
      Query.limit(BOARD_EXAM_QUERY_LIMIT),
    ],
  })

  return rows as unknown as BoardExamQuestionDocument[]
}

async function listBoardExamChoiceDocuments(questionIds?: string[]) {
  ensureBoardExamConfigured()

  const uniqueQuestionIds = uniqueStrings(questionIds ?? [])

  if (uniqueQuestionIds.length === 0) {
    return [] as BoardExamChoiceDocument[]
  }

  const results = await Promise.all(
    chunkValues(uniqueQuestionIds, BOARD_EXAM_IN_QUERY_CHUNK_SIZE).map(
      (chunk) =>
        tablesDB.listRows({
          databaseId: DB_ID,
          tableId: COLLECTIONS.BOARD_EXAM_CHOICES,
          queries: [
            Query.equal("questionId", chunk),
            Query.orderAsc("order"),
            Query.limit(BOARD_EXAM_QUERY_LIMIT),
          ],
        })
    )
  )

  return results.flatMap(
    (result) => result.rows as unknown as BoardExamChoiceDocument[]
  )
}

function summarizeCategory(options: {
  category: BoardExamCategoryDocument
  sets: BoardExamSetDocument[]
  questions: BoardExamQuestionDocument[]
  viewerIsPremium: boolean
}): BoardExamCategorySummary {
  const { category, sets, questions, viewerIsPremium } = options

  const freeQuestionCount = questions.filter(
    (question) => !question.isPremium
  ).length
  const premiumQuestionCount = questions.length - freeQuestionCount
  const isLocked =
    !viewerIsPremium && questions.length > 0 && freeQuestionCount === 0

  return {
    id: category.$id,
    title: category.title,
    description: category.description ?? "",
    code: category.code ?? null,
    order: category.order,
    setCount: sets.length,
    totalQuestionCount: questions.length,
    availableQuestionCount: isLocked
      ? 0
      : viewerIsPremium
        ? questions.length
        : freeQuestionCount,
    freeQuestionCount,
    premiumQuestionCount,
    isLocked,
  }
}

function summarizeSet(options: {
  set: BoardExamSetDocument
  questions: BoardExamQuestionDocument[]
  viewerIsPremium: boolean
}): BoardExamSetSummary {
  const { set, questions, viewerIsPremium } = options

  const freeQuestionCount = questions.filter(
    (question) => !question.isPremium
  ).length
  const premiumQuestionCount = questions.length - freeQuestionCount
  const isLocked =
    !viewerIsPremium && questions.length > 0 && freeQuestionCount === 0

  return {
    id: set.$id,
    categoryId: set.categoryId,
    title: set.title,
    setCode: set.setCode,
    description: set.description ?? "",
    questionType: set.questionType,
    totalItems: set.totalItems,
    order: set.order,
    totalQuestionCount: questions.length,
    availableQuestionCount: isLocked
      ? 0
      : viewerIsPremium
        ? questions.length
        : freeQuestionCount,
    freeQuestionCount,
    premiumQuestionCount,
    hasPremiumQuestions: premiumQuestionCount > 0,
    isLocked,
  }
}

function buildQuestionsBySetId(questions: BoardExamQuestionDocument[]) {
  const questionsBySetId = new Map<string, BoardExamQuestionDocument[]>()

  for (const question of questions) {
    const current = questionsBySetId.get(question.setId) ?? []
    current.push(question)
    questionsBySetId.set(question.setId, current)
  }

  return questionsBySetId
}

function buildChoicesByQuestionId(choices: BoardExamChoiceDocument[]) {
  const choicesByQuestionId = new Map<string, BoardExamChoiceDocument[]>()

  for (const choice of choices) {
    const current = choicesByQuestionId.get(choice.questionId) ?? []
    current.push(choice)
    choicesByQuestionId.set(choice.questionId, sortByOrder(current))
  }

  return choicesByQuestionId
}

function toBoardExamQuestion(
  question: BoardExamQuestionDocument,
  questionChoices: BoardExamChoiceDocument[]
): BoardExamQuestion {
  const choices = sortByOrder(questionChoices).map((choice) => ({
    id: choice.$id,
    key: choice.choiceKey,
    text: choice.choiceText,
    isCorrect: choice.isCorrect,
    order: choice.order,
  }))

  return {
    id: question.$id,
    categoryId: question.categoryId,
    setId: question.setId,
    prompt: question.questionText,
    explanation: question.explanation ?? "",
    questionType: question.questionType,
    order: question.order,
    isPremium: question.isPremium,
    choices,
    correctChoiceKeys: choices
      .filter((choice) => choice.isCorrect)
      .map((choice) => choice.key),
  }
}

export async function listBoardExamCategories(
  options: { viewerIsPremium?: boolean } = {}
): Promise<BoardExamCategorySummary[]> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const [categories, sets, questions] = await Promise.all([
      listBoardExamCategoryDocuments(),
      listBoardExamSetDocuments(),
      listBoardExamQuestionDocuments(),
    ])

    const setsByCategoryId = new Map<string, BoardExamSetDocument[]>()
    for (const set of sets) {
      const current = setsByCategoryId.get(set.categoryId) ?? []
      current.push(set)
      setsByCategoryId.set(set.categoryId, sortByOrder(current))
    }

    const questionsByCategoryId = new Map<string, BoardExamQuestionDocument[]>()
    for (const question of questions) {
      const current = questionsByCategoryId.get(question.categoryId) ?? []
      current.push(question)
      questionsByCategoryId.set(question.categoryId, sortByOrder(current))
    }

    return sortByOrder(categories).map((category) =>
      summarizeCategory({
        category,
        sets: setsByCategoryId.get(category.$id) ?? [],
        questions: questionsByCategoryId.get(category.$id) ?? [],
        viewerIsPremium,
      })
    )
  } catch (error) {
    throw toBoardExamError(
      error,
      "Unable to load board exam categories from Appwrite."
    )
  }
}

export async function listBoardExamSetsByCategoryId(
  categoryId: string,
  options: { viewerIsPremium?: boolean } = {}
): Promise<BoardExamSetListResult> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const [category, sets, questions] = await Promise.all([
      getBoardExamCategoryDocument(categoryId),
      listBoardExamSetDocuments(categoryId),
      listBoardExamQuestionDocuments(categoryId),
    ])

    if (!category) {
      return {
        category: null,
        sets: [],
      }
    }

    const questionsBySetId = buildQuestionsBySetId(questions)
    const sortedSets = sortByOrder(sets)

    return {
      category: summarizeCategory({
        category,
        sets: sortedSets,
        questions,
        viewerIsPremium,
      }),
      sets: sortedSets.map((set) =>
        summarizeSet({
          set,
          questions: sortByOrder(questionsBySetId.get(set.$id) ?? []),
          viewerIsPremium,
        })
      ),
    }
  } catch (error) {
    throw toBoardExamError(error, "Unable to load board exam sets.")
  }
}

export async function getBoardExamSetDetail(
  categoryId: string,
  setId: string,
  options: { viewerIsPremium?: boolean } = {}
): Promise<BoardExamSetDetail> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const [category, sets, set, questions, setQuestions] = await Promise.all([
      getBoardExamCategoryDocument(categoryId),
      listBoardExamSetDocuments(categoryId),
      getBoardExamSetDocument(setId),
      listBoardExamQuestionDocuments(categoryId),
      listBoardExamQuestionDocumentsBySetId(setId),
    ])

    if (!category || !set || set.categoryId !== categoryId) {
      return {
        category: null,
        set: null,
        questions: [],
        hiddenPremiumQuestionCount: 0,
      }
    }

    const categorySets = sortByOrder(sets)
    const categoryQuestions = sortByOrder(questions)
    const sortedSetQuestions = sortByOrder(setQuestions)
    const visibleQuestions = viewerIsPremium
      ? sortedSetQuestions
      : sortedSetQuestions.filter((question) => !question.isPremium)
    const hiddenPremiumQuestionCount = viewerIsPremium
      ? 0
      : sortedSetQuestions.length - visibleQuestions.length

    const choicesByQuestionId = buildChoicesByQuestionId(
      await listBoardExamChoiceDocuments(
        visibleQuestions.map((question) => question.$id)
      )
    )

    return {
      category: summarizeCategory({
        category,
        sets: categorySets,
        questions: categoryQuestions,
        viewerIsPremium,
      }),
      set: summarizeSet({
        set,
        questions: sortedSetQuestions,
        viewerIsPremium,
      }),
      questions: visibleQuestions.map((question) =>
        toBoardExamQuestion(
          question,
          choicesByQuestionId.get(question.$id) ?? []
        )
      ),
      hiddenPremiumQuestionCount,
    }
  } catch (error) {
    throw toBoardExamError(error, "Unable to load board exam question set.")
  }
}

export async function getBoardExamSetById(
  setId: string,
  options: { viewerIsPremium?: boolean } = {}
): Promise<BoardExamSetSummary | null> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const [set, questions] = await Promise.all([
      getBoardExamSetDocument(setId),
      listBoardExamQuestionDocumentsBySetId(setId),
    ])

    if (!set) {
      return null
    }

    const setQuestions = sortByOrder(questions)

    return summarizeSet({
      set,
      questions: setQuestions,
      viewerIsPremium,
    })
  } catch (error) {
    throw toBoardExamError(error, "Unable to load the board exam set.")
  }
}
