import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  FileQuestion,
  ListChecks,
  LockKeyhole,
} from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  listBoardExamSetsByCategoryId,
  type BoardExamSetSummary,
} from "@/lib/board-exams"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { AppShellHeader } from "@/components/app-shell-header"

const LIST_CONTENT_STYLE = { paddingHorizontal: 16, paddingVertical: 16 }

function BoardExamSetCard({
  set,
  onPress,
  theme,
}: {
  set: BoardExamSetSummary
  onPress: () => void
  theme: (typeof THEME)["light"] | (typeof THEME)["dark"]
}) {
  const isUnavailable = set.totalQuestionCount === 0

  return (
    <Pressable onPress={onPress} disabled={isUnavailable}>
      <Card
        className="rounded-[24px]"
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          opacity: isUnavailable ? 0.64 : 1,
          backgroundColor:
            set.isLocked && !isUnavailable
              ? withOpacity(theme.accent, 0.06)
              : theme.card,
        }}
      >
        <CardContent className="gap-2.5 px-4 py-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1.5">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-[16px] font-black text-card-foreground">
                  {set.title}
                </Text>
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor: withOpacity(
                      set.isLocked ? theme.accent : theme.primary,
                      0.14
                    ),
                  }}
                >
                  <Text
                    className="text-[10px] font-black uppercase tracking-[1.1px]"
                    style={{
                      color: set.isLocked ? theme.accent : theme.primary,
                    }}
                  >
                    {set.setCode}
                  </Text>
                </View>
              </View>

              <Text className="text-[12px] leading-5 text-muted-foreground">
                {set.description ||
                  "Structured board exam set with question and answer keys."}
              </Text>

              <View className="flex-row flex-wrap items-center gap-2.5">
                <View className="flex-row items-center gap-1.5">
                  <Clock3 size={13} color={theme.primary} />
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.9px] text-primary">
                    {set.questionType}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <FileQuestion size={13} color={theme.accent} />
                  <Text
                    className="text-[11px] font-semibold uppercase tracking-[0.9px]"
                    style={{ color: theme.accent }}
                  >
                    {set.availableQuestionCount} visible
                  </Text>
                </View>
                {set.premiumQuestionCount > 0 ? (
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.9px] text-muted-foreground">
                    {set.premiumQuestionCount} premium
                  </Text>
                ) : null}
              </View>
            </View>

            <ChevronRight size={18} color={theme.mutedForeground} />
          </View>

          <View className="flex-row flex-wrap items-center gap-2.5">
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: withOpacity(theme.primary, 0.12) }}
            >
              <Text className="text-[10px] font-black uppercase tracking-[1px] text-primary">
                {set.totalQuestionCount} questions
              </Text>
            </View>
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: withOpacity(theme.accent, 0.12) }}
            >
              <Text
                className="text-[10px] font-black uppercase tracking-[1px]"
                style={{ color: theme.accent }}
              >
                {set.totalItems} target items
              </Text>
            </View>
          </View>

          {set.isLocked ? (
            <View
              className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1"
              style={{ backgroundColor: withOpacity(theme.accent, 0.12) }}
            >
              <LockKeyhole size={12} color={theme.accent} />
              <Text
                className="text-[10px] font-black uppercase tracking-[1.1px]"
                style={{ color: theme.accent }}
              >
                Premium-only visible content
              </Text>
            </View>
          ) : null}

          {isUnavailable ? (
            <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
              No published questions yet
            </Text>
          ) : null}
        </CardContent>
      </Card>
    </Pressable>
  )
}

