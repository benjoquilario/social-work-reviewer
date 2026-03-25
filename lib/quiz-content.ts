import {
  COLLECTIONS,
  createAppwriteContentError,
  createAppwritePermissionMessage,
  databases,
  DB_ID,
  getAppwriteConfigurationError,
  isAppwriteUnauthorizedError,
  Query,
} from "./appwrite"
import {
  type ChoiceDocument,
  type QuestionDocument,
  type SubjectDocument,
} from "./schema"

const QUIZ_QUERY_LIMIT = 500
const QUIZ_RESOURCES = [COLLECTIONS.QUESTIONS, COLLECTIONS.CHOICES]

export type QuizQuestion = {
  id: string
  questionId: string
  categoryId: string
  prompt: string
  choices: string[]
  answerIndex: number
  explanation: string
}

export type QuizCategoryDetail = {
  id: string
  name: string
  description: string
  totalQuestionCount: number
  availableQuestionCount: number
  freeQuestionCount: number
  premiumQuestionCount: number
  hasPremiumQuestions: boolean
  isLocked: boolean
}

function ensureQuizConfigured() {
  const configError = getAppwriteConfigurationError()

  if (configError) {
    throw createAppwriteContentError(
      "config",
      `${configError} Quiz questions now load only from Appwrite.`
    )
  }
}

function toQuizError(error: unknown, fallback: string) {
  if (isAppwriteUnauthorizedError(error)) {
    return createAppwriteContentError(
      "request",
      createAppwritePermissionMessage(QUIZ_RESOURCES)
    )
  }

  if (error instanceof Error && error.message) {
    return createAppwriteContentError("request", error.message)
  }

  return createAppwriteContentError("request", fallback)
}

function shuffleArray<T>(items: T[]): T[] {
  const clone = [...items]

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = clone[index]

    clone[index] = clone[randomIndex]
    clone[randomIndex] = current
  }

  return clone
}

async function listQuestionDocuments(subjectId?: string) {
  ensureQuizConfigured()

  const queries = [Query.orderAsc("createdAt"), Query.limit(QUIZ_QUERY_LIMIT)]

  if (subjectId && subjectId !== "all-categories") {
    queries.unshift(Query.equal("subjectId", subjectId))
  }

  const { documents } = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.QUESTIONS,
    queries
  )

  return documents as unknown as QuestionDocument[]
}

async function listChoiceDocuments(questionIds?: string[]) {
  ensureQuizConfigured()

  const { documents } = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.CHOICES,
    [Query.limit(QUIZ_QUERY_LIMIT)]
  )

  const choices = documents as unknown as ChoiceDocument[]

  if (!questionIds || questionIds.length === 0) {
    return choices
  }

  const questionIdSet = new Set(questionIds)
  return choices.filter((choice) => questionIdSet.has(choice.questionId))
}

function getVisibleQuestions(
  questions: QuestionDocument[],
  viewerIsPremium: boolean
) {
  return viewerIsPremium
    ? questions
    : questions.filter((question) => !question.isPremium)
}

export async function getQuizCategoryDetail(
  subjectId: string,
  options: { viewerIsPremium?: boolean } = {}
): Promise<QuizCategoryDetail | null> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const [subject, questions] = await Promise.all([
      databases.getDocument(DB_ID, COLLECTIONS.SUBJECTS, subjectId),
      listQuestionDocuments(subjectId),
    ])

    const typedSubject = subject as unknown as SubjectDocument
    const freeQuestionCount = questions.filter(
      (question) => !question.isPremium
    ).length
    const premiumQuestionCount = questions.length - freeQuestionCount
    const visibleQuestions = getVisibleQuestions(questions, viewerIsPremium)

    return {
      id: typedSubject.$id,
      name: typedSubject.name,
      description: typedSubject.description ?? "",
      totalQuestionCount: questions.length,
      availableQuestionCount: visibleQuestions.length,
      freeQuestionCount,
      premiumQuestionCount,
      hasPremiumQuestions: premiumQuestionCount > 0,
      isLocked:
        !viewerIsPremium && questions.length > 0 && freeQuestionCount === 0,
    }
  } catch (error) {
    throw toQuizError(error, "Unable to load quiz category from Appwrite.")
  }
}

export async function buildAppwriteQuizQuestions(options: {
  subjectId: string
  totalQuestions: number
  viewerIsPremium?: boolean
}): Promise<QuizQuestion[]> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const questions = await listQuestionDocuments(options.subjectId)
    const visibleQuestions = getVisibleQuestions(questions, viewerIsPremium)

    if (visibleQuestions.length === 0) {
      return []
    }

    const choices = await listChoiceDocuments(
      visibleQuestions.map((question) => question.$id)
    )
    const choicesByQuestionId = new Map<string, ChoiceDocument[]>()

    for (const choice of choices) {
      const current = choicesByQuestionId.get(choice.questionId) ?? []
      current.push(choice)
      choicesByQuestionId.set(choice.questionId, current)
    }

    const normalizedQuestions = visibleQuestions.flatMap((question) => {
      const questionChoices = choicesByQuestionId.get(question.$id) ?? []

      if (questionChoices.length < 2) {
        return []
      }

      const answerIndex = questionChoices.findIndex(
        (choice) => choice.isCorrect
      )
      if (answerIndex === -1) {
        return []
      }

      return [
        {
          id: question.$id,
          questionId: question.$id,
          categoryId: question.subjectId,
          prompt: question.questionText,
          choices: questionChoices.map((choice) => choice.choiceText),
          answerIndex,
          explanation: question.explanation,
        } satisfies QuizQuestion,
      ]
    })

    if (normalizedQuestions.length === 0) {
      return []
    }

    const selected: QuizQuestion[] = []

    while (selected.length < options.totalQuestions) {
      const chunk = shuffleArray(normalizedQuestions).map(
        (question, chunkIndex) => ({
          ...question,
          id: `${question.questionId}-attempt-${selected.length + chunkIndex + 1}`,
        })
      )

      selected.push(...chunk)
    }

    return selected.slice(0, options.totalQuestions)
  } catch (error) {
    throw toQuizError(error, "Unable to build quiz questions from Appwrite.")
  }
}
