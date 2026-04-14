import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { formatTime, getFullExamById } from "@/data/reviewer-data"
import { FlashList } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Home,
  RefreshCcw,
  Send,
  Timer,
} from "lucide-react-native"
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { saveQuizResult } from "@/lib/progress"
import {
  buildAppwriteQuizQuestions,
  getQuizCategoryDetail,
  getQuizExamDetail,
  type QuizQuestion,
} from "@/lib/quiz-content"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { AnswerOption } from "@/components/ui/answer-option"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

type UserAnswers = Record<number, number | undefined>
type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

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

const QUIZ_PAGER_CONTENT_STYLE = {
  paddingBottom: 8,
}

const QUIZ_QUESTION_SCROLL_CONTENT_STYLE = {
  flexGrow: 1,
  paddingHorizontal: 16,
  paddingBottom: 24,
}

const QUIZ_DOT_CONTENT_STYLE = {
  paddingRight: 2,
}

const QUIZ_CARD_CLASS = "rounded-3xl border border-border bg-card p-5"

function QuizVerticalSeparator() {
  return <View className="h-4" />
}

function QuizDotSeparator() {
  return <View style={{ width: 6 }} />
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
          ? "hsl(0 84% 60% / 0.15)"
          : withOpacity(theme.primary, 0.15),
        borderWidth: 1,
        borderColor: isDanger
          ? "hsl(0 84% 60% / 0.3)"
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
  (previousProps, nextProps) =>
    previousProps.isActive === nextProps.isActive &&
    previousProps.isAnswered === nextProps.isAnswered &&
    previousProps.questionIndex === nextProps.questionIndex &&
    previousProps.theme === nextProps.theme
)

