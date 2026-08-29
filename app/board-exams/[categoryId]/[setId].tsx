import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"

import { useExamCategory, useQuestionSet } from "@/hooks/use-exam-content"
import { PaperSetupScreen } from "@/components/exam/paper-setup-screen"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

/**
 * One lettered set, ready to start.
 *
 * The setup itself is `PaperSetupScreen`, shared with the no-set shape — this
 * route only resolves which category and set the member picked.
 */
export default function QuestionSetScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    categoryId?: string
    setId?: string
  }>()

  const categoryId = params.categoryId ?? ""
  const setId = params.setId ?? ""

  const categoryQuery = useExamCategory(categoryId)
  const setQuery = useQuestionSet(setId)

  const category = categoryQuery.data ?? null
  const set = setQuery.data ?? null
  const isLoading = categoryQuery.isLoading || setQuery.isLoading

  if (isLoading) {
    return (
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        className="flex-1 gap-3 bg-background px-4 py-4"
      >
        <Stack.Screen options={{ title: "Loading" }} />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </SafeAreaView>
    )
  }

  // A set whose `categoryId` does not match the route is a stale deep link —
  // opening it would show one category's title above another's questions.
  if (!category || !set || set.categoryId !== category.id) {
    return (
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        className="flex-1 bg-background px-4 py-4"
      >
        <Stack.Screen options={{ title: "Not found" }} />
        <EmptyState
          tone="destructive"
          title="Set not found"
          description="This set is no longer published, or it belongs to another category."
          action={
            <Button
              size="sm"
              variant="outline"
              onPress={() => router.replace("/board-exams")}
            >
              <Text>Browse categories</Text>
            </Button>
          }
        />
      </SafeAreaView>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: set.title }} />
      <PaperSetupScreen category={category} set={set} />
    </>
  )
}
