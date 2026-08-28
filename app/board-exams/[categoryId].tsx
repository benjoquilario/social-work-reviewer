import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { FileQuestion, LockKeyhole } from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  listBoardExamSetsByCategoryId,
  type BoardExamSetSummary,
} from "@/lib/board-exams"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

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
        className="rounded-xl"
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          opacity: isUnavailable ? 0.64 : 1,
          backgroundColor: theme.card,
        }}
      >
        <CardContent className="gap-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-black text-card-foreground">
                {set.title}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {set.description || "Board exam set"}
              </Text>
            </View>
            <Badge tone="primary" size="sm">
              <Text className="text-2xs font-bold uppercase tracking-[1px]">
                {set.setCode}
              </Text>
            </Badge>
          </View>

          <View className="flex-row flex-wrap items-center gap-3">
            <View className="flex-row items-center gap-1.5">
              <FileQuestion size={13} color={theme.primary} />
              <Text variant="eyebrow">
                {set.totalQuestionCount} questions
              </Text>
            </View>
            {set.hasPremiumQuestions ? (
              <View className="flex-row items-center gap-1.5">
                <LockKeyhole size={13} color={theme.accent} />
                <Text
                  className="text-2xs font-bold uppercase tracking-[1px]"
                  style={{ color: theme.accent }}
                >
                  {set.freeQuestionCount} free · {set.premiumQuestionCount}{" "}
                  locked
                </Text>
              </View>
            ) : null}
            {isUnavailable ? (
              <Text variant="label">
                No questions yet
              </Text>
            ) : null}
          </View>
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

  const errorMessage =
    setsQuery.error instanceof Error
      ? setsQuery.error.message
      : setsQuery.error
        ? "Unable to load board exam sets. Please try again later."
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
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      className="flex-1 bg-background"
    >
      <Stack.Screen options={{ title: category?.title ?? "Board Exams" }} />
      <FlashList
        data={sets}
        extraData={theme}
        keyExtractor={(item) => item.id}
        renderItem={renderSet}
        contentContainerStyle={LIST_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View className="pb-3">
            {setsQuery.isLoading ? (
              <View className="gap-3 px-4">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </View>
            ) : null}

            {errorMessage ? (
              <View className="px-4">
                <EmptyState
                  tone="destructive"
                  title="Board exam sets unavailable"
                  description={errorMessage}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !setsQuery.isLoading && !errorMessage ? (
            <EmptyState
              title="No sets yet for this category"
              description="No sets are available for this category yet. Check back later for updates."
            />
          ) : null
        }
      />
    </SafeAreaView>
  )
}
