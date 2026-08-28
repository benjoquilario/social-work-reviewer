import { useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import {
  Clock3,
  Crown,
  FileQuestion,
  LockKeyhole,
  Play,
} from "lucide-react-native"
import { Pressable, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { FREE_QUESTION_LIMIT, getBoardExamSetDetail } from "@/lib/board-exams"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"

const MODE_CARD_STYLE = "rounded-xl"

const BOARD_EXAM_MODE_PRESETS = [
  {
    id: "20-10",
    label: "Set Mode",
    description: "20 items in 10 minutes",
    totalQuestions: 20,
    minutes: 10,
    isCustomMinutes: false,
  },
  {
    id: "50-30",
    label: "Practice Mode",
    description: "50 items in 30 minutes",
    totalQuestions: 50,
    minutes: 30,
    isCustomMinutes: false,
  },
  {
    id: "80-45",
    label: "Extended Mode",
    description: "80 items in 45 minutes",
    totalQuestions: 80,
    minutes: 45,
    isCustomMinutes: false,
  },
  {
    id: "120-60",
    label: "Challenge Mode",
    description: "120 items in 60 minutes",
    totalQuestions: 120,
    minutes: 60,
    isCustomMinutes: false,
  },
  {
    id: "full-custom",
    label: "Full Items",
    description: "Answer all available items with custom minutes.",
    totalQuestions: null,
    minutes: 180,
    isCustomMinutes: true,
  },
] as const

type BoardExamModePreset = (typeof BOARD_EXAM_MODE_PRESETS)[number]

function BoardExamModeCard({
  preset,
  isSelected,
  isDisabled,
  effectiveQuestionCount,
  effectiveMinutes,
  theme,
  onPress,
}: {
  preset: BoardExamModePreset
  isSelected: boolean
  isDisabled: boolean
  effectiveQuestionCount: number
  effectiveMinutes: number
  theme: (typeof THEME)["light"] | (typeof THEME)["dark"]
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} disabled={isDisabled}>
      <Card
        className={MODE_CARD_STYLE}
        style={{
          borderWidth: 1,
          borderColor: isSelected ? theme.primary : theme.border,
          backgroundColor: isSelected
            ? withOpacity(theme.primary, 0.08)
            : theme.card,
          opacity: isDisabled ? 0.55 : 1,
        }}
      >
        <CardContent className="gap-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1.5">
              <Text className="text-sm font-black text-card-foreground">
                {preset.label}
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                {preset.description}
              </Text>
            </View>
            {isSelected ? (
              <View
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: withOpacity(theme.primary, 0.14) }}
              >
                <Text variant="eyebrow">
                  Selected
                </Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row flex-wrap items-center gap-2.5">
            <View className="flex-row items-center gap-1.5">
              <FileQuestion size={13} color={theme.primary} />
              <Text variant="eyebrow">
                {effectiveQuestionCount} items
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Clock3 size={13} color={theme.accent} />
              <Text
                className="text-2xs font-bold uppercase tracking-[1px]"
                style={{ color: theme.accent }}
              >
                {effectiveMinutes} minutes
              </Text>
            </View>
          </View>

          {isDisabled ? (
            <Text variant="label">
              Not enough visible questions for this mode
            </Text>
          ) : null}
        </CardContent>
      </Card>
    </Pressable>
  )
}

export default function BoardExamSetDetailScreen() {
  const router = useRouter()
  const profile = useAuth((state) => state.profile)
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light
  const params = useLocalSearchParams<{ categoryId?: string; setId?: string }>()
  const categoryId = params.categoryId ?? ""
  const setId = params.setId ?? ""
  const isPremiumUser = profile?.isPremium === true

  const setDetailQuery = useQuery({
    queryKey: ["board-exam-set-detail", categoryId, setId, isPremiumUser],
    enabled: Boolean(categoryId) && Boolean(setId),
    queryFn: () =>
      getBoardExamSetDetail(categoryId, setId, {
        viewerIsPremium: isPremiumUser,
      }),
  })

  const set = setDetailQuery.data?.set ?? null
  const questions = useMemo(
    () => setDetailQuery.data?.questions ?? [],
    [setDetailQuery.data?.questions]
  )
  const hiddenPremiumQuestionCount =
    setDetailQuery.data?.hiddenPremiumQuestionCount ?? 0
  const visibleQuestionCount = questions.length
  const [selectedModeId, setSelectedModeId] = useState<string | null>(null)
  const [customMinutesDraft, setCustomMinutesDraft] = useState("180")

  const errorMessage =
    setDetailQuery.error instanceof Error
      ? setDetailQuery.error.message
      : setDetailQuery.error
        ? "Unable to load board exam questions. Please try again later."
        : null

  const modeCards = useMemo(
    () =>
      BOARD_EXAM_MODE_PRESETS.map((preset) => {
        const effectiveQuestionCount =
          preset.totalQuestions ?? visibleQuestionCount
        const effectiveMinutes = preset.isCustomMinutes
          ? Math.max(Number(customMinutesDraft || "0"), 0)
          : preset.minutes

        return {
          ...preset,
          effectiveQuestionCount,
          effectiveMinutes,
          isDisabled:
            visibleQuestionCount === 0 ||
            effectiveQuestionCount > visibleQuestionCount,
        }
      }),
    [customMinutesDraft, visibleQuestionCount]
  )

  const selectedMode = useMemo(
    () => modeCards.find((preset) => preset.id === selectedModeId) ?? null,
    [modeCards, selectedModeId]
  )

  const canStartQuiz =
    Boolean(selectedMode) &&
    selectedMode?.isDisabled !== true &&
    (selectedMode?.effectiveMinutes ?? 0) > 0 &&
    (selectedMode?.effectiveQuestionCount ?? 0) > 0

  function handleStartQuiz() {
    if (!selectedMode || !canStartQuiz) {
      return
    }

    router.push({
      pathname: "/quiz",
      params: {
        source: "board-exam",
        categoryId,
        setId,
        totalQuestions: String(selectedMode.effectiveQuestionCount),
        minutes: String(selectedMode.effectiveMinutes),
      },
    })
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      className="flex-1 bg-background"
    >
      <Stack.Screen options={{ title: set?.title ?? "Choose Mode" }} />
      <ScrollView
        contentContainerClassName="gap-3 px-4 pb-8 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {setDetailQuery.isLoading ? (
          <View className="gap-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </View>
        ) : null}

        {errorMessage ? (
          <EmptyState
            tone="destructive"
            title="Board exam questions unavailable"
            description={errorMessage}
          />
        ) : null}

        {hiddenPremiumQuestionCount > 0 ? (
          <Card
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              // backgroundColor: withOpacity(theme.accent, 0.08),
            }}
          >
            <CardContent size="compact" className="gap-3">
              <View className="flex-row items-center gap-2">
                <LockKeyhole size={14} color={theme.accent} />
                <Text
                  className="text-2xs font-bold uppercase tracking-[1px]"
                  style={{ color: theme.accent }}
                >
                  Free Preview
                </Text>
              </View>
              <Text className="text-sm font-bold text-card-foreground">
                You have access to {visibleQuestionCount} of{" "}
                {visibleQuestionCount + hiddenPremiumQuestionCount} questions
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                Free users can answer up to {FREE_QUESTION_LIMIT} questions per
                set. Upgrade to Premium to unlock all{" "}
                {hiddenPremiumQuestionCount} remaining questions and access
                every mode.
              </Text>
              <Pressable
                className="mt-1 h-11 flex-row items-center justify-center gap-2 rounded-md"
                style={{
                  backgroundColor: theme.accent,
                }}
                onPress={() =>
                  router.push({
                    pathname: "/premium",
                    params: {
                      source: "exam",
                      title: set?.title ?? "Board Exam Set",
                      categoryId,
                    },
                  })
                }
              >
                <Crown size={15} color={theme.accentForeground} />
                <Text
                  className="text-sm font-black"
                  style={{ color: theme.accentForeground }}
                >
                  Unlock All Questions
                </Text>
              </Pressable>
            </CardContent>
          </Card>
        ) : null}

        {/* {!setDetailQuery.isLoading && !errorMessage && set ? (
          <Card style={{ borderWidth: 1, borderColor: theme.border }}>
            <CardContent size="compact" className="gap-1.5">
              <Text className="text-sm font-bold text-card-foreground">
                Select a mode first
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                You must choose a mode before starting. Correct answers are not
                shown during the quiz, and you need to answer the current item
                before moving to the next one.
              </Text>
            </CardContent>
          </Card>
        ) : null} */}
        {!setDetailQuery.isLoading && !errorMessage ? (
          <View className="gap-3">
            {modeCards.map((preset) => (
              <BoardExamModeCard
                key={preset.id}
                preset={preset}
                isSelected={preset.id === selectedModeId}
                isDisabled={preset.isDisabled}
                effectiveQuestionCount={preset.effectiveQuestionCount}
                effectiveMinutes={preset.effectiveMinutes}
                theme={theme}
                onPress={() => setSelectedModeId(preset.id)}
              />
            ))}

            {selectedMode?.isCustomMinutes ? (
              <Card style={{ borderWidth: 1, borderColor: theme.border }}>
                <CardContent className="gap-2">
                  <Text variant="eyebrow">
                    Full item minutes
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    Type how many minutes the learner should take for all
                    available items in this set.
                  </Text>
                  <TextInput
                    value={customMinutesDraft}
                    onChangeText={(value) =>
                      setCustomMinutesDraft(value.replace(/[^0-9]/g, ""))
                    }
                    keyboardType="number-pad"
                    placeholder="180"
                    placeholderTextColor={theme.mutedForeground}
                    className="rounded-xl border px-4 py-3 text-sm text-foreground"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.input,
                      color: theme.foreground,
                      fontFamily: "PlusJakartaSans_500Medium",
                    }}
                  />
                </CardContent>
              </Card>
            ) : null}

            {!setDetailQuery.isLoading &&
            !errorMessage &&
            visibleQuestionCount === 0 ? (
              <Card style={{ borderWidth: 1, borderColor: theme.border }}>
                <CardContent className="gap-1.5">
                  <Text className="text-sm font-black text-card-foreground">
                    No visible questions in this set
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    No questions are available for this set yet. Check back
                    later for updates.
                  </Text>
                </CardContent>
              </Card>
            ) : null}
          </View>
        ) : null}

        <View className="pt-2">
          <Button
            className="h-12"
            disabled={!canStartQuiz}
            onPress={handleStartQuiz}
          >
            <Play size={16} color={theme.primaryForeground} />
            <Text className="font-bold text-primary-foreground">
              Start Board Exam
            </Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
