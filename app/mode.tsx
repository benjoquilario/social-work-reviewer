import { useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ChevronLeft,
  Clock3,
  FileQuestion,
  ListChecks,
  LockKeyhole,
} from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { listResumableAttemptsByExam } from "@/lib/progress"
import {
  getQuizCategoryDetail,
  listQuizExamsBySubjectId,
  type QuizExamSummary,
} from "@/lib/quiz-content"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { AppShellHeader } from "@/components/app-shell-header"

function getExamTypeLabel(type: QuizExamSummary["type"]) {
  if (type === "practice") {
    return "Questions & Answers"
  }

  if (type === "topic") {
    return "Topic Drill"
  }

  return "Mock Exam"
}

function getExamStatusCopy(exam: QuizExamSummary) {
  if (exam.isLocked) {
    return "Premium exam. Upgrade to open this question set."
  }

  if (exam.availableQuestionCount === 0) {
    return "No published questions and choices are available for this exam yet."
  }

  const visibilityCopy =
    exam.availableQuestionCount === exam.totalQuestionCount
      ? `${exam.availableQuestionCount} questions ready.`
      : `${exam.availableQuestionCount} of ${exam.totalQuestionCount} questions visible.`

  return `${visibilityCopy} ${exam.shouldShuffle ? "Shuffled order." : "Fixed order."}`
}

