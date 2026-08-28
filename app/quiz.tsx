import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { formatTime } from "@/data/reviewer-data"
import { FlashList } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Home,
  LayoutGrid,
  Timer,
  Trophy,
} from "lucide-react-native"
import {
  Alert,
  Animated,
  AppState,
  Easing,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  getBoardExamSetDetail,
  type BoardExamQuestion,
} from "@/lib/board-exams"
import { useAppPreferences } from "@/lib/app-preferences"
import type { QuizQuestion } from "@/lib/quiz-types"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { useQuizSession, type UserAnswers } from "@/hooks/use-quiz-session"
import {
  AnswerOption,
  getAnswerOptionState,
} from "@/components/ui/answer-option"
import { Button } from "@/components/ui/button"
import { QuizAnswerFeedback } from "@/components/quiz/quiz-answer-feedback"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

function getQuizColors(theme: ThemePalette) {
  return {
    background: theme.background,
    panel: theme.card,
    panelBorder: withOpacity(theme.foreground, 0.1),
    subtleBorder: withOpacity(theme.foreground, 0.08),
    text: theme.foreground,
    mutedText: theme.mutedForeground,
    faintText: withOpacity(theme.mutedForeground, 0.72),
    track: withOpacity(theme.mutedForeground, 0.22),
    primary: theme.primary,
    onPrimary: theme.primaryForeground,
    primarySoft: withOpacity(theme.primary, 0.14),
    primaryBorder: withOpacity(theme.primary, 0.55),
    green: theme.success,
    onGreen: theme.successForeground,
    greenSoft: withOpacity(theme.success, 0.14),
    red: theme.destructive,
    onRed: theme.destructiveForeground,
    redSoft: withOpacity(theme.destructive, 0.14),
    confetti: [
      theme.primary,
      theme.chart2,
      theme.chart3,
      theme.chart4,
      theme.chart5,
      theme.accent,
    ],
  }
}

function QuizAnimatedPanel({
  children,
  animationKey,
}: {
  children: any
  animationKey: string | number
}) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(16)).current
  const scale = useRef(new Animated.Value(0.985)).current

  useEffect(() => {
    opacity.setValue(0)
    translateY.setValue(16)
    scale.setValue(0.985)

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [animationKey, opacity, scale, translateY])

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      {children}
    </Animated.View>
  )
}

function QuizProgressBar({
  progress,
  bufferProgress,
  colors,
}: {
  progress: number
  bufferProgress: number
  colors: ReturnType<typeof getQuizColors>
}) {
  const pulse = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )

    loop.start()
    return () => loop.stop()
  }, [pulse])

  return (
    <View
      className="mt-4 h-2.5 overflow-hidden rounded-full"
      style={{ backgroundColor: colors.track }}
    >
      <View
        className="absolute left-0 top-0 h-full rounded-full"
        style={{
          width: `${Math.max(0, Math.min(bufferProgress, 1)) * 100}%`,
          backgroundColor: withOpacity(colors.primary, 0.24),
        }}
      />
      <Animated.View
        className="absolute left-0 top-0 h-full rounded-full"
        style={{
          width: `${Math.max(0, Math.min(progress, 1)) * 100}%`,
          backgroundColor: colors.primary,
          opacity: pulse,
        }}
      />
    </View>
  )
}

const LOADING_SKELETON_CLASSES = [
  "h-24 rounded-xl",
  "h-32 rounded-xl",
  "h-16 rounded-xl",
  "h-16 rounded-xl",
  "h-16 rounded-xl",
]

const QUIZ_LOADING_CONTENT_STYLE = {
  paddingHorizontal: 16,
  paddingVertical: 16,
}
const QUIZ_RESULTS_CONTENT_STYLE = {
  paddingHorizontal: 16,
  paddingVertical: 16,
}
const QUIZ_CARD_CLASS = "rounded-xl border border-border bg-card p-5"
const QUIZ_PASSING_SCORE = 75
const QUIZ_DRAWER_GRID_STYLE = {
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: 10,
}

