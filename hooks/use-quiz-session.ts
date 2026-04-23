import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FlatList } from "react-native"

import {
  completeQuizAttempt,
  getLatestResumableAttempt,
  listAttemptAnswers,
  recordQuizAnswer,
  saveQuizResult,
  startQuizAttempt,
  syncOngoingAttemptProgress,
} from "@/lib/progress"
import type { QuizQuestion } from "@/lib/quiz-content"

export type UserAnswers = Record<number, number | undefined>

async function fetchAndMapResumedAttempt(
  resumableAttempt: { $id: string; timeTaken: number },
  questions: QuizQuestion[]
) {
  const answerRows = await listAttemptAnswers({ attemptId: resumableAttempt.$id })
  const choiceIdByQuestionId = new Map(
    answerRows.map((answerRow) => [answerRow.questionId, answerRow.choiceId])
  )
  
  const answeredIndices: number[] = []
  const unansweredIndices: number[] = []
  const restoredAnswersByOriginalIndex: UserAnswers = {}

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index]
    const selectedChoiceId = choiceIdByQuestionId.get(question.questionId)

    if (!selectedChoiceId) {
      unansweredIndices.push(index)
      continue
    }

    const selectedChoiceIndex = question.choiceIds.indexOf(selectedChoiceId)
    if (selectedChoiceIndex >= 0) {
      restoredAnswersByOriginalIndex[index] = selectedChoiceIndex
      answeredIndices.push(index)
    } else {
      unansweredIndices.push(index)
    }
  }

  const reorderedIndices = [...answeredIndices, ...unansweredIndices]
  const reorderedQuestions = reorderedIndices.map((i) => questions[i])

  const remappedAnswers: UserAnswers = {}
  for (let newIndex = 0; newIndex < reorderedIndices.length; newIndex++) {
    const originalIndex = reorderedIndices[newIndex]
    if (typeof restoredAnswersByOriginalIndex[originalIndex] === "number") {
      remappedAnswers[newIndex] = restoredAnswersByOriginalIndex[originalIndex]
    }
  }

  const firstUnansweredIndex = answeredIndices.length
  const safeIndex = Math.min(
    firstUnansweredIndex,
    Math.max(reorderedQuestions.length - 1, 0)
  )

  return { reorderedQuestions, remappedAnswers, safeIndex }
}

export interface UseQuizSessionProps {
  user: any
  profile: any
  categoryId: string
  examId: string
  activeExamId: string
  totalQuestions: number
  totalSeconds: number
  rawQuestions: QuizQuestion[]
  flatListRef: React.RefObject<FlatList<QuizQuestion> | null> | React.RefObject<FlatList<QuizQuestion>>
}

