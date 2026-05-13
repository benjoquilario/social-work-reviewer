import {
  createAppwriteContentError,
  type AppwriteContentError,
} from "./appwrite"
import type { QuizQuestion } from "./quiz-types"

export type { QuizQuestion } from "./quiz-types"

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
  type: "mock" | "practice" | "topic"
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

function createLegacyQuizRemovedError(): AppwriteContentError {
  return createAppwriteContentError(
    "not-found",
    "Legacy Appwrite quiz categories and exam questions were removed. Use board exam questionnaire sets instead."
  )
}

export async function getQuizCategoryDetail(_categoryId: string): Promise<QuizCategoryDetail> {
  throw createLegacyQuizRemovedError()
}

export async function listQuizExamsBySubjectId(
  _subjectId: string
): Promise<QuizExamSummary[]> {
  return []
}

export async function getQuizExamDetail(_examId: string): Promise<QuizExamDetail> {
  throw createLegacyQuizRemovedError()
}

export async function buildAppwriteQuizQuestions(
  _options: {
    subjectId: string
    examId?: string
    totalQuestions: number
    viewerIsPremium?: boolean
  }
): Promise<QuizQuestion[]> {
  return []
}