const QuizQuestionDrawerTile = memo(function QuizQuestionDrawerTile({
  isActive,
  isAnswered,
  isLocked,
  onPress,
  questionIndex,
  theme,
}: {
  isActive: boolean
  isAnswered: boolean
  isLocked: boolean
  onPress: (index: number) => void
  questionIndex: number
  theme: ThemePalette
}) {
  return (
    <Pressable
      onPress={() => onPress(questionIndex)}
      disabled={isLocked}
      className="relative h-12 w-12 items-center justify-center rounded-md border"
      style={{
        borderColor: isActive
          ? theme.primary
          : isAnswered
            ? withOpacity(theme.primary, 0.35)
            : theme.border,
        backgroundColor: isActive
          ? theme.primary
          : isAnswered
            ? withOpacity(theme.primary, 0.12)
            : theme.card,
        opacity: isLocked ? 0.45 : 1,
      }}
    >
      <Text
        className="text-sm font-black"
        style={{
          color: isActive ? theme.primaryForeground : theme.foreground,
        }}
      >
        {questionIndex + 1}
      </Text>
      {isAnswered ? (
        <View
          className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full"
          style={{
            backgroundColor: isActive ? theme.primaryForeground : theme.primary,
            borderWidth: 1,
            borderColor: isActive ? theme.primary : theme.card,
          }}
        >
          <Check
            size={11}
            color={isActive ? theme.primary : theme.primaryForeground}
          />
        </View>
      ) : null}
    </Pressable>
  )
})

function toBoardExamQuizQuestion(
  question: BoardExamQuestion,
  index: number,
  setName: QuizQuestion["setName"] = "Set A"
): QuizQuestion | null {
  const answerIndex = question.choices.findIndex((choice) => choice.isCorrect)

  if (answerIndex === -1 || question.choices.length < 2) {
    return null
  }

  return {
    id: `${question.id}-board-quiz-${index + 1}`,
    questionId: question.id,
    categoryId: question.categoryId,
    prompt: question.prompt,
    choices: question.choices.map((choice) => choice.text),
    choiceIds: question.choices.map((choice) => choice.id),
    answerIndex,
    explanation:
      question.explanation || "No explanation provided for this question yet.",
    sourceQuestionId: Number(question.id),
    questionnaireKey: question.categoryId,
    setName,
  }
}

function QuizVerticalSeparator() {
  return <View className="h-4" />
}

const QuizQuestionMap = memo(function QuizQuestionMap({
  visible,
  onClose,
  onJump,
  onSubmitRequest,
  answers,
  activeIndex,
  totalQuestions,
  answeredCount,
  theme,
}: {
  visible: boolean
  onClose: () => void
  onJump: (index: number) => void
  onSubmitRequest: () => void
  answers: UserAnswers
  activeIndex: number
  totalQuestions: number
  answeredCount: number
  theme: ThemePalette
}) {
  const unansweredCount = totalQuestions - answeredCount

  const handlePressTile = useCallback(
    (index: number) => {
      onJump(index)
      onClose()
    },
    [onClose, onJump]
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="flex-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={onClose}
          accessibilityLabel="Close question map"
        />
        <View
          className="rounded-t-2xl border-t px-5 pb-10 pt-3"
          style={{ backgroundColor: theme.background, borderColor: theme.border }}
        >
          <View className="mb-4 items-center">
            <View
              className="h-1.5 w-12 rounded-full"
              style={{ backgroundColor: theme.border }}
            />
          </View>
          <Text className="text-lg font-black text-foreground">
            Question map
          </Text>
          <Text className="mt-0.5 text-sm text-muted-foreground">
            {answeredCount} answered · {unansweredCount} remaining
          </Text>
          <ScrollView
            style={{ maxHeight: 340 }}
            className="mt-4"
            showsVerticalScrollIndicator={false}
          >
            <View style={QUIZ_DRAWER_GRID_STYLE}>
              {Array.from({ length: totalQuestions }, (_, questionIndex) => (
                <QuizQuestionDrawerTile
                  key={questionIndex}
                  isActive={questionIndex === activeIndex}
                  isAnswered={typeof answers[questionIndex] === "number"}
                  isLocked={false}
                  onPress={handlePressTile}
                  questionIndex={questionIndex}
                  theme={theme}
                />
              ))}
            </View>
          </ScrollView>
          <View className="mt-4 flex-row items-center justify-center gap-5">
            {[
              { label: "Current", color: theme.primary },
              { label: "Answered", color: withOpacity(theme.primary, 0.35) },
              { label: "Unanswered", color: theme.border },
            ].map((item) => (
              <View key={item.label} className="flex-row items-center gap-1.5">
                <View
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <Text className="text-xs text-muted-foreground">
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
          <Button
            size="lg"
            className="mt-5"
            onPress={() => {
              onClose()
              onSubmitRequest()
            }}
          >
            <Text>Submit exam</Text>
          </Button>
        </View>
      </View>
    </Modal>
  )
})

function getQuizScore(correct: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return Math.round((correct / total) * 100)
}

/**
 * Countdown for a timed set.
 *
 * Driven by a wall-clock deadline rather than by decrementing a counter once a
 * second. The previous version had three problems, all of which handed the
 * learner extra time on a timed exam:
 *
 *  - it drifted, because each `setTimeout(…, 1000)` is scheduled *after* the
 *    render it followed, so every tick cost slightly more than a second;
 *  - it stopped while the app was backgrounded, since JS timers are throttled
 *    or suspended — leaving the exam and coming back paused the clock;
 *  - it ignored a resumed attempt entirely, restarting at the full duration
 *    even when half the time had already been spent.
 *
 * It also called `onExpire` from inside a `setSecondsLeft` updater. Updaters
 * must be pure — React may run them more than once, and does in development —
 * so expiry could submit the exam twice. Expiry now fires once from an effect,
 * guarded by a ref.
 */
const QuizTimerBadge = memo(function QuizTimerBadge({
  durationSeconds,
  startedAtMs,
  isSubmitted,
  onExpire,
  theme,
}: {
  durationSeconds: number
  /** Effective start instant; a resumed attempt back-dates this. */
  startedAtMs: number
  isSubmitted: boolean
  onExpire: () => void
  theme: ThemePalette
}) {
  const deadlineMs = startedAtMs + durationSeconds * 1000

  const readSecondsLeft = useCallback(
    () => Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)),
    [deadlineMs]
  )

  const [secondsLeft, setSecondsLeft] = useState(readSecondsLeft)
  const onExpireRef = useRef(onExpire)
  const hasExpiredRef = useRef(false)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    hasExpiredRef.current = false
    setSecondsLeft(readSecondsLeft())
  }, [readSecondsLeft])

  useEffect(() => {
    if (isSubmitted) {
      return
    }

    const tick = () => setSecondsLeft(readSecondsLeft())
    const intervalId = setInterval(tick, 500)

    // Recompute the moment the app comes back: time kept passing while the
    // interval was suspended.
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        tick()
      }
    })

    return () => {
      clearInterval(intervalId)
      subscription.remove()
    }
  }, [isSubmitted, readSecondsLeft])

  useEffect(() => {
    if (isSubmitted || secondsLeft > 0 || hasExpiredRef.current) {
      return
    }

    hasExpiredRef.current = true
    onExpireRef.current()
  }, [isSubmitted, secondsLeft])

  const isDanger = secondsLeft < 60

  return (
    <View
      className="flex-row items-center gap-1.5 rounded-xl px-3.5 py-2"
      style={{
        backgroundColor: isDanger
          ? withOpacity(theme.destructive, 0.15)
          : withOpacity(theme.primary, 0.15),
        borderWidth: 1,
        borderColor: isDanger
          ? withOpacity(theme.destructive, 0.3)
          : withOpacity(theme.primary, 0.3),
      }}
    >
      <Timer size={14} color={isDanger ? theme.destructive : theme.primary} />
      <Text
        className="text-sm font-black"
        style={{ color: isDanger ? theme.destructive : theme.primary }}
      >
        {formatTime(secondsLeft)}
      </Text>
    </View>
  )
})

