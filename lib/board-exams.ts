import {
  APPWRITE_CONFIG,
  Query,
  createAppwriteContentError,
  storage,
} from "./appwrite"
import {
  getBoardExamCatalogCategory,
  getBoardExamCatalogSet,
  listBoardExamCatalogCategories,
  type BoardExamCatalogCategory,
  type BoardExamCatalogSet,
} from "./board-exam-catalog"
import type { QuestionnaireDocument, QuestionnaireQuestion } from "./schema"

const BOARD_EXAM_RESOURCE_LABEL = "board exam questionnaire JSON"

/**
 * Maximum number of questions visible to free-tier users per set.
 * Questions beyond this limit require a premium subscription.
 */
export const FREE_QUESTION_LIMIT = 10

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
  questionType: "multiple_choice"
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
  questionType: "multiple_choice"
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

const questionnaireCache = new Map<string, Promise<QuestionnaireDocument>>()

function toBoardExamError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return createAppwriteContentError("request", error.message)
  }

  return createAppwriteContentError("request", fallback)
}

function canUseQuestionnaireStorage() {
  return Boolean(
    APPWRITE_CONFIG.endpoint &&
      APPWRITE_CONFIG.projectId &&
      APPWRITE_CONFIG.platform &&
      APPWRITE_CONFIG.questionnaireBucketId
  )
}

function decodeUtf8(arrayBuffer: ArrayBuffer) {
  return new TextDecoder("utf-8").decode(arrayBuffer)
}

function isQuestionnaireDocument(value: unknown): value is QuestionnaireDocument {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<QuestionnaireDocument>
  return (
    typeof candidate.questionnaire === "string" &&
    typeof candidate.set === "string" &&
    typeof candidate.questionCount === "number" &&
    Array.isArray(candidate.questions)
  )
}

function normalizeQuestionnaireDocument(
  value: unknown,
  sourceLabel: string
): QuestionnaireDocument {
  if (!isQuestionnaireDocument(value)) {
    throw createAppwriteContentError(
      "request",
      `Invalid ${BOARD_EXAM_RESOURCE_LABEL} payload from ${sourceLabel}.`
    )
  }

  return {
    questionnaire: value.questionnaire,
    set: value.set,
    questionCount: value.questionCount,
    questions: value.questions.map((question) => ({
      id: Number(question.id),
      type: "multiple_choice",
      question: String(question.question ?? ""),
      options: Array.isArray(question.options)
        ? question.options.map((option) => ({
            key: String(option.key ?? ""),
            text: String(option.text ?? ""),
          }))
        : [],
      answer: {
        key: String(question.answer?.key ?? ""),
        text: String(question.answer?.text ?? ""),
      },
    })),
  }
}

async function resolveStorageFileId(set: BoardExamCatalogSet) {
  if (set.storageFileId) {
    return set.storageFileId
  }

  if (!set.storageFileName) {
    return null
  }

  const response = await storage.listFiles({
    bucketId: APPWRITE_CONFIG.questionnaireBucketId,
    queries: [Query.limit(100)],
  })

  const matchedFile =
    response.files.find((file) => file.name === set.storageFileName) ?? null

  return matchedFile?.$id ?? null
}

async function loadQuestionnaireFromStorage(set: BoardExamCatalogSet) {
  if (!canUseQuestionnaireStorage()) {
    return null
  }

  const fileId = await resolveStorageFileId(set)

  if (!fileId) {
    return null
  }

  const fileBuffer = await storage.getFileView({
    bucketId: APPWRITE_CONFIG.questionnaireBucketId,
    fileId,
  })

  return normalizeQuestionnaireDocument(
    JSON.parse(decodeUtf8(fileBuffer)),
    `Appwrite Storage file ${fileId}`
  )
}

function loadQuestionnaireFromLocalFile(set: BoardExamCatalogSet) {
  return normalizeQuestionnaireDocument(
    set.loadLocal(),
    `local questionnaire ${set.questionnaireKey}/${set.setCode}`
  )
}

async function loadQuestionnaireForSet(set: BoardExamCatalogSet) {
  const cacheKey = set.id
  const cached = questionnaireCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const pending = (async () => {
    try {
      const storageDocument = await loadQuestionnaireFromStorage(set)
      if (storageDocument) {
        return storageDocument
      }
    } catch {}

    return loadQuestionnaireFromLocalFile(set)
  })()

  questionnaireCache.set(cacheKey, pending)
  return pending
}

function buildChoiceId(setId: string, questionId: number, key: string) {
  return `${setId}-q${questionId}-${key.toLowerCase()}`
}

function toBoardExamQuestion(
  set: BoardExamCatalogSet,
  category: BoardExamCatalogCategory,
  question: QuestionnaireQuestion,
  index: number
): BoardExamQuestion {
  const choices = question.options.map((option, optionIndex) => ({
    id: buildChoiceId(set.id, question.id, option.key),
    key: option.key,
    text: option.text,
    isCorrect: option.key === question.answer.key,
    order: optionIndex + 1,
  }))

  return {
    id: `${set.id}-q${question.id}`,
    categoryId: category.id,
    setId: set.id,
    prompt: question.question,
    explanation: "",
    questionType: "multiple_choice",
    order: index + 1,
    isPremium: set.isPremium === true,
    choices,
    correctChoiceKeys: [question.answer.key],
  }
}