export function useQuizSession({
  user,
  profile,
  categoryId,
  examId,
  activeExamId,
  totalQuestions,
  totalSeconds,
  rawQuestions,
  flatListRef,
}: UseQuizSessionProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [answers, setAnswers] = useState<UserAnswers>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [isAttemptHydrating, setIsAttemptHydrating] = useState(false)
  const [didResumeAttempt, setDidResumeAttempt] = useState(false)

  const startTimeRef = useRef(Date.now())
  const hydratedAttemptKeyRef = useRef<string | null>(null)
  const activeIndexRef = useRef(0)
  const isSubmittedRef = useRef(false)

  const questionSignature = useMemo(
    () => rawQuestions.map((question) => question.questionId).join("|"),
    [rawQuestions]
  )

  useEffect(() => {
    if (rawQuestions.length > 0) {
      setQuestions(rawQuestions)
    }
  }, [rawQuestions])

  useEffect(() => {
    setActiveIndex(0)
    setAnswers({})
    setIsSubmitted(false)
    setAttemptId(null)
    setIsAttemptHydrating(false)
    setDidResumeAttempt(false)
    hydratedAttemptKeyRef.current = null
    activeIndexRef.current = 0
    isSubmittedRef.current = false
    startTimeRef.current = Date.now()
  }, [totalSeconds, categoryId, examId, totalQuestions])

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    isSubmittedRef.current = isSubmitted
  }, [isSubmitted])

  useEffect(() => {
    if (!user || !activeExamId || questions.length === 0 || isSubmitted) {
      return
    }

    const attemptKey = `${user.$id}:${activeExamId}:${questionSignature}:${totalSeconds}`
    if (hydratedAttemptKeyRef.current === attemptKey) {
      return
    }
    hydratedAttemptKeyRef.current = attemptKey

    let isCancelled = false
    setIsAttemptHydrating(true)

    void (async () => {
      try {
        const resumableAttempt = await getLatestResumableAttempt({
          userId: user.$id,
          examId: activeExamId,
        })

        if (isCancelled) return

        if (resumableAttempt) {
          const { reorderedQuestions, remappedAnswers, safeIndex } =
            await fetchAndMapResumedAttempt(resumableAttempt as any, questions)

          if (isCancelled) return

          setQuestions(reorderedQuestions)
          setAttemptId(resumableAttempt.$id)
          setAnswers(remappedAnswers)
          setActiveIndex(safeIndex)
          setDidResumeAttempt(true)
          activeIndexRef.current = safeIndex
          startTimeRef.current = Date.now() - Math.max(resumableAttempt.timeTaken, 0) * 1000

          requestAnimationFrame(() => {
            flatListRef.current?.scrollToIndex({
              index: safeIndex,
              animated: false,
            })
          })

          return
        }

        const nextAttemptId = await startQuizAttempt({
          userId: user.$id,
          examId: activeExamId,
          totalItems: questions.length,
        })

        if (!isCancelled) {
          setAttemptId(nextAttemptId)
          setDidResumeAttempt(false)
        }
      } catch {
        if (isCancelled) return
        try {
          const nextAttemptId = await startQuizAttempt({
            userId: user.$id,
            examId: activeExamId,
            totalItems: questions.length,
          })
          if (!isCancelled) {
            setAttemptId(nextAttemptId)
            setDidResumeAttempt(false)
          }
        } catch {}
      } finally {
        if (!isCancelled) {
          setIsAttemptHydrating(false)
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [activeExamId, isSubmitted, questionSignature, questions, totalSeconds, user, flatListRef])

  useEffect(() => {
    if (!attemptId || isSubmitted) {
      return
    }

    const timeoutId = setTimeout(() => {
      const elapsedSeconds = Math.round(
        (Date.now() - startTimeRef.current) / 1000
      )

      void syncOngoingAttemptProgress({
        attemptId,
        timeTaken: elapsedSeconds,
        currentQuestionIndex: activeIndexRef.current,
      })
    }, 900)

    return () => clearTimeout(timeoutId)
  }, [activeIndex, attemptId, isSubmitted])

  useEffect(() => {
    return () => {
      if (!attemptId || isSubmittedRef.current) {
        return
      }

      const elapsedSeconds = Math.round(
        (Date.now() - startTimeRef.current) / 1000
      )
      void syncOngoingAttemptProgress({
        attemptId,
        timeTaken: elapsedSeconds,
        currentQuestionIndex: activeIndexRef.current,
      })
    }
  }, [attemptId])

  const answeredCount = Object.values(answers).filter(
    (v) => typeof v === "number"
  ).length

  const result = useMemo(() => {
    let correct = 0
    questions.forEach((q, i) => {
      if (answers[i] === q.answerIndex) correct += 1
    })
    return { correct, wrong: questions.length - correct }
  }, [questions, answers])

  const handleSubmit = useCallback(async () => {
    setIsSubmitted(true)
    setShowSubmitModal(false)

    if (user && activeExamId) {
      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000)
      const trackedSubjectId =
        categoryId && categoryId !== "all-categories" ? categoryId : undefined

      try {
        if (attemptId) {
          await completeQuizAttempt({
            attemptId,
            userId: user.$id,
            examId: activeExamId,
            score: result.correct,
            totalItems: questions.length,
            timeTaken,
            subjectId: trackedSubjectId,
            topicId: activeExamId,
            profileSnapshot: profile ? {
              fullName: profile.fullName,
              schoolName: profile.schoolName,
              reviewType: profile.reviewType,
              avatarUrl: profile.avatarUrl,
            } : undefined,
          })
        } else {
          await saveQuizResult({
            userId: user.$id,
            examId: activeExamId,
            score: result.correct,
            totalItems: questions.length,
            timeTaken,
            status: "done",
            subjectId: trackedSubjectId,
            topicId: activeExamId,
            profileSnapshot: profile ? {
              fullName: profile.fullName,
              schoolName: profile.schoolName,
              reviewType: profile.reviewType,
              avatarUrl: profile.avatarUrl,
            } : undefined,
          })
        }
      } catch {}
    }
  }, [attemptId, categoryId, activeExamId, profile, questions.length, result.correct, user])

  const handleSelectAnswer = useCallback(
    (questionIndex: number, choiceIndex: number) => {
      if (answers[questionIndex] === choiceIndex) {
        return
      }

      setAnswers((previousAnswers) => {
        if (previousAnswers[questionIndex] === choiceIndex) {
          return previousAnswers
        }

        return {
          ...previousAnswers,
          [questionIndex]: choiceIndex,
        }
      })

      if (!attemptId) {
        return
      }

      const question = questions[questionIndex]
      const choiceId = question?.choiceIds[choiceIndex]

      if (!question || !choiceId) {
        return
      }

      void recordQuizAnswer({
        attemptId,
        userId: user?.$id,
        questionId: question.questionId,
        choiceId,
        isCorrect: choiceIndex === question.answerIndex,
        currentQuestionIndex: questionIndex,
      })
    },
    [answers, attemptId, questions, user?.$id]
  )

  return {
    questions,
    activeIndex,
    setActiveIndex,
    answers,
    isSubmitted,
    showSubmitModal,
    setShowSubmitModal,
    attemptId,
    isAttemptHydrating,
    didResumeAttempt,
    answeredCount,
    result,
    handleSubmit,
    handleSelectAnswer
  }
}
