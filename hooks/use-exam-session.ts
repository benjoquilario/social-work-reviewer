import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as Haptics from "expo-haptics"

import type { ExamCategory } from "@/lib/content/exam-categories"
import type { QuestionSet } from "@/lib/content/question-sets"
import type { ExamQuestion } from "@/lib/content/questions"
import type { MemberProfile } from "@/lib/member/profile"
import {
  isExplanationApplicable,
  resolveTimerSeconds,
  type MemberSettings,
} from "@/lib/member/settings"
import { recordAnswer } from "@/lib/session/answers"
import { completeStudySession } from "@/lib/session/complete"
import {
  buildQuestionPool,
  type PresentedChoice,
  type PresentedQuestion,
} from "@/lib/session/question-pool"
import { restoreSessionAnswers } from "@/lib/session/resume"
import {
  findResumableSession,
  saveSessionProgress,
  startStudySession,
  type StudyMode,
  type StudySession,
} from "@/lib/session/study-session"
import { getMemberTypeDisplay } from "@/lib/member/profile"

/**
 * ─── Running a sitting ────────────────────────────────────────────────────
 *
 * One state machine for the whole thing: open or resume a `study_sessions`
 * row, build the sequence from the member's settings, write an answer row per
 * item, checkpoint as they go, and close it at the end.
 *
 * Three rules it exists to enforce:
 *
 *   • An answer records the choice's **original** index, never the row it was
 *     tapped on — under `shuffleChoices` those differ (section 8).
 *   • `feedbackTiming` decides when anything is revealed, and under `at_end`
 *     nothing is revealed at all until the results screen.
 *   • Submitting twice records the sitting twice. The countdown expiring and
 *     the member confirming the dialog can both land in the same tick, so the
 *     guard is a ref, not state — `setState` does not take effect until the
 *     next render.
 */

export type ExamSessionStatus =
  | "idle"
  | "preparing"
  | "ready"
  | "submitting"
  | "complete"
  | "error"

export type ExamSessionResult = {
  correctCount: number
  answeredCount: number
  questionCount: number
  durationSeconds: number
  scorePercent: number
}

export type UseExamSessionInput = {
  userId: string | undefined
  profile: MemberProfile | null
  category: ExamCategory | null
  set: QuestionSet | null
  questions: ExamQuestion[]
  settings: MemberSettings
  mode: StudyMode
  /** Overrides `settings.questionsPerSession` for this sitting. */
  questionLimit?: number
  /** Overrides the timer for this sitting. */
  minutes?: number
  answeredSkus?: ReadonlySet<string>
  incorrectSkus?: ReadonlySet<string>
  bookmarkedSkus?: ReadonlySet<string>
  /** Wait for content and settings before opening a session row. */
  enabled?: boolean
}

const CHECKPOINT_DELAY_MS = 1200

