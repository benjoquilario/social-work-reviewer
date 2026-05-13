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
  Timer,
  Trophy,
  X,
} from "lucide-react-native"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { AnswerOption } from "@/components/ui/answer-option"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { useQuizSession, type UserAnswers } from "@/hooks/use-quiz-session"
import {
  getBoardExamSetDetail,
  type BoardExamQuestion,
} from "@/lib/board-exams"
import type { QuizQuestion } from "@/lib/quiz-types"
import { THEME, withOpacity } from "@/lib/theme"

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
    primarySoft: withOpacity(theme.primary, 0.14),
    primaryBorder: withOpacity(theme.primary, 0.55),
    green: theme.success,
    greenSoft: withOpacity(theme.success, 0.14),
    red: theme.destructive,
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
  "h-24 rounded-3xl",
  "h-32 rounded-3xl",
  "h-16 rounded-2xl",
  "h-16 rounded-2xl",
  "h-16 rounded-2xl",
]

const QUIZ_LOADING_CONTENT_STYLE = {
  paddingHorizontal: 16,
  paddingVertical: 16,
}
const QUIZ_RESULTS_CONTENT_STYLE = {
  paddingHorizontal: 16,
  paddingVertical: 16,
}
const QUIZ_PAGER_STYLE = { flex: 1 }
const QUIZ_PAGER_CONTENT_STYLE = { paddingBottom: 8 }
const QUIZ_QUESTION_SCROLL_CONTENT_STYLE = {
  flexGrow: 1,
  paddingHorizontal: 16,
  paddingBottom: 24,
}
const QUIZ_DOT_CONTENT_STYLE = { paddingRight: 2 }
const QUIZ_CARD_CLASS = "rounded-3xl border border-border bg-card p-5"
const QUIZ_RESULT_STATS_ROW_STYLE = {
  flexDirection: "row" as const,
  gap: 12,
}
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
      className="relative h-12 w-12 items-center justify-center rounded-2xl border"
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

function QuizDotSeparator() {
  return <View style={{ width: 6 }} />
}

function getQuizScore(correct: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return Math.round((correct / total) * 100)
}