export default function BoardExamSetsScreen() {
  const router = useRouter()
  const profile = useAuth((state) => state.profile)
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light
  const params = useLocalSearchParams<{ categoryId?: string }>()
  const categoryId = params.categoryId ?? ""
  const isPremiumUser = profile?.isPremium === true

  const setsQuery = useQuery({
    queryKey: ["board-exam-sets", categoryId, isPremiumUser],
    enabled: Boolean(categoryId),
    queryFn: () =>
      listBoardExamSetsByCategoryId(categoryId, {
        viewerIsPremium: isPremiumUser,
      }),
  })

  const category = setsQuery.data?.category ?? null
  const sets = useMemo(() => setsQuery.data?.sets ?? [], [setsQuery.data?.sets])

  const stats = useMemo(
    () => [
      { label: "Sets", value: String(sets.length) },
      {
        label: "Visible",
        value: String(
          sets.reduce((total, set) => total + set.availableQuestionCount, 0)
        ),
      },
      {
        label: "Locked",
        value: String(sets.filter((set) => set.isLocked).length),
      },
    ],
    [sets]
  )

  const errorMessage =
    setsQuery.error instanceof Error
      ? setsQuery.error.message
      : setsQuery.error
        ? "Unable to load board exam sets from Appwrite."
        : null

  const renderSet = ({ item }: ListRenderItemInfo<BoardExamSetSummary>) => (
    <BoardExamSetCard
      set={item}
      theme={theme}
      onPress={() =>
        router.push({
          pathname: "/board-exams/[categoryId]/[setId]",
          params: {
            categoryId,
            setId: item.id,
          },
        })
      }
    />
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlashList
        data={sets}
        keyExtractor={(item) => item.id}
        renderItem={renderSet}
        contentContainerStyle={LIST_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View className="gap-3 pb-4">
            <Pressable
              className="h-10 flex-row items-center gap-2 rounded-2xl px-3"
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                alignSelf: "flex-start",
              }}
              onPress={() => router.push("..")}
            >
              <ArrowLeft size={15} color={theme.primary} />
              <Text className="text-[12px] font-bold text-primary">
                Categories
              </Text>
            </Pressable>

            <AppShellHeader
              eyebrow="Board Exams"
              title={category?.title ?? "Choose Set"}
              subtitle="Choose a set, then select a timed mode before starting the board exam."
              avatarLabel="SET"
              badgeLabel="Available"
              badgeValue={`${sets.length} sets`}
              stats={stats}
              compact
            />

            {category?.description ? (
              <Card style={{ borderWidth: 1, borderColor: theme.border }}>
                <CardContent className="gap-1.5 px-4 py-3.5">
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    {category.description}
                  </Text>
                </CardContent>
              </Card>
            ) : null}

            {setsQuery.isLoading ? (
              <View className="gap-3">
                <Skeleton className="h-32 rounded-3xl" />
                <Skeleton className="h-32 rounded-3xl" />
              </View>
            ) : null}

            {errorMessage ? (
              <Card style={{ borderWidth: 1, borderColor: theme.border }}>
                <CardContent className="gap-1.5 px-4 py-3.5">
                  <Text className="text-[13px] font-black text-destructive">
                    Board exam sets unavailable
                  </Text>
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    {errorMessage}
                  </Text>
                </CardContent>
              </Card>
            ) : null}

            {!setsQuery.isLoading && !errorMessage && category ? (
              <View className="flex-row flex-wrap items-center gap-2.5">
                <View
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: withOpacity(theme.primary, 0.12) }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <ListChecks size={12} color={theme.primary} />
                    <Text className="text-[10px] font-black uppercase tracking-[1px] text-primary">
                      {sets.length} set selections
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !setsQuery.isLoading && !errorMessage ? (
            <Card style={{ borderWidth: 1, borderColor: theme.border }}>
              <CardContent className="gap-1.5 px-4 py-4">
                <Text className="text-[14px] font-black text-card-foreground">
                  No sets yet for this category
                </Text>
                <Text className="text-[12px] leading-5 text-muted-foreground">
                  Add Set A/B/C/D entries under this category in Appwrite.
                </Text>
              </CardContent>
            </Card>
          ) : null
        }
      />
    </SafeAreaView>
  )
}