async function summarizeSet(
  set: BoardExamCatalogSet,
  options: { viewerIsPremium: boolean }
): Promise<BoardExamSetSummary> {
  const document = await loadQuestionnaireForSet(set)
  const totalQuestionCount = document.questions.length
  const freeQuestionCount = Math.min(totalQuestionCount, FREE_QUESTION_LIMIT)
  const availableQuestionCount = options.viewerIsPremium
    ? totalQuestionCount
    : freeQuestionCount
  const premiumQuestionCount = Math.max(
    totalQuestionCount - freeQuestionCount,
    0
  )
  const isLocked = availableQuestionCount === 0

  return {
    id: set.id,
    categoryId: set.categoryId,
    title: set.title,
    setCode: set.setCode,
    description: set.description,
    questionType: set.questionType,
    totalItems: totalQuestionCount,
    order: set.order,
    totalQuestionCount,
    availableQuestionCount,
    freeQuestionCount,
    premiumQuestionCount,
    hasPremiumQuestions: premiumQuestionCount > 0,
    isLocked,
  }
}

async function summarizeCategory(
  category: BoardExamCatalogCategory,
  options: { viewerIsPremium: boolean }
): Promise<BoardExamCategorySummary> {
  const setSummaries = await Promise.all(
    category.sets.map((set) => summarizeSet(set, options))
  )

  return {
    id: category.id,
    title: category.title,
    description: category.description,
    code: category.code,
    order: category.order,
    setCount: setSummaries.length,
    totalQuestionCount: setSummaries.reduce(
      (total, set) => total + set.totalQuestionCount,
      0
    ),
    availableQuestionCount: setSummaries.reduce(
      (total, set) => total + set.availableQuestionCount,
      0
    ),
    freeQuestionCount: setSummaries.reduce(
      (total, set) => total + set.freeQuestionCount,
      0
    ),
    premiumQuestionCount: setSummaries.reduce(
      (total, set) => total + set.premiumQuestionCount,
      0
    ),
    isLocked:
      setSummaries.length > 0 &&
      setSummaries.every((setSummary) => setSummary.isLocked),
  }
}

export async function listBoardExamCategories(
  options: { viewerIsPremium?: boolean } = {}
): Promise<BoardExamCategorySummary[]> {
  try {
    const viewerIsPremium = options.viewerIsPremium === true
    const categories = listBoardExamCatalogCategories()

    return await Promise.all(
      categories.map((category) =>
        summarizeCategory(category, { viewerIsPremium })
      )
    )
  } catch (error) {
    throw toBoardExamError(
      error,
      "Unable to load board exam categories from questionnaire JSON."
    )
  }
}

export async function listBoardExamSetsByCategoryId(
  categoryId: string,
  options: { viewerIsPremium?: boolean } = {}
): Promise<BoardExamSetListResult> {
  try {
    const viewerIsPremium = options.viewerIsPremium === true
    const category = getBoardExamCatalogCategory(categoryId)

    if (!category) {
      return {
        category: null,
        sets: [],
      }
    }

    const [categorySummary, sets] = await Promise.all([
      summarizeCategory(category, { viewerIsPremium }),
      Promise.all(
        [...category.sets]
          .sort((left, right) => left.order - right.order)
          .map((set) => summarizeSet(set, { viewerIsPremium }))
      ),
    ])

    return {
      category: categorySummary,
      sets,
    }
  } catch (error) {
    throw toBoardExamError(
      error,
      "Unable to load board exam sets from questionnaire JSON."
    )
  }
}

export async function getBoardExamSetDetail(
  categoryId: string,
  setId: string,
  options: { viewerIsPremium?: boolean } = {}
): Promise<BoardExamSetDetail> {
  try {
    const viewerIsPremium = options.viewerIsPremium === true
    const category = getBoardExamCatalogCategory(categoryId)
    const set = getBoardExamCatalogSet(setId)

    if (!category || !set || set.categoryId !== categoryId) {
      return {
        category: null,
        set: null,
        questions: [],
        hiddenPremiumQuestionCount: 0,
      }
    }

    const [categorySummary, setSummary, questionnaire] = await Promise.all([
      summarizeCategory(category, { viewerIsPremium }),
      summarizeSet(set, { viewerIsPremium }),
      loadQuestionnaireForSet(set),
    ])

    const allQuestions = questionnaire.questions.map((question, index) =>
      toBoardExamQuestion(set, category, question, index)
    )
    const visibleQuestions = viewerIsPremium
      ? allQuestions
      : allQuestions.slice(0, FREE_QUESTION_LIMIT)
    const hiddenPremiumQuestionCount = Math.max(
      allQuestions.length - visibleQuestions.length,
      0
    )

    return {
      category: categorySummary,
      set: setSummary,
      questions: visibleQuestions,
      hiddenPremiumQuestionCount,
    }
  } catch (error) {
    throw toBoardExamError(
      error,
      "Unable to load board exam question set from questionnaire JSON."
    )
  }
}

export async function getBoardExamSetById(
  setId: string,
  options: { viewerIsPremium?: boolean } = {}
): Promise<BoardExamSetSummary | null> {
  try {
    const set = getBoardExamCatalogSet(setId)

    if (!set) {
      return null
    }

    return await summarizeSet(set, {
      viewerIsPremium: options.viewerIsPremium === true,
    })
  } catch (error) {
    throw toBoardExamError(
      error,
      "Unable to load the board exam set from questionnaire JSON."
    )
  }
}