const QuizResultQuestionCard = memo(
  function QuizResultQuestionCard({
    question,
    questionIndex,
    selectedChoiceIndex,
    theme,
  }: {
    question: QuizQuestion
    questionIndex: number
    selectedChoiceIndex: number | undefined
    theme: ThemePalette
  }) {
    return (
      <View className={QUIZ_CARD_CLASS}>
        <Text className="text-sm font-bold leading-6 text-card-foreground">
          {questionIndex + 1}. {question.prompt}
        </Text>
        <View className="mt-3 gap-2">
          {question.choices.map((choice, choiceIndex) => (
            <AnswerOption
              key={`${question.id}-${choiceIndex}`}
              index={choiceIndex}
              state={getAnswerOptionState({
                choiceIndex,
                answerIndex: question.answerIndex,
                selectedIndex: selectedChoiceIndex,
                isGraded: true,
              })}
              disabled
              onPress={() => undefined}
            >
              {choice}
            </AnswerOption>
          ))}
        </View>
        <View
          className="mt-3.5 rounded-xl p-3.5"
          style={{
            backgroundColor: withOpacity(theme.primary, 0.08),
            borderWidth: 1,
            borderColor: withOpacity(theme.primary, 0.2),
          }}
        >
          <Text className="text-xs font-black uppercase tracking-[1.4px] text-primary">
            Explanation
          </Text>
          <Text className="mt-1.5 text-sm leading-5 text-card-foreground">
            {question.explanation}
          </Text>
          <Text className="mt-2.5 text-xs text-muted-foreground">
            Correct: {question.choices[question.answerIndex]}
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            Your answer:{" "}
            {typeof selectedChoiceIndex === "number"
              ? question.choices[selectedChoiceIndex]
              : "No answer selected"}
          </Text>
        </View>
      </View>
    )
  },
  (prev, next) =>
    prev.question.id === next.question.id &&
    prev.questionIndex === next.questionIndex &&
    prev.selectedChoiceIndex === next.selectedChoiceIndex &&
    prev.theme === next.theme
)

