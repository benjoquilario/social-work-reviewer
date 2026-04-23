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
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  Clock3,
  LockKeyhole,
  Search,
} from "lucide-react-native"
import { Pressable, ScrollView, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  getLearningSubjectById,
  listLearningTopicsBySubjectId,
} from "@/lib/learning-content"
import {
  getUserActivityFeed,
  listRecentLearningHistory,
  type ActivityLearningHistory,
  type ActivityQuizAttempt,
} from "@/lib/progress"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

const SHORT_DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
})

function formatLastViewedLabel(value: string) {
  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return "Recently viewed"
  }

  const deltaMinutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000)

  if (deltaMinutes < 1) {
    return "Just now"
  }

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`
  }

  const deltaHours = Math.floor(deltaMinutes / 60)
  if (deltaHours < 24) {
    return `${deltaHours}h ago`
  }

  const deltaDays = Math.floor(deltaHours / 24)
  if (deltaDays < 7) {
    return `${deltaDays}d ago`
  }

  return SHORT_DATE_FMT.format(new Date(timestamp))
}

const DAILY_ACTIVITY_TARGET = 4

function toDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function buildRecentDayKeys(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (days - 1 - index))

    return toDayKey(date)
  })
}

function buildTrackingSnapshot(
  attempts: ActivityQuizAttempt[],
  learningHistory: ActivityLearningHistory[]
) {
  const activityCountByDay = new Map<string, number>()

  for (const attempt of attempts) {
    const timestamp = new Date(attempt.finishedAt ?? attempt.startedAt)

    if (Number.isNaN(timestamp.getTime())) {
      continue
    }

    const dayKey = toDayKey(timestamp)
    activityCountByDay.set(dayKey, (activityCountByDay.get(dayKey) ?? 0) + 1)
  }

  for (const entry of learningHistory) {
    const timestamp = new Date(entry.lastAccessedAt)

    if (Number.isNaN(timestamp.getTime())) {
      continue
    }

    const dayKey = toDayKey(timestamp)
    activityCountByDay.set(dayKey, (activityCountByDay.get(dayKey) ?? 0) + 1)
  }

  const todayKey = toDayKey(new Date())
  const weeklyKeys = buildRecentDayKeys(7)

  return {
    dailyCount: activityCountByDay.get(todayKey) ?? 0,
    weeklyActiveDays: weeklyKeys.filter(
      (dayKey) => (activityCountByDay.get(dayKey) ?? 0) > 0
    ).length,
    weeklyTotalActivities: weeklyKeys.reduce(
      (total, dayKey) => total + (activityCountByDay.get(dayKey) ?? 0),
      0
    ),
  }
}

export default function ReviewCategoryScreen() {
  const router = useRouter()
  const { isAuthenticated, profile, refreshProfile, user } = useAuth()
  const colorScheme = useColorScheme()
  const activeTheme = colorScheme === "dark" ? THEME.dark : THEME.light
  const iconColor = activeTheme.primary
  const mutedIconColor = activeTheme.mutedForeground
  const params = useLocalSearchParams<{ categoryId?: string }>()
  const categoryId = params.categoryId ?? ""
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const isPremiumUser = profile?.isPremium === true
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light

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

  const category = subjectQuery.data?.category ?? null
  const topics = useMemo(
    () => subjectQuery.data?.topics ?? [],
    [subjectQuery.data?.topics]
  )
  const learningHistoryQuery = useQuery({
    queryKey: ["review-learning-history", user?.$id, categoryId],
    enabled: Boolean(user?.$id) && Boolean(categoryId),
    queryFn: () =>
      listRecentLearningHistory(user?.$id ?? "", {
        subjectId: categoryId,
        limit: 12,
      }),
    staleTime: 1000 * 20,
  })
  const recentHistory = learningHistoryQuery.data?.items ?? []
  const activityOverviewQuery = useQuery({
    queryKey: ["review-stack-activity-overview", user?.$id],
    enabled: Boolean(user?.$id),
    queryFn: () =>
      getUserActivityFeed(user?.$id ?? "", {
        quizAttemptsLimit: 80,
        learningHistoryLimit: 80,
        achievementsLimit: 6,
      }),
    staleTime: 1000 * 20,
  })
  const activityFeed = activityOverviewQuery.data ?? null
  const trackingSnapshot = useMemo(
    () =>
      buildTrackingSnapshot(
        activityFeed?.quizAttempts ?? [],
        activityFeed?.learningHistory ?? []
      ),
    [activityFeed?.learningHistory, activityFeed?.quizAttempts]
  )
  const dailyTrackingProgress = Math.min(
    100,
    Math.round((trackingSnapshot.dailyCount / DAILY_ACTIVITY_TARGET) * 100)
  )
  const weeklyTrackingProgress = Math.min(
    100,
    Math.round((trackingSnapshot.weeklyActiveDays / 7) * 100)
  )

  const visibleTopics = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return topics
    }

    return topics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(normalizedQuery) ||
        topic.description.toLowerCase().includes(normalizedQuery)
    )
  }, [deferredQuery, topics])

  const renderTopicItem = useCallback(
    ({ item: topic, index }: ListRenderItemInfo<(typeof topics)[number]>) => {
      const isUnavailable = topic.materialCount === 0
      const isTopicBlocked = isUnavailable

      return (
        <Pressable
          className="border-b border-border/80 px-3.5 py-3.5"
          disabled={isTopicBlocked}
          onPress={() => {
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
          }}
          style={{
            borderBottomWidth: index === visibleTopics.length - 1 ? 0 : 1,
            opacity: topic.isLocked || isTopicBlocked ? 0.65 : 1,
          }}
        >
          <View className="flex-row items-start gap-3">
            <View className="pt-0.5">
              {topic.isLocked ? (
                <LockKeyhole
                  size={20}
                  color={mutedIconColor}
                  strokeWidth={2.1}
                />
              ) : (
                <Bookmark size={20} color={mutedIconColor} strokeWidth={2.1} />
              )}
            </View>

            <View className="flex-1 gap-1.5">
              <Text className="text-sm font-semibold leading-6 text-card-foreground">
                {topic.title}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {topic.isLocked ? (
                  <View className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-destructive">
                      Premium locked
                    </Text>
                  </View>
                ) : null}
                {!topic.isLocked &&
                !isPremiumUser &&
                topic.hasPremiumContent ? (
                  <View className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
                      {topic.freeMaterialCount} free ·{" "}
                      {topic.premiumMaterialCount} premium
                    </Text>
                  </View>
                ) : null}
                {isUnavailable ? (
                  <View className="rounded-full border border-border bg-background px-2.5 py-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      No materials yet
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                {isUnavailable
                  ? "This topic exists in Appwrite, but no learning materials are attached yet."
                  : topic.isLocked
                    ? "This topic is premium-only for free users."
                    : topic.description}
              </Text>
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-primary">
                {topic.freeMaterialCount}/{topic.materialCount} visible
                materials
              </Text>
            </View>

            <View className="pt-0.5">
              {topic.isLocked ? (
                <LockKeyhole
                  size={20}
                  color={mutedIconColor}
                  strokeWidth={2.1}
                />
              ) : (
                <ChevronRight
                  size={20}
                  color={mutedIconColor}
                  strokeWidth={2.1}
                />
              )}
            </View>
          </View>
        </Pressable>
      )
    },
    [categoryId, isPremiumUser, mutedIconColor, router, visibleTopics.length]
  )

  if (subjectQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-3.5 px-4 pb-7 pt-3"
        >
          <Skeleton className="h-11 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (subjectQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-2 px-6">
          <Text className="text-center text-2xl font-black text-foreground">
            Review content unavailable
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            {subjectQuery.error instanceof Error
              ? subjectQuery.error.message
              : "Unable to load topics from Appwrite."}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!category) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-2 px-6">
          <Text className="text-center text-2xl font-black text-foreground">
            Subject not found
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            This subject ID does not exist in Appwrite.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlashList
        data={visibleTopics}
        keyExtractor={(item) => item.id}
        renderItem={renderTopicItem}
        ListHeaderComponent={
          <View className="gap-3.5 px-4 pt-3">
            <View className="flex-row items-center gap-3">
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-2xl"
                onPress={() => router.back()}
              >
                <ArrowLeft size={22} color={iconColor} strokeWidth={2.5} />
              </Pressable>

              <View className="flex-1 flex-row items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-2.5">
                <Search size={18} color={mutedIconColor} strokeWidth={2.4} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={`Search ${category.name}...`}
                  placeholderTextColor={mutedIconColor}
                  className="flex-1 text-sm text-foreground"
                />
              </View>
            </View>

            <View className="gap-1 px-1">
              <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-primary">
                Subject
              </Text>
              <Text className="text-[21px] font-black leading-7 text-foreground">
                {category.name}
              </Text>
              <Text className="text-[13px] leading-5 text-muted-foreground">
                {category.description}
              </Text>
            </View>

            <View className="gap-2.5 px-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] font-black uppercase tracking-[1.3px] text-primary">
                  Study Tracking
                </Text>
                <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Last 7 days
                </Text>
              </View>

              {!user ? (
                <View className="rounded-2xl border border-border bg-card px-3 py-3">
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    Sign in to view your streak and daily/weekly tracking.
                  </Text>
                </View>
              ) : activityOverviewQuery.isLoading ? (
                <View className="flex-row gap-2.5">
                  <Skeleton className="h-20 flex-1 rounded-2xl" />
                  <Skeleton className="h-20 flex-1 rounded-2xl" />
                </View>
              ) : activityOverviewQuery.error ? (
                <View className="rounded-2xl border border-border bg-card px-3 py-3">
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    {activityOverviewQuery.error instanceof Error
                      ? activityOverviewQuery.error.message
                      : "Unable to load tracking metrics right now."}
                  </Text>
                </View>
              ) : activityFeed ? (
                <>
                  <View className="flex-row gap-2.5">
                    <View
                      className="flex-1 rounded-2xl border px-3.5 py-3"
                      style={{
                        borderColor: theme.border,
                        backgroundColor: withOpacity(activeTheme.primary, 0.08),
                      }}
                    >
                      <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-primary">
                        Streak
                      </Text>
                      <Text className="mt-1 text-[19px] font-black text-card-foreground">
                        {activityFeed.dayStreak}
                      </Text>
                      <Text className="text-[11px] text-muted-foreground">
                        active days
                      </Text>
                    </View>

                    <View
                      className="flex-1 rounded-2xl border px-3.5 py-3"
                      style={{
                        borderColor: theme.border,
                        backgroundColor: withOpacity(activeTheme.accent, 0.08),
                      }}
                    >
                      <Text
                        className="text-[10px] font-bold uppercase tracking-[1.1px]"
                        style={{ color: activeTheme.accent }}
                      >
                        Weekly Avg
                      </Text>
                      <Text className="mt-1 text-[19px] font-black text-card-foreground">
                        {Math.round(activityFeed.weeklyAverageScore)}%
                      </Text>
                      <Text className="text-[11px] text-muted-foreground">
                        quiz score
                      </Text>
                    </View>
                  </View>

                  <View
                    className="rounded-2xl border border-border bg-card px-3.5 py-3"
                    style={{ borderColor: theme.border }}
                  >
                    <View className="gap-1.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          Daily Tracking
                        </Text>
                        <Text className="text-[11px] font-black text-primary">
                          {trackingSnapshot.dailyCount}/{DAILY_ACTIVITY_TARGET}
                        </Text>
                      </View>
                      <View
                        className="h-2 overflow-hidden rounded-full"
                        style={{
                          backgroundColor: withOpacity(
                            activeTheme.primary,
                            0.16
                          ),
                        }}
                      >
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${dailyTrackingProgress}%`,
                            backgroundColor: activeTheme.primary,
                          }}
                        />
                      </View>
                    </View>

                    <View className="mt-2 gap-1.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          Weekly Tracking
                        </Text>
                        <Text className="text-[11px] font-black text-primary">
                          {trackingSnapshot.weeklyActiveDays}/7 days
                        </Text>
                      </View>
                      <View
                        className="h-2 overflow-hidden rounded-full"
                        style={{
                          backgroundColor: withOpacity(
                            activeTheme.accent,
                            0.16
                          ),
                        }}
                      >
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${weeklyTrackingProgress}%`,
                            backgroundColor: activeTheme.accent,
                          }}
                        />
                      </View>
                      <Text className="text-[10px] leading-5 text-muted-foreground">
                        {trackingSnapshot.weeklyTotalActivities} total
                        activities this week.
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>

            <View className="gap-2.5 px-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] font-black uppercase tracking-[1.3px] text-primary">
                  Learning History
                </Text>
                <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {recentHistory.length}
                  {learningHistoryQuery.data?.hasMore ? "+" : ""} recent
                </Text>
              </View>

              {!user ? (
                <View className="rounded-2xl border border-border bg-card px-3 py-3">
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    Sign in to track and continue your last viewed lessons.
                  </Text>
                </View>
              ) : learningHistoryQuery.isLoading ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2.5 pr-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton
                        key={`history-skeleton-${index}`}
                        className="h-28 w-[215px] rounded-2xl"
                      />
                    ))}
                  </View>
                </ScrollView>
              ) : learningHistoryQuery.error ? (
                <View className="rounded-2xl border border-border bg-card px-3 py-3">
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    {learningHistoryQuery.error instanceof Error
                      ? learningHistoryQuery.error.message
                      : "Unable to load learning history right now."}
                  </Text>
                </View>
              ) : recentHistory.length === 0 ? (
                <View className="rounded-2xl border border-border bg-card px-3 py-3">
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    No lesson history yet in this subject. Open any topic to
                    start tracking.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                >
                  <View className="flex-row gap-2.5 pr-2">
                    {recentHistory.map((entry) => (
                      <Pressable
                        key={entry.id}
                        className="w-[215px] gap-2 rounded-2xl border border-border bg-card px-3.5 py-3"
                        onPress={() =>
                          router.push({
                            pathname: "/learn/[lessonId]",
                            params: { lessonId: entry.learningMaterialId },
                          })
                        }
                      >
                        <Text
                          className="text-[13px] font-bold leading-5 text-card-foreground"
                          numberOfLines={2}
                        >
                          {entry.materialTitle}
                        </Text>
                        <Text className="text-[11px] leading-4 text-muted-foreground">
                          {entry.status.replace("_", " ")} ·{" "}
                          {Math.round(entry.progressPercent)}% complete
                        </Text>
                        <View className="flex-row items-center gap-1.5">
                          <Clock3 size={12} color={mutedIconColor} />
                          <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {formatLastViewedLabel(entry.lastAccessedAt)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            <View className="px-1">
              <Text className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                {visibleTopics.length} of {topics.length} topics
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="px-4 pb-7">
            <View className="overflow-hidden rounded-[20px] border border-border bg-card px-3.5 py-4">
              <Text className="text-[13px] leading-5 text-muted-foreground">
                No topics found for this subject yet.
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}
