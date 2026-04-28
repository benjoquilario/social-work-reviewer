import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import {
  ArrowLeft,
  ChevronRight,
  FileQuestion,
  ListChecks,
  LockKeyhole,
} from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  listBoardExamCategories,
  type BoardExamCategorySummary,
} from "@/lib/board-exams"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { AppShellHeader } from "@/components/app-shell-header"

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
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor: withOpacity(
                      category.isLocked ? theme.accent : theme.primary,
                      0.14
                    ),
                  }}
                >
                  <Text
                    className="text-[10px] font-black uppercase tracking-[1.1px]"
                    style={{
                      color: category.isLocked ? theme.accent : theme.primary,
                    }}
                  >
                    {category.code ?? "Category"}
                  </Text>
                </View>
              </View>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                {category.description ||
                  "Board exam category with curated sets and answer keys."}
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

          {category.isLocked ? (
            <View
              className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1"
              style={{ backgroundColor: withOpacity(theme.accent, 0.12) }}
            >
              <LockKeyhole size={12} color={theme.accent} />
              <Text
                className="text-[10px] font-black uppercase tracking-[1.1px]"
                style={{ color: theme.accent }}
              >
                Premium category for free users
              </Text>
            </View>
          ) : null}
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

  const stats = useMemo(
    () => [
      { label: "Categories", value: String(categories.length) },
      {
        label: "Sets",
        value: String(
          categories.reduce((total, category) => total + category.setCount, 0)
        ),
      },
      {
        label: "Visible",
        value: String(
          categories.reduce(
            (total, category) => total + category.availableQuestionCount,
            0
          )
        ),
      },
    ],
    [categories]
  )

  const errorMessage =
    categoriesQuery.error instanceof Error
      ? categoriesQuery.error.message
      : categoriesQuery.error
        ? "Unable to load board exam categories from Appwrite."
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
    <SafeAreaView className="flex-1 bg-background">
      <FlashList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
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
              onPress={() => router.push("/")}
            >
              <ArrowLeft size={15} color={theme.primary} />
              <Text className="text-[12px] font-bold text-primary">Home</Text>
            </Pressable>

            <AppShellHeader
              eyebrow="Board Exams"
              title="Choose a Category"
              subtitle="Open a board exam category, choose a set, select a mode, and take a timed exam."
              avatarLabel="BE"
              badgeLabel="Library"
              badgeValue={`${categories.length} categories`}
              stats={stats}
              compact
            />

            {categoriesQuery.isLoading ? (
              <View className="gap-3">
                <Skeleton className="h-32 rounded-3xl" />
                <Skeleton className="h-32 rounded-3xl" />
              </View>
            ) : null}

            {errorMessage ? (
              <Card style={{ borderWidth: 1, borderColor: theme.border }}>
                <CardContent className="gap-1.5 px-4 py-3.5">
                  <Text className="text-[13px] font-black text-destructive">
                    Board exam categories unavailable
                  </Text>
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    {errorMessage}
                  </Text>
                </CardContent>
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !categoriesQuery.isLoading && !errorMessage ? (
            <Card style={{ borderWidth: 1, borderColor: theme.border }}>
              <CardContent className="gap-1.5 px-4 py-4">
                <Text className="text-[14px] font-black text-card-foreground">
                  No board exam categories yet
                </Text>
                <Text className="text-[12px] leading-5 text-muted-foreground">
                  Add board exam category, set, question, and choice records in
                  Appwrite to populate this screen.
                </Text>
              </CardContent>
            </Card>
          ) : null
        }
      />
    </SafeAreaView>
  )
}