const QuizQuestionPage = memo(
  function QuizQuestionPage({
    onSelectAnswer,
    question,
    questionIndex,
    screenWidth,
    selectedChoiceIndex,
  }: {
    onSelectAnswer: (questionIndex: number, choiceIndex: number) => void
    question: QuizQuestion
    questionIndex: number
    screenWidth: number
    selectedChoiceIndex: number | undefined
  }) {
    return (
      <View style={{ width: screenWidth, flex: 1 }}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={QUIZ_QUESTION_SCROLL_CONTENT_STYLE}
        >
          <View className={QUIZ_CARD_CLASS}>
            <Text className="text-base font-bold leading-6 text-card-foreground">
              {question.prompt}
            </Text>
            <View className="mt-4 gap-2.5">
              {question.choices.map((choice, choiceIndex) => (
                <AnswerOption
                  key={`${question.id}-${choiceIndex}`}
                  index={choiceIndex}
                  isSelected={selectedChoiceIndex === choiceIndex}
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
  (previousProps, nextProps) =>
    previousProps.question.id === nextProps.question.id &&
    previousProps.questionIndex === nextProps.questionIndex &&
    previousProps.screenWidth === nextProps.screenWidth &&
    previousProps.selectedChoiceIndex === nextProps.selectedChoiceIndex
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
  (previousProps, nextProps) =>
    previousProps.question.id === nextProps.question.id &&
    previousProps.questionIndex === nextProps.questionIndex &&
    previousProps.selectedChoiceIndex === nextProps.selectedChoiceIndex &&
    previousProps.theme === nextProps.theme
)

export default function QuizScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const user = useAuth((state) => state.user)
  const isAuthenticated = useAuth((state) => state.isAuthenticated)
  const profile = useAuth((state) => state.profile)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  const flatListRef = useRef<FlatList<QuizQuestion>>(null)
  const { width: screenWidth } = useWindowDimensions()
  const startTimeRef = useRef(Date.now())

  const params = useLocalSearchParams<{
    categoryId?: string
    totalQuestions?: string
    minutes?: string
    examId?: string
  }>()

  const categoryId = params.categoryId ?? ""
  const totalQuestions = Number(params.totalQuestions ?? "0")
  const minutes = Number(params.minutes ?? "0")
  const examId = params.examId ?? ""
  const totalSeconds = Math.max(minutes, 0) * 60
  const isPremiumUser = profile?.isPremium === true

  const fullExam = getFullExamById(examId)
  const isAppwriteExamSession =
    Boolean(examId) && categoryId !== "all-categories" && !fullExam

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const categoryQuery = useQuery({
    queryKey: ["quiz-screen-category", categoryId, isPremiumUser],
    enabled: Boolean(categoryId) && categoryId !== "all-categories",
    queryFn: () =>
      getQuizCategoryDetail(categoryId, { viewerIsPremium: isPremiumUser }),
  })

  const examQuery = useQuery({
    queryKey: ["quiz-screen-exam", examId, isPremiumUser],
    enabled: isAppwriteExamSession,
    queryFn: () =>
      getQuizExamDetail(examId, { viewerIsPremium: isPremiumUser }),
  })

  const questionsQuery = useQuery({
    queryKey: [
      "quiz-questions",
      categoryId,
      examId,
      totalQuestions,
      isPremiumUser,
    ],
    enabled: Boolean(categoryId) && totalQuestions > 0,
    queryFn: () =>
      buildAppwriteQuizQuestions({
        subjectId: categoryId,
        examId: isAppwriteExamSession ? examId : undefined,
        totalQuestions,
        viewerIsPremium: isPremiumUser,
      }),
  })

  const questions = useMemo(
    () => questionsQuery.data ?? [],
    [questionsQuery.data]
  )
  const quizTitle =
    examQuery.data?.title ??
    (categoryId === "all-categories"
      ? fullExam?.title
      : (categoryQuery.data?.name ?? fullExam?.title)) ??
    "Mixed Review"

  const [activeIndex, setActiveIndex] = useState(0)
  const [answers, setAnswers] = useState<UserAnswers>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  useEffect(() => {
    setActiveIndex(0)
    setAnswers({})
    setIsSubmitted(false)
    startTimeRef.current = Date.now()
  }, [totalSeconds, categoryId, examId, totalQuestions])

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

    if (user && (examId || categoryId)) {
      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000)
      try {
        await saveQuizResult({
          userId: user.$id,
          examId: examId || categoryId,
          score: result.correct,
          totalItems: questions.length,
          timeTaken,
          status: "done",
        })
      } catch {
        // Best-effort: don't block the results UI
      }
    }
  }, [categoryId, examId, questions.length, result.correct, user])

  const handleSelectAnswer = useCallback(
    (questionIndex: number, choiceIndex: number) => {
      setAnswers((previousAnswers) => {
        if (previousAnswers[questionIndex] === choiceIndex) {
          return previousAnswers
        }

        return {
          ...previousAnswers,
          [questionIndex]: choiceIndex,
        }
      })
    },
    []
  )

  const scrollToIndex = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true })
  }, [])

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0]
      const nextIndex = first?.index

      if (typeof nextIndex === "number") {
        setActiveIndex((currentIndex) =>
          currentIndex === nextIndex ? currentIndex : nextIndex
        )
      }
    },
    []
  )

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 60 }),
    []
  )

  const dotNavigatorExtraData = useMemo(
    () => ({ activeIndex, answers }),
    [activeIndex, answers]
  )

  const getQuestionItemLayout = useCallback(
    (_: ArrayLike<QuizQuestion> | null | undefined, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth]
  )

  const renderLoadingSkeleton = useCallback(
    ({ item }: { item: string }) => <Skeleton className={item} />,
    []
  )

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

  const renderNavigatorDot = useCallback(
    ({ index: questionIndex }: { index: number }) => {
      return (
        <QuizNavigatorDot
          isActive={questionIndex === activeIndex}
          isAnswered={typeof answers[questionIndex] === "number"}
          onPressDot={scrollToIndex}
          questionIndex={questionIndex}
          theme={theme}
        />
      )
    },
    [activeIndex, answers, scrollToIndex, theme]
  )

  const renderQuestionPage = useCallback(
    ({ item: question, index }: { item: QuizQuestion; index: number }) => (
      <QuizQuestionPage
        onSelectAnswer={handleSelectAnswer}
        question={question}
        questionIndex={index}
        screenWidth={screenWidth}
        selectedChoiceIndex={answers[index]}
      />
    ),
    [answers, handleSelectAnswer, screenWidth]
  )

  if (totalSeconds <= 0) {
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
  }

  if (
    questionsQuery.isLoading ||
    (categoryId !== "all-categories" && categoryQuery.isLoading) ||
    examQuery.isLoading
  ) {
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
  }

  if (questionsQuery.error || categoryQuery.error || examQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-center text-xl font-extrabold text-foreground">
            Quiz unavailable
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            {examQuery.error instanceof Error
              ? examQuery.error.message
              : questionsQuery.error instanceof Error
                ? questionsQuery.error.message
                : categoryQuery.error instanceof Error
                  ? categoryQuery.error.message
                  : "Unable to load quiz questions from Appwrite."}
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
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-center text-xl font-extrabold text-foreground">
            No quiz questions yet
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            This quiz mode is now Appwrite-backed, but there are not enough
            published question and choice documents for this selection yet.
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
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (isSubmitted) {
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
                Results
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                {quizTitle}
              </Text>

              <View className="mt-4 flex-row gap-3">
                <View
                  className="flex-1 rounded-2xl p-3"
                  style={{
                    backgroundColor: withOpacity(theme.primary, 0.15),
                    borderWidth: 1,
                    borderColor: withOpacity(theme.primary, 0.3),
                  }}
                >
                  <View className="flex-row items-center gap-1">
                    <Check size={13} color={theme.primary} />
                    <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                      Correct
                    </Text>
                  </View>
                  <Text className="mt-1 text-2xl font-black text-card-foreground">
                    {result.correct}
                  </Text>
                </View>
                <View
                  className="flex-1 rounded-2xl p-3"
                  style={{
                    backgroundColor: "hsl(0 84% 60% / 0.1)",
                    borderWidth: 1,
                    borderColor: "hsl(0 84% 60% / 0.25)",
                  }}
                >
                  <Text className="text-xs font-bold uppercase tracking-wide text-destructive">
                    Wrong
                  </Text>
                  <Text className="mt-1 text-2xl font-black text-card-foreground">
                    {result.wrong}
                  </Text>
                </View>
                <View
                  className="flex-1 rounded-2xl p-3"
                  style={{
                    backgroundColor: withOpacity(theme.accent, 0.18),
                    borderWidth: 1,
                    borderColor: withOpacity(theme.accent, 0.3),
                  }}
                >
                  <Text
                    className="text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: theme.accent }}
                  >
                    Score
                  </Text>
                  <Text className="mt-1 text-2xl font-black text-card-foreground">
                    {questions.length > 0
                      ? Math.round((result.correct / questions.length) * 100)
                      : 0}
                    %
                  </Text>
                </View>
              </View>

              <Text className="mt-3 text-sm text-muted-foreground">
                Answered {answeredCount} of {questions.length}
              </Text>
            </View>
          }
          renderItem={renderResultQuestion}
          ListFooterComponent={
            <View className="pt-4">
              <Button className="h-11" onPress={() => router.replace("/")}>
                <RefreshCcw size={16} color={theme.primaryForeground} />
                <Text className="font-bold text-primary-foreground">
                  Start New Review
                </Text>
              </Button>
            </View>
          }
        />
      </SafeAreaView>
    )
  }

  // ── Active quiz screen ──────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header bar with timer */}
      <View className="gap-3 px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text
              className="text-base font-black text-foreground"
              numberOfLines={1}
            >
              {quizTitle}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Question {activeIndex + 1} of {questions.length}
            </Text>
          </View>
          <QuizTimerBadge
            durationSeconds={totalSeconds}
            isSubmitted={isSubmitted}
            onExpire={handleSubmit}
            theme={theme}
          />
        </View>

        {/* Progress bar */}
        <View className="h-1.5 overflow-hidden rounded-full bg-muted">
          <View
            className="h-full rounded-full"
            style={{
              width: `${(answeredCount / questions.length) * 100}%`,
              backgroundColor: theme.primary,
            }}
          />
        </View>

        {/* Dot navigator (compact horizontal scroll) */}
        <FlashList
          horizontal
          data={questions}
          keyExtractor={(item) => item.id}
          renderItem={renderNavigatorDot}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={QuizDotSeparator}
          contentContainerStyle={QUIZ_DOT_CONTENT_STYLE}
          extraData={dotNavigatorExtraData}
        />

        <Text className="text-xs font-semibold text-muted-foreground">
          {answeredCount}/{questions.length} answered
        </Text>
      </View>

      {/* Question FlatList */}
      <FlatList
        ref={flatListRef}
        data={questions}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getQuestionItemLayout}
        renderItem={renderQuestionPage}
        extraData={answers}
        style={QUIZ_PAGER_STYLE}
        contentContainerStyle={QUIZ_PAGER_CONTENT_STYLE}
      />

      {/* Bottom navigation */}
      <View className="flex-row gap-2.5 px-4 pb-4 pt-2">
        <Button
          className="h-12 flex-1"
          variant="outline"
          onPress={() => {
            const prev = Math.max(activeIndex - 1, 0)
            setActiveIndex(prev)
            scrollToIndex(prev)
          }}
          disabled={activeIndex === 0}
        >
          <ArrowLeft size={16} color={theme.mutedForeground} />
          <Text className="font-bold">Back</Text>
        </Button>

        {activeIndex < questions.length - 1 ? (
          <Button
            className="h-12 flex-1"
            onPress={() => {
              const next = Math.min(activeIndex + 1, questions.length - 1)
              setActiveIndex(next)
              scrollToIndex(next)
            }}
          >
            <ArrowRight size={16} color={theme.primaryForeground} />
            <Text className="font-bold text-primary-foreground">Next</Text>
          </Button>
        ) : (
          <Button
            className="h-12 flex-1"
            onPress={() => setShowSubmitModal(true)}
          >
            <Send size={16} color={theme.primaryForeground} />
            <Text className="font-bold text-primary-foreground">Submit</Text>
          </Button>
        )}
      </View>

      {/* Submit confirmation modal */}
      <Modal
        visible={showSubmitModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowSubmitModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSubmitModal(false)}>
          <View
            className="flex-1"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          />
        </TouchableWithoutFeedback>
        <View
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            gap: 16,
          }}
        >
          <View className="mt-1 items-center gap-2">
            <View
              className="h-14 w-14 items-center justify-center rounded-3xl"
              style={{ backgroundColor: withOpacity(theme.primary, 0.15) }}
            >
              <Send size={28} color={theme.primary} />
            </View>
            <Text className="text-lg font-black text-card-foreground">
              Submit Quiz?
            </Text>
            <Text className="text-center text-sm text-muted-foreground">
              You&apos;ve answered {answeredCount} of {questions.length}{" "}
              questions. This will reveal all correct answers.
            </Text>
          </View>
          <View className="flex-row gap-3">
            <Button
              className="h-12 flex-1"
              variant="outline"
              onPress={() => setShowSubmitModal(false)}
            >
              <Text className="font-bold">Cancel</Text>
            </Button>
            <Button className="h-12 flex-1" onPress={handleSubmit}>
              <Text className="font-bold text-primary-foreground">Submit</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
