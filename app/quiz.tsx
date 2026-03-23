import { useEffect, useMemo, useState } from "react"
import {
  buildQuizQuestions,
  formatTime,
  getCategoryById,
  getFullExamById,
  type Question,
} from "@/data/reviewer-data"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Home,
  RefreshCcw,
  Send,
} from "lucide-react-native"
import { Alert, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { AnswerOption } from "@/components/ui/answer-option"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"

type UserAnswers = Record<number, number | undefined>

export default function QuizScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const primaryFgColor =
    colorScheme === "dark"
      ? THEME.dark.primaryForeground
      : THEME.light.primaryForeground
  const mutedColor =
    colorScheme === "dark"
      ? THEME.dark.mutedForeground
      : THEME.light.mutedForeground

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

  const category = getCategoryById(categoryId)
  const exam = getFullExamById(examId)
  const quizTitle = category?.title ?? exam?.title ?? "Mixed Review"
  const quizSubtitle =
    category?.description ??
    exam?.description ??
    "Mixed category review for broad recall and exam readiness."

  const questions = useMemo<Question[]>(() => {
    if (!categoryId || totalQuestions <= 0) {
      return []
    }

    return buildQuizQuestions(categoryId, totalQuestions)
  }, [categoryId, totalQuestions])

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [activeIndex, setActiveIndex] = useState(0)
  const [answers, setAnswers] = useState<UserAnswers>({})
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    setSecondsLeft(totalSeconds)
    setActiveIndex(0)
    setAnswers({})
    setIsSubmitted(false)
  }, [totalSeconds, categoryId, totalQuestions])

  useEffect(() => {
    if (isSubmitted || secondsLeft <= 0) {
      return
    }

    const intervalId = setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          clearInterval(intervalId)
          setIsSubmitted(true)
          return 0
        }

        return previous - 1
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [secondsLeft, isSubmitted])

  const currentQuestion = questions[activeIndex]

  const answeredCount = Object.values(answers).filter(
    (value) => typeof value === "number"
  ).length

  const result = useMemo(() => {
    let correct = 0

    questions.forEach((question, index) => {
      if (answers[index] === question.answerIndex) {
        correct += 1
      }
    })

    return { correct, wrong: questions.length - correct }
  }, [questions, answers])

  const shellClass = "flex-1 bg-background"
  const cardClass = "rounded-3xl border border-border bg-card p-4"
  const titleClass = "text-card-foreground"
  const mutedClass = "text-muted-foreground"

  if (questions.length === 0 || totalSeconds <= 0) {
    return (
      <SafeAreaView className={shellClass}>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className={`text-center text-xl font-extrabold ${titleClass}`}>
            Invalid Quiz Setup
          </Text>
          <Text className={`text-center text-sm ${mutedClass}`}>
            Go back and select a category and mode.
          </Text>
          <Button className="w-full" onPress={() => router.replace("/")}>
            <Home size={16} color={primaryFgColor} />
            <Text className="font-bold text-primary-foreground">
              Go to Categories
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  if (isSubmitted) {
    return (
      <SafeAreaView className={shellClass}>
        <ScrollView contentContainerClassName="gap-3.5 px-4 py-4">
          <View className={cardClass}>
            <Text className={`text-xl font-black ${titleClass}`}>Results</Text>
            <Text className={`mt-1 text-sm ${mutedClass}`}>{quizTitle}</Text>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-primary bg-primary/10 p-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
                  <Check
                    size={12}
                    color={isDark ? THEME.dark.primary : THEME.light.primary}
                  />{" "}
                  Correct
                </Text>
                <Text className="mt-1 text-xl font-black text-card-foreground">
                  {result.correct}
                </Text>
              </View>
              <View className="flex-1 rounded-2xl border border-destructive bg-destructive/10 p-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-destructive">
                  Wrong
                </Text>
                <Text className="mt-1 text-xl font-black text-card-foreground">
                  {result.wrong}
                </Text>
              </View>
            </View>

            <Text className={`mt-3 text-sm ${mutedClass}`}>
              Answered {answeredCount} of {questions.length}.
            </Text>
          </View>

          {questions.map((question, questionIndex) => {
            const selectedIndex = answers[questionIndex]

            return (
              <View key={question.id} className={cardClass}>
                <Text className={`text-sm font-bold leading-6 ${titleClass}`}>
                  {questionIndex + 1}. {question.prompt}
                </Text>

                <View className="mt-3 gap-2.5">
                  {question.choices.map((choice, choiceIndex) => {
                    const isCorrectChoice = choiceIndex === question.answerIndex
                    const isWrongSelection =
                      selectedIndex === choiceIndex &&
                      choiceIndex !== question.answerIndex

                    return (
                      <AnswerOption
                        key={`${question.id}-${choice}`}
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

                <View className="mt-3.5 rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
                  <Text className="text-xs font-black uppercase tracking-[1.6px] text-primary">
                    Explanation
                  </Text>
                  <Text
                    className={`mt-1.5 text-[13px] leading-5 ${titleClass}`}
                  >
                    {question.explanation}
                  </Text>
                  <Text className={`mt-3 text-xs ${mutedClass}`}>
                    Correct answer: {question.choices[question.answerIndex]}
                  </Text>
                  <Text className={`mt-1 text-xs ${mutedClass}`}>
                    Your answer:{" "}
                    {typeof selectedIndex === "number"
                      ? question.choices[selectedIndex]
                      : "No answer selected"}
                  </Text>
                </View>
              </View>
            )
          })}

          <Button className="h-11" onPress={() => router.replace("/")}>
            <RefreshCcw size={16} color={primaryFgColor} />
            <Text className="font-bold text-primary-foreground">
              Start New Review
            </Text>
          </Button>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className={shellClass}>
      <ScrollView contentContainerClassName="gap-3.5 px-4 py-4">
        <View className={cardClass}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className={`text-xl font-black ${titleClass}`}>
                {quizTitle}
              </Text>
              <Text className={`mt-1 text-sm ${mutedClass}`}>
                {quizSubtitle}
              </Text>
              <Text className={`mt-1.5 text-[13px] ${mutedClass}`}>
                Question {activeIndex + 1} of {questions.length}
              </Text>
            </View>
            <View className="rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-1.5">
              <Text className="text-sm font-black text-primary">
                {formatTime(secondsLeft)}
              </Text>
            </View>
          </View>

          <View className="mt-3.5 h-2 overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </View>

          <Text
            className={`mt-2 text-xs font-semibold uppercase tracking-wide ${mutedClass}`}
          >
            Answered {answeredCount}/{questions.length}
          </Text>
        </View>

        <View className={cardClass}>
          <Text className={`text-base font-bold leading-6 ${titleClass}`}>
            {currentQuestion.prompt}
          </Text>

          <View className="mt-3.5 gap-2">
            {currentQuestion.choices.map((choice, choiceIndex) => {
              const isSelected = answers[activeIndex] === choiceIndex

              return (
                <AnswerOption
                  key={`${currentQuestion.id}-${choice}`}
                  isSelected={isSelected}
                  onPress={() => {
                    setAnswers((previous) => ({
                      ...previous,
                      [activeIndex]: choiceIndex,
                    }))
                  }}
                >
                  {choice}
                </AnswerOption>
              )
            })}
          </View>
        </View>

        <View className="mt-1 flex-row gap-2.5">
          <Button
            className="h-11 flex-1"
            variant="outline"
            onPress={() =>
              setActiveIndex((previous) => Math.max(previous - 1, 0))
            }
            disabled={activeIndex === 0}
          >
            <ArrowLeft size={16} color={mutedColor} />
            <Text className="font-bold">Back</Text>
          </Button>

          {activeIndex < questions.length - 1 ? (
            <Button
              className="h-11 flex-1"
              onPress={() =>
                setActiveIndex((previous) =>
                  Math.min(previous + 1, questions.length - 1)
                )
              }
            >
              <ArrowRight size={16} color={primaryFgColor} />
              <Text className="font-bold text-primary-foreground">Next</Text>
            </Button>
          ) : (
            <Button
              className="h-11 flex-1"
              onPress={() => {
                Alert.alert(
                  "Submit quiz",
                  "Are you sure you want to submit and reveal answers?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Submit", onPress: () => setIsSubmitted(true) },
                  ]
                )
              }}
            >
              <Send size={16} color={primaryFgColor} />
              <Text className="font-bold text-primary-foreground">Submit</Text>
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
