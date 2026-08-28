import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useAuth } from "@/contexts/auth-context"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { Play, Search } from "lucide-react-native"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { formatRelativeDateLabel } from "@/lib/home-utils"
import {
  getLearningSubjectById,
  listLearningTopicsBySubjectId,
  type LearningTopicSummary,
} from "@/lib/learning-content"
import { listRecentLearningHistory } from "@/lib/progress"
import { useThemePalette } from "@/hooks/use-theme"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { MotionPressable } from "@/components/ui/motion"
import { SectionHeader } from "@/components/ui/section-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { TopicCard } from "@/components/learn"

const TopicSeparator = () => <View className="h-2.5" />

export default function ReviewCategoryScreen() {
  const router = useRouter()
  const theme = useThemePalette()
  const { isAuthenticated, profile, refreshProfile, user } = useAuth()
  const params = useLocalSearchParams<{ categoryId?: string }>()
  const categoryId = params.categoryId ?? ""
  const isPremiumUser = profile?.isPremium === true

  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const subjectQuery = useQuery({
    queryKey: ["learning-subject", categoryId, isPremiumUser],
    enabled: Boolean(categoryId),
    queryFn: async () => {
      const [category, topics] = await Promise.all([
        getLearningSubjectById(categoryId, { viewerIsPremium: isPremiumUser }),
        listLearningTopicsBySubjectId(categoryId, {
          viewerIsPremium: isPremiumUser,
        }),
      ])

      return { category, topics }
    },
  })

  // Only the single most recent item. This screen used to carry a horizontal
  // carousel of twelve, on top of a full study-tracking dashboard — streak,
  // weekly average and two progress bars, all of which the Home tab already
  // owns, built from a local copy of home-utils' day-bucketing helpers.
  const lastOpenedQuery = useQuery({
    queryKey: ["review-last-opened", user?.$id, categoryId],
    enabled: Boolean(user?.$id) && Boolean(categoryId),
    queryFn: () =>
      listRecentLearningHistory(
        { userId: user?.$id ?? "" },
        { subjectId: categoryId, limit: 1 }
      ),
    staleTime: 1000 * 20,
  })

  const category = subjectQuery.data?.category ?? null
  const topics = useMemo(
    () => subjectQuery.data?.topics ?? [],
    [subjectQuery.data?.topics]
  )
  const lastOpened = lastOpenedQuery.data?.items?.[0] ?? null

  // Position is the topic's place in the FULL list, so filtering the list
  // never renumbers what is left.
  const positionById = useMemo(
    () => new Map(topics.map((topic, index) => [topic.id, index + 1])),
    [topics]
  )

  const visibleTopics = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()

    if (!normalized) {
      return topics
    }

    return topics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(normalized) ||
        topic.description.toLowerCase().includes(normalized)
    )
  }, [deferredQuery, topics])

  const handleTopicPress = useCallback(
    (topic: LearningTopicSummary) => {
      if (topic.isLocked) {
        router.push({
          pathname: "/premium",
          params: {
            source: "topic",
            title: topic.title,
            categoryId,
            topicId: topic.id,
          },
        })
        return
      }

      router.push({
        pathname: "/learn/topic/[topicId]",
        params: { topicId: topic.id },
      })
    },
    [categoryId, router]
  )

  const renderTopic = useCallback(
    ({ item, index }: ListRenderItemInfo<LearningTopicSummary>) => (
      <TopicCard
        topic={item}
        position={positionById.get(item.id) ?? index + 1}
        theme={theme}
        onPress={handleTopicPress}
      />
    ),
    [handleTopicPress, positionById, theme]
  )

  if (subjectQuery.isLoading) {
    return (
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        className="flex-1 gap-3 bg-background px-4 pt-3"
      >
        <Skeleton className="h-12 rounded-md" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </SafeAreaView>
    )
  }

  if (subjectQuery.error || !category) {
    return (
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        className="flex-1 justify-center bg-background px-4"
      >
        <EmptyState
          tone="destructive"
          title={
            subjectQuery.error ? "Subject unavailable" : "Subject not found"
          }
          description={
            subjectQuery.error instanceof Error
              ? subjectQuery.error.message
              : "This subject could not be loaded. It may have been removed."
          }
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      className="flex-1 bg-background"
    >
      <Stack.Screen options={{ title: category.name }} />

      <View className="px-4 pb-3 pt-3">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search topics"
          accessibilityLabel="Search topics in this subject"
          returnKeyType="search"
          leading={<Search size={16} color={theme.mutedForeground} />}
        />
      </View>

      <FlashList
        data={visibleTopics}
        extraData={theme}
        keyExtractor={(item) => item.id}
        renderItem={renderTopic}
        ItemSeparatorComponent={TopicSeparator}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View className="gap-4 pb-4">
            <Card>
              <CardContent size="compact" className="gap-2.5">
                <Text variant="callout" className="text-muted-foreground">
                  {category.description || "No subject description added yet."}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Badge tone="muted" size="sm">
                    {`${category.topicCount} topics`}
                  </Badge>
                  <Badge tone="muted" size="sm">
                    {`${category.materialCount} materials`}
                  </Badge>
                  {!isPremiumUser && category.hasPremiumContent ? (
                    <Badge tone="accent" size="sm">
                      {`${category.premiumMaterialCount} premium`}
                    </Badge>
                  ) : null}
                </View>
              </CardContent>
            </Card>

            {lastOpened ? (
              <MotionPressable
                accessibilityRole="button"
                accessibilityLabel={`Continue ${lastOpened.materialTitle}`}
                onPress={() =>
                  router.push({
                    pathname: "/learn/[lessonId]",
                    params: { lessonId: lastOpened.learningMaterialId },
                  })
                }
              >
                <Card className="border-primary/25">
                  <CardContent
                    size="compact"
                    className="flex-row items-center gap-3"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary">
                      <Play
                        size={14}
                        color={theme.primaryForeground}
                        fill={theme.primaryForeground}
                      />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text variant="label" className="text-primary">
                        Continue
                      </Text>
                      <Text
                        variant="callout"
                        className="font-bold"
                        numberOfLines={1}
                      >
                        {lastOpened.materialTitle}
                      </Text>
                      <Text variant="caption" numberOfLines={1}>
                        {Math.round(lastOpened.progressPercent)}% ·{" "}
                        {formatRelativeDateLabel(lastOpened.lastAccessedAt)}
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              </MotionPressable>
            ) : null}

            <SectionHeader
              title="Topics"
              action={
                <Text variant="label">
                  {visibleTopics.length} of {topics.length}
                </Text>
              }
            />
          </View>
        }
        ListEmptyComponent={
          query.trim() ? (
            <EmptyState
              title="No matching topics"
              description={`Nothing in ${category.name} matches "${query.trim()}".`}
            />
          ) : (
            <EmptyState
              title="No topics yet"
              description="This subject has no topics added in Appwrite yet."
            />
          )
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}