export function useExamSession(input: UseExamSessionInput) {
  const {
    userId,
    profile,
    category,
    set,
    questions,
    settings,
    mode,
    questionLimit,
    minutes,
    answeredSkus,
    incorrectSkus,
    bookmarkedSkus,
    enabled = true,
  } = input

  const [status, setStatus] = useState<ExamSessionStatus>("idle")
  const [session, setSession] = useState<StudySession | null>(null)
  const [pool, setPool] = useState<PresentedQuestion[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [answers, setAnswers] = useState<ReadonlyMap<number, number>>(new Map())
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set())
  const [startedAtMs, setStartedAtMs] = useState(() => Date.now())
  const [didResume, setDidResume] = useState(false)
  const [result, setResult] = useState<ExamSessionResult | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const hasSubmittedRef = useRef(false)
  const openedKeyRef = useRef<string | null>(null)
  const answerStartRef = useRef(Date.now())

  // The sitting is re-opened when its identity changes, not on every render of
  // the same paper.
  const sessionKey = useMemo(() => {
    if (!userId || !category) {
      return null
    }

    return [
      userId,
      category.id,
      set?.id ?? "",
      mode,
      questionLimit ?? settings.questionsPerSession,
      settings.questionSource,
      settings.difficultyFilter,
    ].join("|")
  }, [
    category,
    mode,
    questionLimit,
    set?.id,
    settings.difficultyFilter,
    settings.questionSource,
    settings.questionsPerSession,
    userId,
  ])

  useEffect(() => {
    if (
      !enabled ||
      !sessionKey ||
      !userId ||
      !category ||
      questions.length === 0
    ) {
      return
    }

    if (openedKeyRef.current === sessionKey) {
      return
    }

    openedKeyRef.current = sessionKey

    let cancelled = false
    setStatus("preparing")
    setError(null)

    void (async () => {
      try {
        const label = set ? `${category.title} — ${set.title}` : category.title

        // Resume beats starting fresh: a row left `in_progress` with answers
        // against it is the member's half-finished paper, and opening a second
        // sitting would strand it.
        const existing = await findResumableSession({
          userId,
          categoryId: category.id,
          questionnaireId: set?.id ?? "",
        })

        const opened =
          existing ??
          (await startStudySession({
            userId,
            categoryId: category.id,
            questionnaireId: set?.id ?? "",
            label,
            mode,
            questionCount: 0,
          }))

        if (cancelled) {
          return
        }

        // Seeded on the session ID, so a resume rebuilds the identical
        // sequence and the identical choice order.
        const built = buildQuestionPool({
          questions,
          settings,
          seed: opened.sessionId,
          answeredSkus,
          incorrectSkus,
          bookmarkedSkus,
          questionLimit,
        })

        const restored = existing
          ? await restoreSessionAnswers({
              sessionId: opened.sessionId,
              questions: built.questions,
              revealsAsAnswered: settings.feedbackTiming !== "at_end",
            })
          : null

        if (cancelled) {
          return
        }

        setSession(opened)
        setPool(built.questions)
        setAnswers(restored?.byPosition ?? new Map())
        setRevealed(restored?.revealedPositions ?? new Set())
        setActiveIndex(restored?.resumeIndex ?? 0)
        setDidResume(Boolean(existing))
        // Resuming rewinds the clock by the time already spent, so the
        // countdown continues rather than restarting.
        setStartedAtMs(Date.now() - (existing?.durationSeconds ?? 0) * 1000)
        setStatus("ready")
        answerStartRef.current = Date.now()
      } catch (caught) {
        if (cancelled) {
          return
        }

        openedKeyRef.current = null
        setError(caught instanceof Error ? caught : new Error(String(caught)))
        setStatus("error")
      }
    })()

    return () => {
      cancelled = true
    }
    // `questions` and `settings` are intentionally excluded: they are read at
    // open time, and re-running on a new array identity would reopen the
    // sitting on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionKey, questions.length])

  const questionCount = pool.length
  const answeredCount = answers.size

  const correctCount = useMemo(() => {
    let count = 0

    for (const [position, choiceIndex] of answers) {
      if (pool[position]?.question.answerIndex === choiceIndex) {
        count += 1
      }
    }

    return count
  }, [answers, pool])

  const timerSeconds = useMemo(() => {
    if (typeof minutes === "number" && minutes > 0) {
      return minutes * 60
    }

    return resolveTimerSeconds(settings, questionCount)
  }, [minutes, questionCount, settings])

  const endsAtMs = timerSeconds ? startedAtMs + timerSeconds * 1000 : null

  // ─── Answering ────────────────────────────────────────────────────────────

  const selectChoice = useCallback(
    (choice: PresentedChoice) => {
      const presented = pool[activeIndex]

      if (!presented || !session || !userId || hasSubmittedRef.current) {
        return
      }

      // Under `on_next` the choice stays changeable until they confirm, so a
      // locked question is one that has already been revealed.
      if (revealed.has(activeIndex)) {
        return
      }

      const responseTimeSeconds = Math.max(
        Math.round((Date.now() - answerStartRef.current) / 1000),
        0
      )

      setAnswers((previous) => {
        const next = new Map(previous)
        next.set(activeIndex, choice.index)
        return next
      })

      if (settings.feedbackTiming === "instant") {
        setRevealed((previous) => new Set(previous).add(activeIndex))
      }

      // A confirmation you can feel, and a different one for right and wrong
      // under instant feedback — which is the only mode where the verdict is
      // known at the moment of the tap.
      if (settings.hapticsEnabled) {
        const isCorrect = choice.index === presented.question.answerIndex

        void Haptics.notificationAsync(
          settings.feedbackTiming === "instant"
            ? isCorrect
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success
        ).catch(() => undefined)
      }

      void recordAnswer({
        userId,
        sessionId: session.sessionId,
        question: presented.question,
        // The choice's ORIGINAL index. Writing the tapped row instead records
        // the wrong answer and corrupts the item statistics, which are keyed
        // by SKU and shared across every member.
        selectedIndex: choice.index,
        responseTimeSeconds,
      })
    },
    [
      activeIndex,
      pool,
      revealed,
      session,
      settings.feedbackTiming,
      settings.hapticsEnabled,
      userId,
    ]
  )

  /** `on_next`: commit the pending choice and reveal it. */
  const confirmAnswer = useCallback(() => {
    if (!answers.has(activeIndex)) {
      return
    }

    setRevealed((previous) => new Set(previous).add(activeIndex))
  }, [activeIndex, answers])

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(index, 0), Math.max(questionCount - 1, 0))
      setActiveIndex(clamped)
      answerStartRef.current = Date.now()
    },
    [questionCount]
  )

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])
  const goPrevious = useCallback(
    () => goTo(activeIndex - 1),
    [activeIndex, goTo]
  )

  // ─── Checkpointing ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session || status !== "ready") {
      return
    }

    // Debounced: a member tapping quickly through a paper would otherwise
    // write once per tap.
    const timeout = setTimeout(() => {
      void saveSessionProgress({
        sessionId: session.sessionId,
        lastQuestionOrder: pool[activeIndex]?.question.order ?? 0,
        answeredCount,
        correctCount,
        questionCount: pool.length,
        durationSeconds: Math.round((Date.now() - startedAtMs) / 1000),
      })
    }, CHECKPOINT_DELAY_MS)

    return () => clearTimeout(timeout)
  }, [
    activeIndex,
    answeredCount,
    correctCount,
    pool,
    session,
    startedAtMs,
    status,
  ])

  // ─── Submitting ───────────────────────────────────────────────────────────

  const submit = useCallback(async () => {
    if (hasSubmittedRef.current || !session || !userId) {
      return
    }

    hasSubmittedRef.current = true
    setStatus("submitting")

    const durationSeconds = Math.max(
      Math.round((Date.now() - startedAtMs) / 1000),
      0
    )

    const answeredSkuList = Array.from(answers.keys())
      .map((position) => pool[position]?.question.sku)
      .filter((sku): sku is string => Boolean(sku))

    const finalResult: ExamSessionResult = {
      correctCount,
      answeredCount,
      questionCount,
      durationSeconds,
      scorePercent: Math.round(
        (correctCount / Math.max(questionCount, 1)) * 100
      ),
    }

    setResult(finalResult)
    setStatus("complete")

    await completeStudySession({
      userId,
      session,
      correctCount,
      answeredCount,
      questionCount,
      durationSeconds,
      lastQuestionOrder: pool[activeIndex]?.question.order ?? 0,
      answeredSkus: answeredSkuList,
      profileSnapshot: profile
        ? {
            fullName: profile.fullName,
            schoolName: profile.schoolOrEmployer,
            // The member-type label at the time. Copied, not joined, so a
            // student who graduates does not retitle a badge they already
            // earned.
            reviewType: getMemberTypeDisplay(profile),
            avatarUrl: profile.avatarUrl,
          }
        : undefined,
    })
  }, [
    activeIndex,
    answeredCount,
    answers,
    correctCount,
    pool,
    profile,
    questionCount,
    session,
    startedAtMs,
    userId,
  ])

  const activeQuestion = pool[activeIndex] ?? null
  const selectedIndex = answers.get(activeIndex)
  const isRevealed = revealed.has(activeIndex)

  const answeredIndices = useMemo(() => new Set(answers.keys()), [answers])

  /**
   * Move on by itself, once the answer has been revealed.
   *
   * Only meaningful when there *is* a reveal to move on from, which is why
   * `at_end` is excluded — `isAutoAdvanceApplicable` says the same thing to
   * the settings screen, which disables the switch there.
   */
  useEffect(() => {
    if (
      !settings.autoAdvance ||
      settings.feedbackTiming === "at_end" ||
      !isRevealed ||
      status !== "ready" ||
      activeIndex >= questionCount - 1
    ) {
      return
    }

    const timeout = setTimeout(
      () => goTo(activeIndex + 1),
      Math.max(settings.autoAdvanceSeconds, 1) * 1000
    )

    return () => clearTimeout(timeout)
  }, [
    activeIndex,
    goTo,
    isRevealed,
    questionCount,
    settings.autoAdvance,
    settings.autoAdvanceSeconds,
    settings.feedbackTiming,
    status,
  ])

  return {
    status,
    error,
    session,
    pool,
    didResume,

    activeIndex,
    activeQuestion,
    selectedIndex,
    isRevealed,
    answeredIndices,
    answers,

    questionCount,
    answeredCount,
    correctCount,
    endsAtMs,
    showExplanations: isExplanationApplicable(settings),

    selectChoice,
    confirmAnswer,
    goTo,
    goNext,
    goPrevious,
    submit,
    result,
  }
}
