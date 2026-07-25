import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { Stack, useRouter } from "expo-router"
import { ChevronRight, FileQuestion, ListChecks } from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  listBoardExamCategories,
  type BoardExamCategorySummary,
} from "@/lib/board-exams"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

const LIST_CONTENT_STYLE = { paddingHorizontal: 16, paddingVertical: 16 }

function BoardExamCategoryCard({
  category,
  onPress,
  theme,
}: {
  category: BoardExamCategorySummary
  onPress: () => void
  theme: (typeof THEME)["light"] | (typeof THEME)["dark"]
}) {
  return (
    <Pressable onPress={onPress}>
      <Card
        className="rounded-[24px]"
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: category.isLocked
            ? withOpacity(theme.accent, 0.06)
            : theme.card,
        }}
      >
        <CardContent className="gap-2.5 px-4 py-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1.5">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-[16px] font-black text-card-foreground">
                  {category.title}
                </Text>
                <Badge variant={category.isLocked ? "accent" : "default"}>
                  <Text className="text-[10px] font-black uppercase tracking-[1.1px]">
                    {category.code ?? "Category"}
                  </Text>
                </Badge>
              </View>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                {category.description ||
                  "Practice questions and review sets for board exam preparation."}
              </Text>
            </View>

            <ChevronRight size={18} color={theme.mutedForeground} />
          </View>

          <View className="flex-row flex-wrap items-center gap-3">
            <View className="flex-row items-center gap-1.5">
              <ListChecks size={13} color={theme.primary} />
              <Text className="text-[11px] font-semibold uppercase tracking-[0.9px] text-primary">
                {category.setCount} sets
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <FileQuestion size={13} color={theme.accent} />
              <Text
                className="text-[11px] font-semibold uppercase tracking-[0.9px]"
                style={{ color: theme.accent }}
              >
                {category.availableQuestionCount} visible
              </Text>
            </View>
            {category.premiumQuestionCount > 0 ? (
              <Text className="text-[11px] font-semibold uppercase tracking-[0.9px] text-muted-foreground">
                {category.premiumQuestionCount} premium
              </Text>
            ) : null}
          </View>

          {/* {category.premiumQuestionCount > 0 ? (
            <View
              className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1"
              style={{ backgroundColor: withOpacity(theme.accent, 0.12) }}
            >
              <LockKeyhole size={12} color={theme.accent} />
              <Text
                className="text-[10px] font-black uppercase tracking-[1.1px]"
                style={{ color: theme.accent }}
              >
                {category.freeQuestionCount} free · {category.premiumQuestionCount} premium
              </Text>
            </View>
          ) : null} */}
        </CardContent>
      </Card>
    </Pressable>
  )
}

export default function BoardExamCategoriesScreen() {
  const router = useRouter()
  const profile = useAuth((state) => state.profile)
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light
  const isPremiumUser = profile?.isPremium === true

  const categoriesQuery = useQuery({
    queryKey: ["board-exam-categories", isPremiumUser],
    queryFn: () => listBoardExamCategories({ viewerIsPremium: isPremiumUser }),
  })

  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data]
  )

  const errorMessage =
    categoriesQuery.error instanceof Error
      ? categoriesQuery.error.message
      : categoriesQuery.error
        ? "Unable to load board exam categories. Please try again later."
        : null

  const renderCategory = ({
    item,
  }: ListRenderItemInfo<BoardExamCategorySummary>) => (
    <BoardExamCategoryCard
      category={item}
      theme={theme}
      onPress={() =>
        router.push({
          pathname: "/board-exams/[categoryId]",
          params: { categoryId: item.id },
        })
      }
    />
  )

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      className="flex-1 bg-background"
    >
      <Stack.Screen options={{ title: "Board Exams" }} />
      <FlashList
        data={categories}
        extraData={theme}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={LIST_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View className="pb-3">
            {categoriesQuery.isLoading ? (
              <View className="gap-3 px-4">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </View>
            ) : null}

            {errorMessage ? (
              <View className="px-4">
                <EmptyState
                  tone="destructive"
                  title="Board exam categories unavailable"
                  description={errorMessage}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !categoriesQuery.isLoading && !errorMessage ? (
            <EmptyState
              title="No board exam categories yet"
              description="No board exam categories are available right now. Check back later for updates."
            />
          ) : null
        }
      />
    </SafeAreaView>
  )
}
