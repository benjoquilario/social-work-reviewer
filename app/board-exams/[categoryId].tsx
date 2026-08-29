import { useCallback, useMemo } from "react"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getCategoryDestination } from "@/lib/content/exam-categories"
import type { QuestionSet } from "@/lib/content/question-sets"
import {
  useExamCategory,
  useQuestionSets,
} from "@/hooks/use-exam-content"
import { QuestionSetCard } from "@/components/exam/set-card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { PaperSetupScreen } from "@/components/exam/paper-setup-screen"

/**
 * A category, routed by its own counts.
 *
 * `setCount > 0` opens the set picker. `setCount === 0` means the questions sit
 * directly under the category, and the member goes straight to the setup —
 * making them tap through an empty picker to get there would be a step that
 * exists only because the data has two shapes.
 */

const LIST_CONTENT_STYLE = { paddingHorizontal: 16, paddingVertical: 16 }

export default function ExamCategoryScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ categoryId?: string }>()
  const categoryId = params.categoryId ?? ""

  const categoryQuery = useExamCategory(categoryId)
  const category = categoryQuery.data ?? null

  const destination = useMemo(
    () => (category ? getCategoryDestination(category) : null),
    [category]
  )

  const setsQuery = useQuestionSets(categoryId, destination?.kind === "sets")

  const openSet = useCallback(
    (setId: string) => {
      router.push({
        pathname: "/board-exams/[categoryId]/[setId]",
        params: { categoryId, setId },
      })
    },
    [categoryId, router]
  )

  const renderSet = useCallback(
    ({ item }: ListRenderItemInfo<QuestionSet>) => (
      <QuestionSetCard set={item} onPress={() => openSet(item.id)} />
    ),
    [openSet]
  )

  const title = category?.title ?? "Board exams"

  if (categoryQuery.isLoading) {
    return (
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        className="flex-1 gap-3 bg-background px-4 py-4"
      >
        <Stack.Screen options={{ title }} />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </SafeAreaView>
    )
  }

  if (!category) {
    return (
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        className="flex-1 bg-background px-4 py-4"
      >
        <Stack.Screen options={{ title }} />
        <EmptyState
          tone="destructive"
          title="Category not found"
          description="This category is no longer published."
          action={
            <Button size="sm" variant="outline" onPress={() => router.back()}>
              <Text>Go back</Text>
            </Button>
          }
        />
      </SafeAreaView>
    )
  }

  if (destination?.kind !== "sets") {
    return <PaperSetupScreen category={category} set={null} />
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      className="flex-1 bg-background"
    >
      <Stack.Screen options={{ title }} />

      <FlashList
        data={setsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderSet}
        contentContainerStyle={LIST_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={
          <View className="gap-1 pb-4">
            <Text variant="label">
              {destination.setCount} {destination.setCount === 1 ? "set" : "sets"}
              {" · "}
              {category.questionCount} questions
            </Text>
            {category.description ? (
              <Text variant="caption">{category.description}</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          setsQuery.isLoading ? (
            <View className="gap-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </View>
          ) : (
            <EmptyState
              title="No sets published yet"
              description="The team is still preparing this category. Check back soon."
            />
          )
        }
      />
    </SafeAreaView>
  )
}

function ListSeparator() {
  return <View className="h-3" />
}
