import { FULL_EXAM_DUMMY_QUESTIONS } from "@/data/reviewer-data"

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
  type ChoiceDocument,
  type ExamDocument,
  type ExamQuestionDocument,
  type QuestionDocument,
  type SubjectDocument,
} from "./schema"

const QUIZ_QUERY_LIMIT = 500
const QUIZ_RESOURCES = [
  COLLECTIONS.SUBJECTS,
  COLLECTIONS.QUESTIONS,
  COLLECTIONS.CHOICES,
  COLLECTIONS.EXAMS,
  COLLECTIONS.EXAM_QUESTIONS,
]

export type QuizQuestion = {
  id: string
  questionId: string
  categoryId: string
  prompt: string
  choices: string[]
  choiceIds: string[]
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

export type QuizExamSummary = {
  id: string
  subjectId: string
  title: string
  type: ExamDocument["type"]
  totalItems: number
  timeLimit: number
  totalQuestionCount: number
  availableQuestionCount: number
  freeQuestionCount: number
  premiumQuestionCount: number
  hasPremiumQuestions: boolean
  isLocked: boolean
  isPremiumExam: boolean
  shouldShuffle: boolean
}

export type QuizExamDetail = QuizExamSummary & {
  subjectName: string
  subjectDescription: string
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

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.QUESTIONS,
    queries,
  })

  return rows as unknown as QuestionDocument[]
}

async function listExamDocuments(subjectId?: string) {
  ensureQuizConfigured()

  const queries = [Query.orderAsc("createdAt"), Query.limit(QUIZ_QUERY_LIMIT)]

  if (subjectId && subjectId !== "all-categories") {
    queries.unshift(Query.equal("subjectId", subjectId))
  }

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAMS,
    queries,
  })

  return rows as unknown as ExamDocument[]
}

async function getExamDocument(examId: string) {
  ensureQuizConfigured()

  const exam = await tablesDB.getRow({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAMS,
    rowId: examId,
  })

  return exam as unknown as ExamDocument
}

async function listExamQuestionDocuments(examId?: string) {
  ensureQuizConfigured()

  const queries = [Query.orderAsc("order"), Query.limit(QUIZ_QUERY_LIMIT)]

  if (examId) {
    queries.unshift(Query.equal("examId", examId))
  }

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.EXAM_QUESTIONS,
    queries,
  })

  return rows as unknown as ExamQuestionDocument[]
}

async function listChoiceDocuments(questionIds?: string[]) {
  ensureQuizConfigured()

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.CHOICES,
    queries: [Query.limit(QUIZ_QUERY_LIMIT)],
  })

  const choices = rows as unknown as ChoiceDocument[]

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

function buildQuestionMap(questions: QuestionDocument[]) {
  return new Map(questions.map((question) => [question.$id, question]))
}

function buildChoicesByQuestionId(choices: ChoiceDocument[]) {
  const choicesByQuestionId = new Map<string, ChoiceDocument[]>()

  for (const choice of choices) {
    const current = choicesByQuestionId.get(choice.questionId) ?? []
    current.push(choice)
    choicesByQuestionId.set(choice.questionId, current)
  }

  return choicesByQuestionId
}

function toQuizQuestion(
  question: QuestionDocument,
  questionChoices: ChoiceDocument[]
): QuizQuestion | null {
  if (questionChoices.length < 2) {
    return null
  }

  const answerIndex = questionChoices.findIndex((choice) => choice.isCorrect)

  if (answerIndex === -1) {
    return null
  }

  return {
    id: question.$id,
    questionId: question.$id,
    categoryId: question.subjectId,
    prompt: question.questionText,
    choices: questionChoices.map((choice) => choice.choiceText),
    choiceIds: questionChoices.map((choice) => choice.$id),
    answerIndex,
    explanation: question.explanation ?? "No explanation added yet.",
  }
}