export default function ModeSelectionScreen() {
  const router = useRouter()
  const user = useAuth((state) => state.user)
  const isAuthenticated = useAuth((state) => state.isAuthenticated)
  const profile = useAuth((state) => state.profile)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const iconColor = theme.mutedForeground
  const params = useLocalSearchParams<{ categoryId?: string }>()
  const categoryId = params.categoryId ?? ""
  const isPremiumUser = profile?.isPremium === true

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const examPickerQuery = useQuery({
    queryKey: ["quiz-category-exams", categoryId, isPremiumUser],
    enabled: Boolean(categoryId),
    queryFn: async () => {
      const [category, exams] = await Promise.all([
        getQuizCategoryDetail(categoryId, { viewerIsPremium: isPremiumUser }),
        listQuizExamsBySubjectId(categoryId, {
          viewerIsPremium: isPremiumUser,
        }),
      ])

      return { category, exams }
    },
  })

  const category = examPickerQuery.data?.category ?? null
  const exams = useMemo(
    () => examPickerQuery.data?.exams ?? [],
    [examPickerQuery.data?.exams]
  )
  const examIdSignature = useMemo(
    () => exams.map((exam) => exam.id).join("|"),
    [exams]
  )
  const resumableAttemptsQuery = useQuery({
    queryKey: ["quiz-mode-resumable-attempts", user?.$id, examIdSignature],
    enabled: Boolean(user?.$id) && exams.length > 0,
    queryFn: () =>
      listResumableAttemptsByExam({
        userId: user?.$id ?? "",
        examIds: exams.map((exam) => exam.id)
      }),
  })
  const resumableByExamId = resumableAttemptsQuery.data ?? {}
  const examStats = useMemo(
    () => [
      { label: "Exams", value: String(exams.length) },
      {
        label: "Ready",
        value: String(
          exams.filter(
            (exam) => !exam.isLocked && exam.availableQuestionCount > 0
          ).length
        ),
      },
      {
        label: "Locked",
        value: String(exams.filter((exam) => exam.isLocked).length),
      },
    ],
    [exams]
  )
  const headerSubtitle = category
    ? `Choose an exam under ${category.name}. Each item launches a question-and-answer`
    : "Choose a subject exam questions and choices."

  function openExam(exam: QuizExamSummary) {
    if (exam.isLocked) {
      router.push({
        pathname: "/premium",
        params: {
          source: "exam",
          title: exam.title,
          categoryId,
        },
      })
      return
    }

    if (exam.availableQuestionCount === 0) {
      return
    }

    router.push({
      pathname: "/quiz",
      params: {
        categoryId,
        examId: exam.id,
        totalQuestions: String(exam.availableQuestionCount),
        minutes: String(exam.timeLimit),
      },
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-4 py-4"
      >
        <AppShellHeader
          eyebrow="Questions and Answers"
          title="Choose an Exam"
          subtitle={headerSubtitle}
          avatarLabel="QA"
          badgeLabel="Subject"
          badgeValue={category ? `${exams.length} exams` : "Preparing"}
          stats={examStats}
        />

        {examPickerQuery.isLoading ? (
          <View className="gap-3">
            <Skeleton className="h-5 w-full rounded-lg" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </View>
        ) : examPickerQuery.error ? (
          <Card>
            <CardContent className="gap-2 px-3.5 py-3.5">
              <Text className="text-[15px] font-bold text-destructive">
                Subject exams unavailable
              </Text>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                {examPickerQuery.error instanceof Error
                  ? examPickerQuery.error.message
                  : "Unable to load exams from Appwrite."}
              </Text>
            </CardContent>
          </Card>
        ) : null}

        {/* {category ? (
          <Card>
            <CardContent className="gap-2 px-4 py-3.5">
              <Text className="text-[15px] font-bold text-card-foreground">
                {category.name}
              </Text>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                {category.description ||
                  "Choose an exam below to open its question-and-answer set."}
              </Text>
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                {category.availableQuestionCount} visible questions •{" "}
                {category.totalQuestionCount} total in Appwrite
              </Text>
            </CardContent>
          </Card>
        ) : null} */}

        {exams.length > 0 ? (
          <Card>
            <CardContent className="overflow-hidden px-0 py-0">
              {exams.map((exam, index) => {
                const isUnavailable =
                  !exam.isLocked && exam.availableQuestionCount === 0
                const canOpenExam = !exam.isLocked && !isUnavailable
                const resumableAttempt = resumableByExamId[exam.id]
                const hasResumableAttempt =
                  Boolean(resumableAttempt) && canOpenExam
                const resumeQuestion = hasResumableAttempt
                  ? Math.min(
                      Math.max(resumableAttempt.currentQuestionIndex + 1, 1),
                      Math.max(exam.availableQuestionCount, 1)
                    )
                  : 1

                return (
                  <Pressable
                    key={exam.id}
                    className="gap-2 px-4 py-4"
                    disabled={isUnavailable}
                    onPress={() => openExam(exam)}
                    style={{
                      opacity: isUnavailable ? 0.58 : 1,
                      borderBottomWidth: index === exams.length - 1 ? 0 : 1,
                      borderBottomColor: withOpacity(
                        theme.border,
                        isDark ? 0.6 : 0.85
                      ),
                      backgroundColor:
                        index % 2 === 0
                          ? withOpacity(theme.primary, 0.03)
                          : "transparent",
                    }}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1 gap-1.5">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text className="text-[15px] font-bold text-card-foreground">
                            {exam.title}
                          </Text>
                          <View
                            className="rounded-full px-2.5 py-1"
                            style={{
                              backgroundColor: withOpacity(
                                exam.isLocked ? theme.accent : theme.primary,
                                0.12
                              ),
                            }}
                          >
                            <Text
                              className="text-[10px] font-black uppercase tracking-[1.2px]"
                              style={{
                                color: exam.isLocked
                                  ? theme.accent
                                  : theme.primary,
                              }}
                            >
                              {getExamTypeLabel(exam.type)}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-2">
                          <FileQuestion size={14} color={iconColor} />
                          <Clock3 size={14} color={iconColor} />
                          <Text className="text-[12px] font-semibold text-muted-foreground">
                            Question and choice based exam
                          </Text>
                        </View>

                        <Text className="text-[12px] leading-5 text-muted-foreground">
                          {getExamStatusCopy(exam)}
                        </Text>

                        <View className="flex-row flex-wrap items-center gap-2.5">
                          <Text className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                            {exam.timeLimit} min
                          </Text>
                          <Text
                            className="text-[11px] font-semibold uppercase tracking-wide"
                            style={{ color: theme.accent }}
                          >
                            {exam.availableQuestionCount} visible
                          </Text>
                          <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {exam.premiumQuestionCount > 0
                              ? `${exam.premiumQuestionCount} premium`
                              : `${exam.freeQuestionCount} free`}
                          </Text>
                        </View>

                        {hasResumableAttempt ? (
                          <Pressable
                            className="mt-1.5 self-start rounded-full px-3 py-1.5"
                            style={{
                              backgroundColor: withOpacity(theme.primary, 0.12),
                              borderWidth: 1,
                              borderColor: withOpacity(theme.primary, 0.3),
                            }}
                            onPress={() => openExam(exam)}
                          >
                            <View className="flex-row items-center gap-1.5">
                              <Clock3 size={12} color={theme.primary} />
                              <Text className="text-[10px] font-black uppercase tracking-[1.1px] text-primary">
                                Resume from Q{resumeQuestion}
                              </Text>
                            </View>
                          </Pressable>
                        ) : null}
                      </View>

                      <View className="flex-col items-end gap-1">
                        <View
                          className="flex-row items-center gap-1 rounded-full px-3 py-1"
                          style={{
                            backgroundColor: withOpacity(
                              exam.isLocked ? theme.accent : theme.primary,
                              0.12
                            ),
                          }}
                        >
                          {exam.isLocked ? (
                            <LockKeyhole size={12} color={theme.accent} />
                          ) : (
                            <ListChecks size={12} color={theme.primary} />
                          )}
                          <Text
                            className="text-[10px] font-black uppercase tracking-[1.2px]"
                            style={{
                              color: exam.isLocked
                                ? theme.accent
                                : theme.primary,
                            }}
                          >
                            {exam.isLocked ? "Locked" : "Open"}
                          </Text>
                        </View>

                        {hasResumableAttempt ? (
                          <View
                            className="flex-row items-center gap-1 rounded-full px-3 py-1"
                            style={{
                              backgroundColor: withOpacity(theme.success, 0.14),
                            }}
                          >
                            <Clock3 size={12} color={theme.success} />
                            <Text
                              className="text-[10px] font-black uppercase tracking-[1.2px]"
                              style={{ color: theme.success }}
                            >
                              Resume
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                )
              })}
            </CardContent>
          </Card>
        ) : !examPickerQuery.isLoading && !examPickerQuery.error ? (
          <Card>
            <CardContent className="gap-2 px-4 py-3.5">
              <Text className="text-[15px] font-bold text-card-foreground">
                No exams yet
              </Text>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                Add exam records and exam-question assignments in Appwrite for
                this subject to show question-and-answer sets here.
              </Text>
            </CardContent>
          </Card>
        ) : null}

        <Button
          variant="outline"
          className="h-11 rounded-2xl"
          onPress={() => router.back()}
        >
          <ChevronLeft size={16} color={iconColor} />
          <Text className="text-sm font-bold">Back to Categories</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}
