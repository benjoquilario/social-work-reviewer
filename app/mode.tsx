import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { QUIZ_MODES } from "@/data/reviewer-data"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ChevronLeft, Clock3, ListChecks } from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getQuizCategoryDetail } from "@/lib/quiz-content"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

export default function ModeSelectionScreen() {
  const router = useRouter()
  const { isAuthenticated, profile, refreshProfile } = useAuth()
  const colorScheme = useColorScheme()
  const iconColor =
    colorScheme === "dark"
      ? THEME.dark.mutedForeground
      : THEME.light.mutedForeground
  const params = useLocalSearchParams<{ categoryId?: string }>()
  const categoryId = params.categoryId ?? ""
  const isPremiumUser = profile?.isPremium === true

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const categoryQuery = useQuery({
    queryKey: ["quiz-category", categoryId, isPremiumUser],
    enabled: Boolean(categoryId),
    queryFn: () =>
      getQuizCategoryDetail(categoryId, { viewerIsPremium: isPremiumUser }),
  })

  const category = categoryQuery.data ?? null
  const isCategoryUnavailable =
    !category || category.isLocked || category.availableQuestionCount === 0

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-3.5 px-4 py-4">
        <Text className="text-[24px] font-extrabold text-foreground">
          Select Quiz Mode
        </Text>

        {categoryQuery.isLoading ? (
          <View className="gap-3">
            <Skeleton className="h-5 w-full rounded-lg" />
            <Skeleton className="h-24 rounded-2xl" />
          </View>
        ) : categoryQuery.error ? (
          <Card>
            <CardContent className="gap-2 px-3.5 py-3.5">
              <Text className="text-[15px] font-bold text-destructive">
                Quiz category unavailable
              </Text>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                {categoryQuery.error instanceof Error
                  ? categoryQuery.error.message
                  : "Unable to load quiz category from Appwrite."}
              </Text>
            </CardContent>
          </Card>
        ) : (
          <Text className="text-[13px] leading-5 text-muted-foreground">
            {category
              ? `Category: ${category.name} • ${category.availableQuestionCount} available questions • ${category.totalQuestionCount} total in Appwrite`
              : "Pick a mode to start your timed review session."}
          </Text>
        )}

        <Card>
          <CardContent className="overflow-hidden px-0 py-0">
            {QUIZ_MODES.map((mode) => (
              <Pressable
                key={mode.id}
                className="gap-1 border-b border-border px-3.5 py-3.5"
                disabled={isCategoryUnavailable}
                onPress={() => {
                  if (!category) {
                    return
                  }

                  router.push({
                    pathname: "/quiz",
                    params: {
                      categoryId: category.id,
                      totalQuestions: String(mode.totalQuestions),
                      minutes: String(mode.minutes),
                    },
                  })
                }}
                style={{ opacity: isCategoryUnavailable ? 0.55 : 1 }}
              >
                <Text className="text-[15px] font-bold text-card-foreground">
                  {mode.totalQuestions} Questions / {mode.minutes} Minutes
                </Text>
                <View className="flex-row items-center gap-2">
                  <ListChecks size={14} color={iconColor} />
                  <Clock3 size={14} color={iconColor} />
                  <Text className="text-[12px] font-semibold text-muted-foreground">
                    Timed reviewer mode
                  </Text>
                </View>
                <Text className="text-[12px] text-muted-foreground">
                  Focus mode for memorization and board-exam style pacing.
                </Text>
              </Pressable>
            ))}
          </CardContent>
        </Card>

        {category ? (
          <Card>
            <CardContent className="gap-2 px-3.5 py-3.5">
              <Text className="text-[15px] font-bold text-card-foreground">
                What this category covers
              </Text>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                {category.description || "No subject description added yet."}
              </Text>
              <Text className="text-[12px] font-semibold uppercase tracking-wide text-primary">
                {category.freeQuestionCount} free •{" "}
                {category.premiumQuestionCount} premium
              </Text>
              {category.isLocked ? (
                <Text className="text-[12px] leading-5 text-muted-foreground">
                  This category is currently premium-only for free users.
                </Text>
              ) : null}
              {!category.isLocked && category.availableQuestionCount === 0 ? (
                <Text className="text-[12px] leading-5 text-muted-foreground">
                  No eligible Appwrite questions are available for this category
                  yet.
                </Text>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Button
          variant="outline"
          className="h-10"
          onPress={() => router.back()}
        >
          <ChevronLeft size={16} color={iconColor} />
          <Text className="text-sm font-bold">Back to Categories</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}