function summarizeQuizExam(options: {
  exam: ExamDocument
  assignments: ExamQuestionDocument[]
  questionsById: Map<string, QuestionDocument>
  viewerIsPremium: boolean
}): QuizExamSummary {
  const { exam, assignments, questionsById, viewerIsPremium } = options
  const assignedQuestions = assignments.flatMap((assignment) => {
    const question = questionsById.get(assignment.questionId)
    return question ? [question] : []
  })
  const freeQuestionCount = assignedQuestions.filter(
    (question) => !question.isPremium
  ).length
  const premiumQuestionCount = assignedQuestions.length - freeQuestionCount
  const isPremiumExam = exam.isPremium === true
  const isLocked =
    !viewerIsPremium &&
    (isPremiumExam || (assignedQuestions.length > 0 && freeQuestionCount === 0))

  return {
    id: exam.$id,
    subjectId: exam.subjectId,
    title: exam.title,
    type: exam.type,
    totalItems: exam.totalItems,
    timeLimit: exam.timeLimit,
    totalQuestionCount: assignedQuestions.length,
    availableQuestionCount: isLocked
      ? 0
      : viewerIsPremium
        ? assignedQuestions.length
        : freeQuestionCount,
    freeQuestionCount,
    premiumQuestionCount,
    hasPremiumQuestions: premiumQuestionCount > 0,
    isLocked,
    isPremiumExam,
    shouldShuffle: assignments.some((assignment) => assignment.shuffle),
  }
}

function buildDummyFullExamQuizQuestions(
  totalQuestions: number
): QuizQuestion[] {
  const cappedTotal = Math.min(
    Math.max(totalQuestions, 1),
    FULL_EXAM_DUMMY_QUESTIONS.length
  )

  return shuffleArray(FULL_EXAM_DUMMY_QUESTIONS)
    .slice(0, cappedTotal)
    .map((question, index) => ({
      id: `${question.id}-session-${index + 1}`,
      questionId: question.id,
      categoryId: question.categoryId,
      prompt: question.prompt,
      choices: question.choices,
      choiceIds: question.choices.map(
        (_choice, choiceIndex) => `${question.id}-choice-${choiceIndex + 1}`
      ),
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    }))
}

export async function getQuizCategoryDetail(
  subjectId: string,
  options: { viewerIsPremium?: boolean } = {}
): Promise<QuizCategoryDetail | null> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const [subject, questions] = await Promise.all([
      tablesDB.getRow({
        databaseId: DB_ID,
        tableId: COLLECTIONS.SUBJECTS,
        rowId: subjectId,
      }),
      listQuestionDocuments(subjectId),
    ])

    const typedSubject = subject as unknown as SubjectDocument

    if (questions.length === 0) {
      return {
        id: typedSubject.$id,
        name: typedSubject.name,
        description: typedSubject.description ?? "",
        totalQuestionCount: 0,
        availableQuestionCount: 0,
        freeQuestionCount: 0,
        premiumQuestionCount: 0,
        hasPremiumQuestions: false,
        isLocked: false,
      }
    }

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

export async function listQuizExamsBySubjectId(
  subjectId: string,
  options: { viewerIsPremium?: boolean } = {}
): Promise<QuizExamSummary[]> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const exams = await listExamDocuments(subjectId)

    if (exams.length === 0) {
      return []
    }

    const examIds = new Set(exams.map((exam) => exam.$id))
    const [assignments, questions] = await Promise.all([
      listExamQuestionDocuments(),
      listQuestionDocuments(subjectId),
    ])
    const questionsById = buildQuestionMap(questions)
    const assignmentsByExamId = new Map<string, ExamQuestionDocument[]>()

    for (const assignment of assignments) {
      if (!examIds.has(assignment.examId)) {
        continue
      }

      const current = assignmentsByExamId.get(assignment.examId) ?? []
      current.push(assignment)
      assignmentsByExamId.set(assignment.examId, current)
    }

    return exams.map((exam) =>
      summarizeQuizExam({
        exam,
        assignments: assignmentsByExamId.get(exam.$id) ?? [],
        questionsById,
        viewerIsPremium,
      })
    )
  } catch (error) {
    throw toQuizError(error, "Unable to load subject exams from Appwrite.")
  }
}

