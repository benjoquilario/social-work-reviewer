import { useCallback, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { toContentViewer } from "@/lib/content/access"
import type { QuestionnaireMode } from "@/lib/schema"
import {
  listExamCategories,
  type ExamCategory,
} from "@/lib/content/exam-categories"
import { queryKeys } from "@/lib/query-keys"
import { ExamCategoryCard } from "@/components/exam/category-card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

/**
 * Every published exam category, straight from `exam_categories`.
 *
 * The counts on each card are the CMS's rollups, which is also what decides
 * where a tap goes — a category with sets opens a picker, one without opens
 * its questions (section 2). No query is needed to find that out.
 */

const LIST_CONTENT_STYLE = { paddingHorizontal: 16, paddingVertical: 16 }

function CategoriesSkeleton() {
  return (
    <View className="gap-3">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </View>
  )
}

export default function BoardExamCategoriesScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ mode?: string }>()
  const profile = useAuth((state) => state.profile)
  const viewer = useMemo(() => toContentViewer(profile), [profile])

  // Only the two values the schema allows. Anything else is a stale deep link
  // and falls through to "everything".
  const mode: QuestionnaireMode | undefined =
    params.mode === "quiz" || params.mode === "board_exam"
      ? params.mode
      : undefined

  const categoriesQuery = useQuery({
    queryKey: queryKeys.exam.categories(mode, viewer.isPremium),
    queryFn: () => listExamCategories({ viewer, mode }),
  })

  const categories = categoriesQuery.data ?? []

  const openCategory = useCallback(
    (categoryId: string) => {
      router.push({
        pathname: "/board-exams/[categoryId]",
        params: { categoryId },
      })
    },
    [router]
  )

  // Hoisted out of the list so FlashList is not handed a new function on every
  // render — a fresh reference re-renders every visible row.
  const renderCategory = useCallback(
    ({ item }: ListRenderItemInfo<ExamCategory>) => (
      <ExamCategoryCard
        category={item}
        onPress={() => openCategory(item.id)}
      />
    ),
    [openCategory]
  )

  const errorMessage =
    categoriesQuery.error instanceof Error
      ? categoriesQuery.error.message
      : categoriesQuery.error
        ? "We could not load the exam categories. Please try again."
        : null

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      className="flex-1 bg-background"
    >
      <Stack.Screen
        options={{
          title:
            mode === "quiz"
              ? "Quick quiz"
              : mode === "board_exam"
                ? "Board exams"
                : "All categories",
        }}
      />

      <FlashList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={LIST_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={
          categoriesQuery.isLoading || errorMessage ? (
            <View className="pb-3">
              {categoriesQuery.isLoading ? <CategoriesSkeleton /> : null}

              {errorMessage ? (
                <EmptyState
                  tone="destructive"
                  title="Categories unavailable"
                  description={errorMessage}
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => categoriesQuery.refetch()}
                    >
                      <Text>Try again</Text>
                    </Button>
                  }
                />
              ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !categoriesQuery.isLoading && !errorMessage ? (
            <EmptyState
              title={mode ? "Nothing in this mode yet" : "No categories yet"}
              description={
                mode
                  ? "No categories are published for this mode. Try the other one."
                  : "Nothing has been published for review yet. Check back soon."
              }
            />
          ) : null
        }
      />
    </SafeAreaView>
  )
}

function ListSeparator() {
  return <View className="h-3" />
}