function QuizConfetti({ colors }: { colors: string[] }) {
  const pieces = [
    { top: 8, left: 24, color: colors[0], rotate: "18deg" },
    { top: 38, left: 4, color: colors[1], rotate: "40deg" },
    { top: 74, left: 18, color: colors[2], rotate: "12deg" },
    { top: 18, right: 22, color: colors[3], rotate: "36deg" },
    { top: 52, right: 0, color: colors[4], rotate: "24deg" },
    { top: 86, right: 28, color: colors[5], rotate: "44deg" },
  ] as const

  return (
    <View className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-[88px] -translate-y-[88px]">
      {pieces.map((piece, index) => (
        <View
          key={index}
          className="absolute h-3 w-2 rounded-full"
          style={{
            ...piece,
            backgroundColor: piece.color,
            transform: [{ rotate: piece.rotate }],
          }}
        />
      ))}
    </View>
  )
}

// 3. SPLIT UI COMPONENTS
const QuizLoadingState = memo(function QuizLoadingState({
  theme,
}: {
  theme: ThemePalette
}) {
  const renderLoadingSkeleton = useCallback(
    ({ item }: { item: string }) => <Skeleton className={item} />,
    []
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlashList
        data={LOADING_SKELETON_CLASSES}
        keyExtractor={(_, index) => `quiz-loading-${index}`}
        renderItem={renderLoadingSkeleton}
        ItemSeparatorComponent={QuizVerticalSeparator}
        contentContainerStyle={QUIZ_LOADING_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
})

const QuizErrorState = memo(function QuizErrorState({
  theme,
  errorMsg,
}: {
  theme: ThemePalette
  errorMsg: string
}) {
  const router = useRouter()
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-center text-xl font-extrabold text-foreground">
          Quiz unavailable
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          {errorMsg}
        </Text>
        <Button className="w-full" onPress={() => router.replace("/")}>
          <Home size={16} color={theme.primaryForeground} />
          <Text className="font-bold text-primary-foreground">
            Go to Categories
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  )
})

const QuizEmptyState = memo(function QuizEmptyState({
  theme,
}: {
  theme: ThemePalette
}) {
  const router = useRouter()
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-center text-xl font-extrabold text-foreground">
          No quiz questions yet
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          This set doesn&apos;t have any questions available yet. Please try
          another set or check back later.
        </Text>
        <Button className="w-full" onPress={() => router.replace("/")}>
          <Home size={16} color={theme.primaryForeground} />
          <Text className="font-bold text-primary-foreground">
            Go to Categories
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  )
})

const QuizInvalidSetupState = memo(function QuizInvalidSetupState({
  theme,
}: {
  theme: ThemePalette
}) {
  const router = useRouter()
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-center text-xl font-extrabold text-foreground">
          Invalid Quiz Setup
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          Go back and select a category and mode.
        </Text>
        <Button className="w-full" onPress={() => router.replace("/")}>
          <Home size={16} color={theme.primaryForeground} />
          <Text className="font-bold text-primary-foreground">
            Go to Categories
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  )
})