export async function getQuizExamDetail(
  examId: string,
  options: { viewerIsPremium?: boolean } = {}
): Promise<QuizExamDetail> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const exam = await getExamDocument(examId)
    const [subject, assignments, questions] = await Promise.all([
      tablesDB.getRow({
        databaseId: DB_ID,
        tableId: COLLECTIONS.SUBJECTS,
        rowId: exam.subjectId,
      }),
      listExamQuestionDocuments(examId),
      listQuestionDocuments(exam.subjectId),
    ])
    const typedSubject = subject as unknown as SubjectDocument
    const summary = summarizeQuizExam({
      exam,
      assignments,
      questionsById: buildQuestionMap(questions),
      viewerIsPremium,
    })

    return {
      ...summary,
      subjectName: typedSubject.name,
      subjectDescription: typedSubject.description ?? "",
    }
  } catch (error) {
    throw toQuizError(error, "Unable to load exam details from Appwrite.")
  }
}

export async function buildAppwriteQuizQuestions(options: {
  subjectId: string
  examId?: string
  totalQuestions: number
  viewerIsPremium?: boolean
}): Promise<QuizQuestion[]> {
  const viewerIsPremium = options.viewerIsPremium === true
  const requestedTotal = Math.max(options.totalQuestions, 1)
  const targetTotal =
    options.subjectId === "all-categories"
      ? Math.min(requestedTotal, FULL_EXAM_DUMMY_QUESTIONS.length)
      : requestedTotal

  try {
    if (options.examId) {
      const exam = await getExamDocument(options.examId)

      if (!viewerIsPremium && exam.isPremium) {
        return []
      }

      const [assignments, questions] = await Promise.all([
        listExamQuestionDocuments(options.examId),
        listQuestionDocuments(exam.subjectId),
      ])
      const questionsById = buildQuestionMap(questions)
      const orderedVisibleQuestions = assignments.flatMap((assignment) => {
        const question = questionsById.get(assignment.questionId)

        if (!question) {
          return []
        }

        if (!viewerIsPremium && question.isPremium) {
          return []
        }

        return [question]
      })

      if (orderedVisibleQuestions.length === 0) {
        return []
      }

      const choicesByQuestionId = buildChoicesByQuestionId(
        await listChoiceDocuments(
          orderedVisibleQuestions.map((question) => question.$id)
        )
      )
      const normalizedQuestions = orderedVisibleQuestions.flatMap(
        (question) => {
          const quizQuestion = toQuizQuestion(
            question,
            choicesByQuestionId.get(question.$id) ?? []
          )

          return quizQuestion ? [quizQuestion] : []
        }
      )

      if (normalizedQuestions.length === 0) {
        return []
      }

      const examQuestions = assignments.some((assignment) => assignment.shuffle)
        ? shuffleArray(normalizedQuestions)
        : normalizedQuestions

      return examQuestions.slice(0, requestedTotal).map((question, index) => ({
        ...question,
        id: `${question.questionId}-attempt-${index + 1}`,
      }))
    }

    const questions = await listQuestionDocuments(options.subjectId)
    const visibleQuestions = getVisibleQuestions(questions, viewerIsPremium)

    if (visibleQuestions.length === 0) {
      if (options.subjectId === "all-categories") {
        return buildDummyFullExamQuizQuestions(targetTotal)
      }

      return []
    }

    const choicesByQuestionId = buildChoicesByQuestionId(
      await listChoiceDocuments(
        visibleQuestions.map((question) => question.$id)
      )
    )

    const normalizedQuestions = visibleQuestions.flatMap((question) => {
      const quizQuestion = toQuizQuestion(
        question,
        choicesByQuestionId.get(question.$id) ?? []
      )

      return quizQuestion ? [quizQuestion] : []
    })

    if (normalizedQuestions.length === 0) {
      if (options.subjectId === "all-categories") {
        return buildDummyFullExamQuizQuestions(targetTotal)
      }

      return []
    }

    const selected: QuizQuestion[] = []

    while (selected.length < targetTotal) {
      const chunk = shuffleArray(normalizedQuestions).map(
        (question, chunkIndex) => ({
          ...question,
          id: `${question.questionId}-attempt-${selected.length + chunkIndex + 1}`,
        })
      )

      selected.push(...chunk)
    }

    return selected.slice(0, targetTotal)
  } catch (error) {
    throw toQuizError(error, "Unable to build quiz questions from Appwrite.")
  }
}