const QuizTimerBadge = memo(function QuizTimerBadge({
  durationSeconds,
  isSubmitted,
  onExpire,
  theme,
}: {
  durationSeconds: number
  isSubmitted: boolean
  onExpire: () => void
  theme: ThemePalette
}) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    setSecondsLeft(durationSeconds)
  }, [durationSeconds])

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (isSubmitted || secondsLeft <= 0) {
      return
    }

    const timeoutId = setTimeout(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onExpireRef.current()
          return 0
        }

        return prev - 1
      })
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [isSubmitted, secondsLeft])

  const isDanger = secondsLeft < 60

  return (
    <View
      className="flex-row items-center gap-1.5 rounded-2xl px-3.5 py-2"
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

const QuizNavigatorDot = memo(
  function QuizNavigatorDot({
    isActive,
    isAnswered,
    onPressDot,
    questionIndex,
    theme,
  }: {
    isActive: boolean
    isAnswered: boolean
    onPressDot: (index: number) => void
    questionIndex: number
    theme: ThemePalette
  }) {
    return (
      <Pressable
        onPress={() => onPressDot(questionIndex)}
        style={{
          width: isActive ? 24 : 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: isActive
            ? theme.primary
            : isAnswered
              ? withOpacity(theme.primary, 0.6)
              : theme.muted,
        }}
      />
    )
  },
  (prev, next) =>
    prev.isActive === next.isActive &&
    prev.isAnswered === next.isAnswered &&
    prev.questionIndex === next.questionIndex &&
    prev.theme === next.theme
)

const QuizQuestionPage = memo(
  function QuizQuestionPage({
    onSelectAnswer,
    question,
    questionIndex,
    screenWidth,
    selectedChoiceIndex,
    theme,
  }: {
    onSelectAnswer: (questionIndex: number, choiceIndex: number) => void
    question: QuizQuestion
    questionIndex: number
    screenWidth: number
    selectedChoiceIndex: number | undefined
    theme: ThemePalette
  }) {
    return (
      <View style={{ width: screenWidth, flex: 1 }}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={QUIZ_QUESTION_SCROLL_CONTENT_STYLE}
        >
          <View className={QUIZ_CARD_CLASS}>
            <View
              className="mb-4 self-start rounded-full px-3 py-1.5"
              style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
            >
              <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
                Question {questionIndex + 1}
              </Text>
            </View>
            <Text className="text-base font-bold leading-6 text-card-foreground">
              {question.prompt}
            </Text>
            <Text className="mt-2 text-[13px] leading-5 text-muted-foreground">
              Choose the best answer from the options below.
            </Text>
            <View className="mt-5 gap-3">
              {question.choices.map((choice, choiceIndex) => (
                <AnswerOption
                  key={`${question.id}-${choiceIndex}`}
                  index={choiceIndex}
                  isSelected={selectedChoiceIndex === choiceIndex}
                  showPrefix={false}
                  onPress={() => onSelectAnswer(questionIndex, choiceIndex)}
                >
                  {choice}
                </AnswerOption>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    )
  },
  (prev, next) =>
    prev.question.id === next.question.id &&
    prev.questionIndex === next.questionIndex &&
    prev.screenWidth === next.screenWidth &&
    prev.selectedChoiceIndex === next.selectedChoiceIndex &&
    prev.theme === next.theme
)

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
          {question.choices.map((choice, choiceIndex) => {
            const isCorrectChoice = choiceIndex === question.answerIndex
            const isWrongSelection =
              selectedChoiceIndex === choiceIndex &&
              choiceIndex !== question.answerIndex

            return (
              <AnswerOption
                key={`${question.id}-${choiceIndex}`}
                index={choiceIndex}
                isSelected={false}
                isCorrect={isCorrectChoice}
                isWrong={isWrongSelection}
                showPrefix={false}
                onPress={() => undefined}
              >
                {choice}
              </AnswerOption>
            )
          })}
        </View>
        <View
          className="mt-3.5 rounded-2xl p-3.5"
          style={{
            backgroundColor: withOpacity(theme.primary, 0.08),
            borderWidth: 1,
            borderColor: withOpacity(theme.primary, 0.2),
          }}
        >
          <Text className="text-xs font-black uppercase tracking-[1.6px] text-primary">
            Explanation
          </Text>
          <Text className="mt-1.5 text-[13px] leading-5 text-card-foreground">
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

const QuizFeedbackView = memo(function QuizFeedbackView({
  question,
  questionIndex,
  totalQuestions,
  selectedChoiceIndex,
  onContinue,
  colors,
}: {
  question: QuizQuestion
  questionIndex: number
  totalQuestions: number
  selectedChoiceIndex: number
  onContinue: () => void
  colors: ReturnType<typeof getQuizColors>
}) {
  const isCorrect = selectedChoiceIndex === question.answerIndex
  const heading = isCorrect ? "Correct! 🎉" : "Incorrect"
  const message = isCorrect
    ? question.explanation
    : `The correct answer is ${String.fromCharCode(
        65 + question.answerIndex
      )}. ${question.choices[question.answerIndex]}${
        question.explanation ? ` ${question.explanation}` : ""
      }`

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <QuizAnimatedPanel animationKey={`feedback-${question.id}`}>
        <View className="flex-1 px-5 pb-5 pt-1">
          <Text
            className="text-[12px] font-medium"
            style={{ color: colors.mutedText }}
          >
            Question {questionIndex + 1} of {totalQuestions}
          </Text>

          <View className="flex-1 items-center justify-center">
            <View className="items-center">
              <View className="mb-8">
                <QuizConfetti colors={colors.confetti} />
                <View
                  className="h-32 w-32 items-center justify-center rounded-full border"
                  style={{
                    backgroundColor: isCorrect
                      ? colors.greenSoft
                      : colors.redSoft,
                    borderColor: isCorrect
                      ? withOpacity(colors.green, 0.45)
                      : withOpacity(colors.red, 0.45),
                  }}
                >
                  <View
                    className="h-24 w-24 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isCorrect ? colors.green : colors.red,
                    }}
                  >
                    {isCorrect ? (
                      <Check size={52} color="#ffffff" strokeWidth={3.5} />
                    ) : (
                      <X size={52} color="#ffffff" strokeWidth={3.5} />
                    )}
                  </View>
                </View>
              </View>

              <Text
                className="text-[34px] font-black"
                style={{ color: colors.text }}
              >
                {heading}
              </Text>
              <Text
                className="mt-4 max-w-[300px] text-center text-[16px] leading-7"
                style={{ color: colors.mutedText }}
              >
                {message}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onContinue}
            className="h-14 items-center justify-center rounded-[14px]"
            style={{ backgroundColor: colors.primary }}
          >
            <View className="flex-row items-center gap-2">
              <Text
                className="text-[16px] font-bold"
                style={{ color: "#ffffff" }}
              >
                {questionIndex < totalQuestions - 1
                  ? "Next Question"
                  : "View Results"}
              </Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Pressable>
        </View>
      </QuizAnimatedPanel>
    </SafeAreaView>
  )
})

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
  const [isReviewingAnswers, setIsReviewingAnswers] = useState(false)
  const colors = useMemo(() => getQuizColors(theme), [theme])

  const renderResultQuestion = useCallback(
    ({
      item: question,
      index: questionIndex,
    }: {
      item: QuizQuestion
      index: number
    }) => (
      <QuizResultQuestionCard
        question={question}
        questionIndex={questionIndex}
        selectedChoiceIndex={answers[questionIndex]}
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
              className="text-center text-[28px] font-black"
              style={{ color: colors.text }}
            >
              Quiz Completed
            </Text>

            <View className="flex-1 items-center justify-center">
              <View className="items-center">
                <View className="mb-7">
                  <QuizConfetti colors={colors.confetti} />
                  <View
                    className="h-36 w-36 items-center justify-center rounded-[30px]"
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
                  className="text-center text-[16px] leading-7"
                  style={{ color: colors.mutedText }}
                >
                  Great job! You&apos;ve completed the quiz.
                </Text>

                <View
                  className="mt-8 w-full rounded-[16px] border px-4 py-5"
                  style={{
                    backgroundColor: colors.panel,
                    borderColor: colors.panelBorder,
                  }}
                >
                  <View className="flex-row items-center">
                    <View className="flex-1 items-center">
                      <Text
                        className="text-[34px] font-black"
                        style={{ color: colors.green }}
                      >
                        {result.correct}
                      </Text>
                      <Text
                        className="text-[13px] font-medium"
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
                        className="text-[34px] font-black"
                        style={{ color: colors.red }}
                      >
                        {result.wrong}
                      </Text>
                      <Text
                        className="text-[13px] font-medium"
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
                        className="text-[34px] font-black"
                        style={{ color: colors.primary }}
                      >
                        {score}%
                      </Text>
                      <Text
                        className="text-[13px] font-medium"
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
              <Pressable
                onPress={() => setIsReviewingAnswers(true)}
                className="h-14 items-center justify-center rounded-[14px]"
                style={{ backgroundColor: colors.primary }}
              >
                <Text
                  className="text-[16px] font-bold"
                  style={{ color: "#ffffff" }}
                >
                  Review Answers
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace("/")}
                className="h-14 items-center justify-center rounded-[14px] border"
                style={{
                  backgroundColor: colors.panel,
                  borderColor: colors.panelBorder,
                }}
              >
                <Text
                  className="text-[16px] font-bold"
                  style={{ color: colors.text }}
                >
                  Back to Learning
                </Text>
              </Pressable>
            </View>
          </View>
        </QuizAnimatedPanel>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlashList
        data={questions}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={QUIZ_RESULTS_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={QuizVerticalSeparator}
        ListHeaderComponent={
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
            <Button
              className="mt-4 h-11"
              variant="outline"
              onPress={() => setIsReviewingAnswers(false)}
            >
              <Text className="font-bold">Back to Summary</Text>
            </Button>
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
  const [feedbackQuestionIndex, setFeedbackQuestionIndex] = useState<
    number | null
  >(null)

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

  const handleAdvanceToFeedback = useCallback(() => {
    if (!isCurrentQuestionAnswered) {
      return
    }

    setFeedbackQuestionIndex(activeIndex)
  }, [activeIndex, isCurrentQuestionAnswered])

  const handleContinueFromFeedback = useCallback(() => {
    if (feedbackQuestionIndex === null) {
      return
    }

    if (feedbackQuestionIndex >= questions.length - 1) {
      void handleSubmit()
      return
    }

    const nextIndex = feedbackQuestionIndex + 1
    setFeedbackQuestionIndex(null)
    setActiveIndex(nextIndex)
  }, [feedbackQuestionIndex, handleSubmit, questions.length, setActiveIndex])

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

  if (
    feedbackQuestionIndex !== null &&
    questions[feedbackQuestionIndex] &&
    typeof answers[feedbackQuestionIndex] === "number"
  ) {
    return (
      <QuizFeedbackView
        question={questions[feedbackQuestionIndex]}
        questionIndex={feedbackQuestionIndex}
        totalQuestions={questions.length}
        selectedChoiceIndex={answers[feedbackQuestionIndex] as number}
        onContinue={handleContinueFromFeedback}
        colors={colors}
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
              <Text
                className="text-[12px] font-medium"
                style={{ color: colors.mutedText }}
              >
                Question {activeIndex + 1} of {questions.length}
              </Text>

              <QuizProgressBar
                progress={currentProgress}
                bufferProgress={bufferProgress}
                colors={colors}
              />

              <View className="mt-3 flex-row items-center justify-between">
                <Text
                  className="text-[12px] font-medium"
                  style={{ color: colors.mutedText }}
                >
                  {answeredCount} of {questions.length} answered
                </Text>
                <Text
                  className="text-[12px] font-semibold"
                  style={{ color: colors.primary }}
                >
                  {Math.round(currentProgress * 100)}%
                </Text>
              </View>

              <Text
                className="mt-7 text-[18px] font-black leading-8"
                style={{ color: colors.text }}
              >
                {activeQuestion?.prompt}
              </Text>

              <View className="mt-6 gap-3">
                {activeQuestion?.choices.map((choice, choiceIndex) => (
                  <AnswerOption
                    key={`${activeQuestion.id}-${choiceIndex}`}
                    isSelected={selectedChoiceIndex === choiceIndex}
                    colors={{
                      baseBorder: colors.subtleBorder,
                      baseBackground: colors.panel,
                      baseText: colors.text,
                      mutedText: colors.mutedText,
                      selectedBorder: colors.primary,
                      selectedBackground: withOpacity(colors.primary, 0.32),
                      correctBorder: colors.green,
                      correctBackground: withOpacity(colors.green, 0.24),
                      wrongBorder: colors.red,
                      wrongBackground: withOpacity(colors.red, 0.24),
                      ringBorder: withOpacity(colors.text, 0.28),
                    }}
                    onPress={() => handleSelectAnswer(activeIndex, choiceIndex)}
                  >
                    {`${String.fromCharCode(65 + choiceIndex)}. ${choice}`}
                  </AnswerOption>
                ))}
              </View>

              <View className="mt-auto flex-row gap-4 pt-8">
                <Pressable
                  onPress={() => {
                    if (activeIndex === 0) {
                      router.back()
                      return
                    }

                    setActiveIndex(Math.max(activeIndex - 1, 0))
                  }}
                  className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border"
                  style={{
                    backgroundColor: colors.panel,
                    borderColor: colors.panelBorder,
                  }}
                >
                  <ArrowLeft size={16} color={colors.text} />
                  <Text
                    className="text-[16px] font-bold"
                    style={{ color: colors.text }}
                  >
                    Back
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleAdvanceToFeedback}
                  disabled={!isCurrentQuestionAnswered}
                  className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-[14px]"
                  style={{
                    backgroundColor: isCurrentQuestionAnswered
                      ? colors.primary
                      : withOpacity(colors.primary, 0.45),
                  }}
                >
                  <Text
                    className="text-[16px] font-bold"
                    style={{ color: "#ffffff" }}
                  >
                    Next
                  </Text>
                  <ArrowRight size={16} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </QuizAnimatedPanel>
    </SafeAreaView>
  )
}