const QuizResultsView = memo(function QuizResultsView({
  questions,
  result,
  answers,
  answeredCount,
  quizTitle,
  theme,
}: {
  questions: QuizQuestion[]
  result: { correct: number; wrong: number }
  answers: UserAnswers
  answeredCount: number
  quizTitle: string
  theme: ThemePalette
}) {
  const router = useRouter()
  const score = getQuizScore(result.correct, questions.length)
  const isPassed = score >= QUIZ_PASSING_SCORE
  const [isReviewingAnswers, setIsReviewingAnswers] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<"all" | "mistakes">("all")
  const colors = useMemo(() => getQuizColors(theme), [theme])

  const mistakesCount = questions.length - result.correct
  const reviewItems = useMemo(
    () =>
      questions
        .map((question, index) => ({ question, index }))
        .filter(
          (item) =>
            reviewFilter === "all" ||
            answers[item.index] !== item.question.answerIndex
        ),
    [answers, questions, reviewFilter]
  )

  const renderResultQuestion = useCallback(
    ({ item }: { item: { question: QuizQuestion; index: number } }) => (
      <QuizResultQuestionCard
        question={item.question}
        questionIndex={item.index}
        selectedChoiceIndex={answers[item.index]}
        theme={theme}
      />
    ),
    [answers, theme]
  )

  if (!isReviewingAnswers) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
        <QuizAnimatedPanel animationKey="quiz-results-summary">
          <View className="flex-1 px-5 pb-6 pt-3">
            <Text
              className="text-center text-3xl font-black"
              style={{ color: colors.text }}
            >
              Quiz Completed
            </Text>
            <View className="mt-3 items-center">
              <View
                className="rounded-full border px-3.5 py-1.5"
                style={{
                  backgroundColor: isPassed ? colors.greenSoft : colors.redSoft,
                  borderColor: withOpacity(
                    isPassed ? colors.green : colors.red,
                    0.35
                  ),
                }}
              >
                <Text
                  className="text-2xs font-bold uppercase tracking-[1px]"
                  style={{ color: isPassed ? colors.green : colors.red }}
                >
                  {isPassed
                    ? `Passed · ${QUIZ_PASSING_SCORE}% mark`
                    : `Below ${QUIZ_PASSING_SCORE}% passing mark`}
                </Text>
              </View>
            </View>

            <View className="flex-1 items-center justify-center">
              <View className="items-center">
                <View className="mb-7">
                  {isPassed ? (
                    <QuizConfetti colors={colors.confetti} />
                  ) : null}
                  <View
                    className="h-36 w-36 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: colors.primarySoft }}
                  >
                    <Trophy
                      size={78}
                      color={colors.primary}
                      strokeWidth={2.2}
                    />
                  </View>
                </View>

                <Text
                  className="text-center text-base leading-7"
                  style={{ color: colors.mutedText }}
                >
                  {isPassed
                    ? "Great job! You're hitting the passing mark — keep the momentum going."
                    : "Keep practicing — review your mistakes below and try this set again."}
                </Text>

                <View
                  className="mt-8 w-full rounded-md border px-4 py-5"
                  style={{
                    backgroundColor: colors.panel,
                    borderColor: colors.panelBorder,
                  }}
                >
                  <View className="flex-row items-center">
                    <View className="flex-1 items-center">
                      <Text
                        className="text-4xl font-black"
                        style={{ color: colors.green }}
                      >
                        {result.correct}
                      </Text>
                      <Text
                        className="text-sm font-medium"
                        style={{ color: colors.green }}
                      >
                        Correct
                      </Text>
                    </View>
                    <View
                      className="h-12 w-px"
                      style={{ backgroundColor: colors.subtleBorder }}
                    />
                    <View className="flex-1 items-center">
                      <Text
                        className="text-4xl font-black"
                        style={{ color: colors.red }}
                      >
                        {result.wrong}
                      </Text>
                      <Text
                        className="text-sm font-medium"
                        style={{ color: colors.red }}
                      >
                        Incorrect
                      </Text>
                    </View>
                    <View
                      className="h-12 w-px"
                      style={{ backgroundColor: colors.subtleBorder }}
                    />
                    <View className="flex-1 items-center">
                      <Text
                        className="text-4xl font-black"
                        style={{ color: colors.primary }}
                      >
                        {score}%
                      </Text>
                      <Text
                        className="text-sm font-medium"
                        style={{ color: colors.mutedText }}
                      >
                        Score
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View className="gap-4">
              <Button size="xl" onPress={() => setIsReviewingAnswers(true)}>
                <Text>Review Answers</Text>
              </Button>
              <Button
                size="xl"
                variant="outline"
                onPress={() => router.replace("/")}
              >
                <Text>Back to Learning</Text>
              </Button>
            </View>
          </View>
        </QuizAnimatedPanel>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlashList
        data={reviewItems}
        keyExtractor={(item) => item.question.id}
        style={{ flex: 1 }}
        contentContainerStyle={QUIZ_RESULTS_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={QuizVerticalSeparator}
        ListHeaderComponent={
          <View className="pb-4">
            <View className={QUIZ_CARD_CLASS}>
              <Text className="text-xl font-black text-card-foreground">
                Answer Review
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                {quizTitle}
              </Text>
              <Text className="mt-2 text-sm text-muted-foreground">
                {result.correct} correct, {result.wrong} incorrect,{" "}
                {answeredCount} answered
              </Text>
              <View className="mt-4 flex-row gap-2">
                {(
                  [
                    { key: "all", label: `All (${questions.length})` },
                    { key: "mistakes", label: `Mistakes (${mistakesCount})` },
                  ] as const
                ).map((chip) => {
                  const isActiveChip = reviewFilter === chip.key
                  return (
                    <Pressable
                      key={chip.key}
                      onPress={() => setReviewFilter(chip.key)}
                      className="rounded-full border px-3.5 py-2"
                      style={{
                        backgroundColor: isActiveChip
                          ? colors.primary
                          : colors.panel,
                        borderColor: isActiveChip
                          ? colors.primary
                          : colors.panelBorder,
                      }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{
                          color: isActiveChip ? colors.onPrimary : colors.text,
                        }}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
              <Button
                className="mt-4 h-11"
                variant="outline"
                onPress={() => setIsReviewingAnswers(false)}
              >
                <Text className="font-bold">Back to Summary</Text>
              </Button>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className={QUIZ_CARD_CLASS}>
            <Text className="text-center text-sm text-muted-foreground">
              No mistakes here — perfect run! 🎉
            </Text>
          </View>
        }
        renderItem={renderResultQuestion}
        ListFooterComponent={
          <View className="pt-4">
            <Button className="h-11" onPress={() => router.replace("/")}>
              <Text className="font-bold text-primary-foreground">
                Back to Learning
              </Text>
            </Button>
          </View>
        }
      />
    </SafeAreaView>
  )
})

export default function QuizScreen() {
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light
  const router = useRouter()
  const colors = useMemo(() => getQuizColors(theme), [theme])

  const user = useAuth((state) => state.user)
  const isAuthenticated = useAuth((state) => state.isAuthenticated)
  const profile = useAuth((state) => state.profile)
  const refreshProfile = useAuth((state) => state.refreshProfile)

  const flatListRef = useRef<FlatList<QuizQuestion>>(null)
  // Which questions have been checked. A set rather than a single index so a
  // verdict survives navigating away and back: returning to a question you
  // already checked must not re-open it for a different answer.
  const [gradedIndices, setGradedIndices] = useState<ReadonlySet<number>>(
    () => new Set()
  )
  // Strict mode: questions the learner has already navigated away from.
  // Settings has promised "Lock answer changes after moving to next
  // question" all along while nothing implemented it.
  const [lockedIndices, setLockedIndices] = useState<ReadonlySet<number>>(
    () => new Set()
  )
  const [isMapOpen, setIsMapOpen] = useState(false)
  const showExplanations = useAppPreferences(
    (state) => state.preferences.showExplanations
  )
  const strictMode = useAppPreferences(
    (state) => state.preferences.strictMode
  )

  const params = useLocalSearchParams<{
    source?: string
    categoryId?: string
    totalQuestions?: string
    minutes?: string
    examId?: string
    setId?: string
  }>()

  const isBoardExamSession = params.source === "board-exam"
  const categoryId = params.categoryId ?? ""
  const totalQuestions = Number(params.totalQuestions ?? "0")
  const minutes = Number(params.minutes ?? "0")
  const setId = params.setId ?? ""
  const activeExamId = `board-exam:${setId}:${totalQuestions}:${minutes}`
  const totalSeconds = Math.max(minutes, 0) * 60
  const isPremiumUser = profile?.isPremium === true

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const boardExamSetQuery = useQuery({
    queryKey: ["board-exam-quiz-set", categoryId, setId, isPremiumUser],
    enabled: isBoardExamSession && Boolean(categoryId) && Boolean(setId),
    queryFn: () =>
      getBoardExamSetDetail(categoryId, setId, {
        viewerIsPremium: isPremiumUser,
      }),
  })

  const rawQuestions = useMemo(() => {
    return (boardExamSetQuery.data?.questions ?? [])
      .map((question, index) =>
        toBoardExamQuizQuestion(
          question,
          index,
          (boardExamSetQuery.data?.set?.setCode as QuizQuestion["setName"]) ??
            "Set A"
        )
      )
      .filter((question): question is QuizQuestion => question !== null)
      .slice(0, totalQuestions)
  }, [
    boardExamSetQuery.data?.questions,
    boardExamSetQuery.data?.set?.setCode,
    totalQuestions,
  ])

  const quizTitle = boardExamSetQuery.data?.set?.title ?? "Board Exam"

  const {
    questions,
    activeIndex,
    startedAtMs,
    setActiveIndex,
    answers,
    isSubmitted,
    attemptId,
    isAttemptHydrating,
    answeredCount,
    result,
    handleSubmit,
    handleSelectAnswer,
  } = useQuizSession({
    user,
    profile,
    categoryId,
    examId: activeExamId,
    activeExamId,
    totalQuestions,
    totalSeconds,
    rawQuestions,
    flatListRef,
  })

  const activeQuestion = questions[activeIndex]
  const selectedChoiceIndex = answers[activeIndex]
  const isCurrentQuestionAnswered = typeof selectedChoiceIndex === "number"
  const currentProgress =
    questions.length > 0 ? (activeIndex + 1) / questions.length : 0
  const bufferProgress =
    questions.length > 0
      ? Math.max(answeredCount, activeIndex + 1) / questions.length
      : 0

  const handleSubmitRequest = useCallback(() => {
    const unansweredCount = questions.length - answeredCount

    Alert.alert(
      "Submit exam?",
      unansweredCount > 0
        ? `You still have ${unansweredCount} unanswered ${
            unansweredCount === 1 ? "question" : "questions"
          }. Unanswered questions are marked incorrect.`
        : "You've answered every question. Ready to see your results?",
      [
        { text: "Keep answering", style: "cancel" },
        {
          text: "Submit",
          style: "destructive",
          onPress: () => void handleSubmit(),
        },
      ]
    )
  }, [answeredCount, handleSubmit, questions.length])

  const goToQuestion = useCallback(
    (nextIndex: number) => {
      if (strictMode && typeof answers[activeIndex] === "number") {
        setLockedIndices((current) => new Set(current).add(activeIndex))
      }

      setActiveIndex(nextIndex)
    },
    [activeIndex, answers, setActiveIndex, strictMode]
  )

  // The question is graded in place rather than on a separate screen, so
  // "showing feedback" is now a property of the current question.
  const isCurrentQuestionGraded =
    gradedIndices.has(activeIndex) && isCurrentQuestionAnswered
  const isCurrentQuestionLocked =
    isCurrentQuestionGraded || lockedIndices.has(activeIndex)

  const handleAdvanceToFeedback = useCallback(() => {
    if (!isCurrentQuestionAnswered) {
      return
    }

    if (showExplanations && !gradedIndices.has(activeIndex)) {
      setGradedIndices((current) => new Set(current).add(activeIndex))
      return
    }

    if (activeIndex >= questions.length - 1) {
      handleSubmitRequest()
      return
    }

    goToQuestion(activeIndex + 1)
  }, [
    activeIndex,
    goToQuestion,
    gradedIndices,
    handleSubmitRequest,
    isCurrentQuestionAnswered,
    questions.length,
    showExplanations,
  ])

  const handleContinueFromFeedback = useCallback(() => {
    if (activeIndex >= questions.length - 1) {
      handleSubmitRequest()
      return
    }

    goToQuestion(activeIndex + 1)
  }, [activeIndex, goToQuestion, handleSubmitRequest, questions.length])

  const primaryActionLabel = !isCurrentQuestionAnswered
    ? "Select an answer"
    : isCurrentQuestionGraded
      ? activeIndex >= questions.length - 1
        ? "View Results"
        : "Next Question"
      : showExplanations
        ? "Check Answer"
        : activeIndex >= questions.length - 1
          ? "Finish"
          : "Next"

  // Leaving mid-exam loses the run, so it asks first. The old Back button
  // called router.back() straight from question one with no confirmation.
  const handleGoBack = useCallback(() => {
    if (activeIndex > 0) {
      goToQuestion(activeIndex - 1)
      return
    }

    Alert.alert(
      "Leave this exam?",
      "Your answers so far are saved, and you can resume from where you left off.",
      [
        { text: "Keep answering", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => router.back() },
      ]
    )
  }, [activeIndex, goToQuestion, router])

  // 5. DECOMPOSITION OF COMPLEX CONDITIONALS
  const isInvalidSetup =
    totalSeconds <= 0 ||
    totalQuestions <= 0 ||
    !isBoardExamSession ||
    !categoryId ||
    !setId
  const isLoadingQuizData =
    boardExamSetQuery.isLoading || (isAttemptHydrating && !attemptId)
  const isQuestionStateHydrating =
    rawQuestions.length > 0 && questions.length === 0

  const hasDataError = boardExamSetQuery.error
  const isEmptyState = rawQuestions.length === 0

  if (isInvalidSetup) return <QuizInvalidSetupState theme={theme} />
  if (isLoadingQuizData) return <QuizLoadingState theme={theme} />
  if (isQuestionStateHydrating) return <QuizLoadingState theme={theme} />

  if (hasDataError) {
    const errorMsg =
      boardExamSetQuery.error instanceof Error
        ? boardExamSetQuery.error.message
        : "Unable to load quiz questions. Please try again later."
    return <QuizErrorState theme={theme} errorMsg={errorMsg} />
  }

  if (isEmptyState) return <QuizEmptyState theme={theme} />

  if (isSubmitted) {
    return (
      <QuizResultsView
        questions={questions}
        result={result}
        answers={answers}
        answeredCount={answeredCount}
        quizTitle={quizTitle}
        theme={theme}
      />
    )
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <QuizAnimatedPanel
        animationKey={`question-${activeQuestion?.id ?? activeIndex}`}
      >
        <View className="flex-1 px-5 pb-5 pt-3">
          <Stack.Screen
            options={{
              title: "Quiz",
              headerRight: () => (
                <QuizTimerBadge
                  durationSeconds={totalSeconds}
                  startedAtMs={startedAtMs}
                  isSubmitted={isSubmitted}
                  onExpire={handleSubmit}
                  theme={theme}
                />
              ),
            }}
          />
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <View
                  className="rounded-full px-3 py-1.5"
                  style={{ backgroundColor: colors.primarySoft }}
                >
                  <Text
                    className="text-2xs font-bold uppercase tracking-[1px]"
                    style={{ color: colors.primary }}
                  >
                    Question {activeIndex + 1} of {questions.length}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setIsMapOpen(true)}
                  hitSlop={8}
                  accessibilityLabel="Open question map"
                  className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
                  style={{
                    backgroundColor: colors.panel,
                    borderColor: colors.panelBorder,
                  }}
                >
                  <LayoutGrid size={13} color={colors.mutedText} />
                  <Text
                    className="text-2xs font-bold"
                    style={{ color: colors.mutedText }}
                  >
                    {answeredCount}/{questions.length} answered
                  </Text>
                </Pressable>
              </View>

              <QuizProgressBar
                progress={currentProgress}
                bufferProgress={bufferProgress}
                colors={colors}
              />

              {/* Bold, not black: a board-exam stem is a paragraph to read,
                  not a headline to scan, and the heaviest weight in the family
                  fights legibility over three or four lines. */}
              <Text
                accessibilityRole="header"
                className="mt-7 text-lg font-bold leading-7"
                style={{ color: colors.text }}
              >
                {activeQuestion?.prompt}
              </Text>

              <View
                accessibilityRole="radiogroup"
                // Announces "1 of 4" per option, which a bare stack of radios
                // never did.
                className="mt-6 gap-2.5"
              >
                {activeQuestion?.choices.map((choice, choiceIndex) => (
                  <AnswerOption
                    key={`${activeQuestion.id}-${choiceIndex}`}
                    index={choiceIndex}
                    state={getAnswerOptionState({
                      choiceIndex,
                      answerIndex: activeQuestion.answerIndex,
                      selectedIndex: selectedChoiceIndex,
                      isGraded: isCurrentQuestionGraded,
                    })}
                    disabled={isCurrentQuestionLocked}
                    colors={{
                      baseBorder: colors.subtleBorder,
                      baseBackground: colors.panel,
                      baseText: colors.text,
                      mutedText: colors.mutedText,
                      selectedBorder: colors.primary,
                      correctBorder: colors.green,
                      wrongBorder: colors.red,
                    }}
                    onPress={() => handleSelectAnswer(activeIndex, choiceIndex)}
                  >
                    {choice}
                  </AnswerOption>
                ))}
              </View>

              {isCurrentQuestionGraded && activeQuestion ? (
                <View className="mt-4">
                  <QuizAnswerFeedback
                    theme={theme}
                    isCorrect={selectedChoiceIndex === activeQuestion.answerIndex}
                    correctLetter={String.fromCharCode(
                      65 + activeQuestion.answerIndex
                    )}
                    correctChoice={
                      activeQuestion.choices[activeQuestion.answerIndex]
                    }
                    explanation={activeQuestion.explanation}
                  />
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Outside the ScrollView on purpose. A long stem with four long
              options plus the feedback panel overflows the viewport, and
              the primary action must not be something you scroll to hunt
              for — it stays in the thumb zone. */}
          <View
            className="flex-row gap-3 border-t pt-4"
            style={{ borderTopColor: colors.subtleBorder }}
          >
            <Button
              size="xl"
              variant="outline"
              className="flex-1"
              accessibilityLabel={
                activeIndex === 0 ? "Leave the quiz" : "Previous question"
              }
              onPress={handleGoBack}
            >
              <ArrowLeft size={16} color={colors.text} />
              <Text>{activeIndex === 0 ? "Exit" : "Back"}</Text>
            </Button>

            <Button
              size="xl"
              className="flex-[1.4]"
              onPress={
                isCurrentQuestionGraded
                  ? handleContinueFromFeedback
                  : handleAdvanceToFeedback
              }
              disabled={!isCurrentQuestionAnswered}
            >
              <Text>{primaryActionLabel}</Text>
              {isCurrentQuestionAnswered ? (
                <ArrowRight size={16} color={colors.onPrimary} />
              ) : null}
            </Button>
          </View>
        </View>
      </QuizAnimatedPanel>
      <QuizQuestionMap
        visible={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onJump={goToQuestion}
        onSubmitRequest={handleSubmitRequest}
        answers={answers}
        activeIndex={activeIndex}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        theme={theme}
      />
    </SafeAreaView>
  )
}
