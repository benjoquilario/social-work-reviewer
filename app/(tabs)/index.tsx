import { memo, useCallback, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DAILY_TRACKER, PERFORMANCE_METRICS } from "@/data/reviewer-data"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import {
  ArrowRight,
  BookOpenText,
  ChartColumnIncreasing,
  FolderOpen,
  LockKeyhole,
  MessagesSquare,
  Newspaper,
} from "lucide-react-native"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  listLearningSubjects,
  type LearningSubject,
} from "@/lib/learning-content"
import { getStaggerDelay } from "@/lib/motion"
import {
  getUserActivityFeed,
  type ActivityLearningHistory,
  type ActivityQuizAttempt,
} from "@/lib/progress"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { FadeInView, MotionPressable } from "@/components/ui/motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { AppShellHeader } from "@/components/app-shell-header"

const SubjectCardSeparator = memo(function SubjectCardSeparator() {
  return <View className="w-2.5" />
})

const DAILY_ACTIVITY_TARGET = 4

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

const HomeSubjectCard = memo(function HomeSubjectCard({
  subject,
  theme,
  onPrimaryAction,
  onSecondaryAction,
}: {
  subject: LearningSubject
  theme: ThemePalette
  onPrimaryAction: (subject: LearningSubject) => void
  onSecondaryAction: (subject: LearningSubject) => void
}) {
  const isLocked = subject.isLocked
  const tone = isLocked ? theme.accent : theme.primary
  const badgeBg = isLocked ? withOpacity(theme.accent, 0.14) : theme.secondary
  const badgeText = isLocked ? theme.accent : theme.secondaryForeground
  const primaryCtaBg = isLocked ? theme.secondary : tone
  const primaryCtaText = isLocked
    ? theme.secondaryForeground
    : theme.primaryForeground

  return (
    <View className="w-[300px]">
      <Card
        className="overflow-hidden rounded-[26px]"
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
        }}
      >
        <CardContent className="gap-4 px-4 py-4">
          <View className="flex-row items-start gap-3">
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: isLocked
                  ? withOpacity(theme.accent, 0.14)
                  : withOpacity(theme.primary, 0.12),
              }}
            >
              {isLocked ? (
                <LockKeyhole size={18} color={tone} />
              ) : (
                <FolderOpen size={18} color={tone} />
              )}
            </View>

            <View className="flex-1 gap-1.5">
              <View className="flex-row items-start justify-between gap-3">
                <Text
                  className="flex-1 text-[15px] font-black leading-[21px] text-foreground"
                  numberOfLines={2}
                >
                  {subject.name}
                </Text>
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{ backgroundColor: badgeBg }}
                >
                  <Text
                    className="text-[10px] font-black uppercase tracking-[0.7px]"
                    style={{ color: badgeText }}
                  >
                    {isLocked ? "Premium" : "Open"}
                  </Text>
                </View>
              </View>

              <Text className="text-[12px] text-muted-foreground">
                {subject.materialCount} materials · {subject.topicCount} topics
              </Text>
            </View>
          </View>

          {/* <Text
            className="min-h-[44px] text-[13px] leading-[20px] text-muted-foreground"
            numberOfLines={2}
          >
            {description}
          </Text> */}

          <View
            className="flex-row rounded-2xl px-3 py-1.5"
            style={{ backgroundColor: theme.muted }}
          >
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-muted-foreground">
                Free
              </Text>
              <Text className="text-[13px] font-black text-foreground">
                {subject.freeMaterialCount}
              </Text>
            </View>

            <View className="flex-1 items-end">
              <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-muted-foreground">
                Premium
              </Text>
              <Text
                className="text-[13px] font-black"
                style={{
                  color: subject.hasPremiumContent
                    ? tone
                    : theme.mutedForeground,
                }}
              >
                {subject.premiumMaterialCount}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <MotionPressable
              className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-3"
              style={{ backgroundColor: primaryCtaBg }}
              onPress={() => onPrimaryAction(subject)}
            >
              {isLocked ? (
                <LockKeyhole size={15} color={theme.secondaryForeground} />
              ) : (
                <ArrowRight size={15} color={primaryCtaText} />
              )}
              <Text
                className="text-[13px] font-black"
                style={{ color: primaryCtaText }}
              >
                {isLocked ? "Unlock" : "Start Quiz"}
              </Text>
            </MotionPressable>

            <MotionPressable
              className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-3"
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.background,
              }}
              onPress={() => onSecondaryAction(subject)}
            >
              <BookOpenText size={15} color={theme.primary} />
              <Text
                className="text-[13px] font-bold"
                style={{ color: theme.primary }}
              >
                View Topics
              </Text>
            </MotionPressable>
          </View>
        </CardContent>
      </Card>
    </View>
  )
})

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

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

export default function ReviewerHomeScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light
  const user = useAuth((state) => state.user)
  const profile = useAuth((state) => state.profile)
  const isAuthenticated = useAuth((state) => state.isAuthenticated)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  const isPremiumUser = profile?.isPremium === true

  const firstName = (profile?.fullName ?? user?.name ?? "Reviewer").split(
    " "
  )[0]

  const activityOverviewQuery = useQuery({
    queryKey: ["home-activity-overview", user?.$id],
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
  const trackingMetrics = useMemo(() => {
    const weeklyMetric = PERFORMANCE_METRICS.find(
      (metric) => metric.window === "week"
    )
    const trackingSnapshot = buildTrackingSnapshot(
      activityFeed?.quizAttempts ?? [],
      activityFeed?.learningHistory ?? []
    )
    const hasActivityData = Boolean(
      activityFeed?.quizAttempts || activityFeed?.learningHistory
    )
    const effectiveDayStreak =
      activityFeed?.dayStreak ?? DAILY_TRACKER.streakDays
    const effectiveWeeklyAverage = Math.round(
      activityFeed?.weeklyAverageScore ?? weeklyMetric?.averageScore ?? 0
    )
    const effectiveDailyTrackingCount = hasActivityData
      ? trackingSnapshot.dailyCount
      : DAILY_TRACKER.completedSessions
    const effectiveWeeklyActiveDays = hasActivityData
      ? trackingSnapshot.weeklyActiveDays
      : Math.min(DAILY_TRACKER.streakDays, 7)
    const dailyTrackingProgress = Math.min(
      100,
      Math.round((effectiveDailyTrackingCount / DAILY_ACTIVITY_TARGET) * 100)
    )
    const weeklyTrackingProgress = Math.min(
      100,
      Math.round((effectiveWeeklyActiveDays / 7) * 100)
    )

    return {
      trackingSnapshot,
      effectiveDayStreak,
      effectiveWeeklyAverage,
      effectiveDailyTrackingCount,
      effectiveWeeklyActiveDays,
      dailyTrackingProgress,
      weeklyTrackingProgress,
    }
  }, [
    activityFeed?.dayStreak,
    activityFeed?.learningHistory,
    activityFeed?.quizAttempts,
    activityFeed?.weeklyAverageScore,
  ])

  const {
    trackingSnapshot,
    effectiveDayStreak,
    effectiveWeeklyAverage,
    effectiveDailyTrackingCount,
    effectiveWeeklyActiveDays,
    dailyTrackingProgress,
    weeklyTrackingProgress,
  } = trackingMetrics

  const headerStats = useMemo(
    () => [
      { label: "Streak", value: `${effectiveDayStreak} days` },
      {
        label: "Weekly Avg",
        value: `${effectiveWeeklyAverage}% score`,
      },
      { label: "Daily", value: `${effectiveDailyTrackingCount} activities` },
    ],
    [effectiveDailyTrackingCount, effectiveDayStreak, effectiveWeeklyAverage]
  )
  const quickAccessItems = useMemo(
    () => [
      {
        icon: <BookOpenText size={20} color={theme.primary} />,
        label: "Review Content",
        sub: "Open concise topic-based materials",
        path: "/learn",
        tone: theme.primary,
      },
      {
        icon: <ChartColumnIncreasing size={20} color={theme.chart2} />,
        label: "Dashboard",
        sub: "Track momentum and weaker areas",
        path: "/dashboard",
        tone: theme.chart2,
      },
      {
        icon: <MessagesSquare size={20} color={theme.chart5} />,
        label: "Community",
        sub: "Ask, reply, and learn with peers",
        path: "/community",
        tone: theme.chart5,
      },
      {
        icon: <Newspaper size={20} color={theme.accent} />,
        label: "Latest News",
        sub: "Catch fresh releases and updates",
        path: "/news",
        tone: theme.accent,
      },
    ],
    [theme.accent, theme.chart2, theme.chart5, theme.primary]
  )

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const subjectsQuery = useQuery({
    queryKey: ["home-review-subjects", isPremiumUser],
    queryFn: () => listLearningSubjects({ viewerIsPremium: isPremiumUser }),
  })

  const reviewSubjects = subjectsQuery.data ?? []

  const navigateToCategoryMode = useCallback(
    (categoryId: string) =>
      router.push({ pathname: "/mode", params: { categoryId } }),
    [router]
  )
  const navigateToPremium = useCallback(
    (source: "subject" | "quiz-category", title: string, categoryId: string) =>
      router.push({
        pathname: "/premium",
        params: {
          source,
          title,
          categoryId,
        },
      }),
    [router]
  )
  const navigateToCategoryTopics = useCallback(
    (categoryId: string) =>
      router.push({ pathname: "/review/[categoryId]", params: { categoryId } }),
    [router]
  )

  const handleSubjectPrimaryAction = useCallback(
    (subject: LearningSubject) => {
      if (subject.isLocked) {
        navigateToPremium("quiz-category", subject.name, subject.id)
        return
      }

      navigateToCategoryMode(subject.id)
    },
    [navigateToCategoryMode, navigateToPremium]
  )

  const handleSubjectSecondaryAction = useCallback(
    (subject: LearningSubject) => {
      if (subject.isLocked) {
        navigateToPremium("subject", subject.name, subject.id)
        return
      }

      navigateToCategoryTopics(subject.id)
    },
    [navigateToCategoryTopics, navigateToPremium]
  )

  const renderSubjectCard = useCallback(
    ({ item: subject }: ListRenderItemInfo<LearningSubject>) => {
      return (
        <HomeSubjectCard
          subject={subject}
          theme={theme}
          onPrimaryAction={handleSubjectPrimaryAction}
          onSecondaryAction={handleSubjectSecondaryAction}
        />
      )
    },
    [handleSubjectPrimaryAction, handleSubjectSecondaryAction, theme]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-5 px-4 pb-12 pt-4"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <FadeInView delay={getStaggerDelay(0)}>
          <AppShellHeader
            eyebrow="Daily Review System"
            title={
              <>
                {getGreeting()},{"\n"}
                {firstName}
              </>
            }
            subtitle="Quick drills, progress snapshots, and faster access to the parts of Reviewer you use most."
            avatarLabel={firstName.slice(0, 2).toUpperCase()}
            badgeLabel="Today"
            badgeValue={`${effectiveDailyTrackingCount}/${DAILY_ACTIVITY_TARGET} activities`}
            stats={headerStats}
          />
        </FadeInView>

        <FadeInView delay={getStaggerDelay(1)}>
          <View className="gap-2.5">
            <View className="gap-1">
              <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
                Jump Back In
              </Text>
              <Text className="text-[18px] font-extrabold text-foreground">
                Quick Access
              </Text>
              <Text className="text-[13px] leading-5 text-muted-foreground">
                Shortcuts to the parts of the app you are most likely to revisit
                today.
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2.5 pr-4"
              decelerationRate="fast"
            >
              {quickAccessItems.map((item) => (
                <MotionPressable
                  key={item.label}
                  className="w-[180px]"
                  onPress={() => router.push(item.path as never)}
                >
                  <Card style={{ borderWidth: 1, borderColor: theme.border }}>
                    <CardContent className="gap-2.5 px-3.5 py-3.5">
                      <View className="flex-row items-center justify-between">
                        <View
                          className="h-9 w-9 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: withOpacity(item.tone, 0.12),
                          }}
                        >
                          {item.icon}
                        </View>
                        <ArrowRight size={14} color={theme.mutedForeground} />
                      </View>
                      <View className="gap-0.5">
                        <Text className="text-[14px] font-bold text-foreground">
                          {item.label}
                        </Text>
                        <Text className="text-[11px] leading-4 text-muted-foreground">
                          {item.sub}
                        </Text>
                      </View>
                    </CardContent>
                  </Card>
                </MotionPressable>
              ))}
            </ScrollView>
          </View>
        </FadeInView>

        <FadeInView delay={getStaggerDelay(2)}>
          <View className="gap-2.5">
            <View className="gap-0.5">
              <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
                Tracking Pulse
              </Text>
              <Text className="text-[17px] font-extrabold text-foreground">
                Daily And Weekly Tracking
              </Text>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                Real streak, weekly average, and activity momentum from your
                Appwrite progress data.
              </Text>
            </View>

            {!user ? (
              <Card>
                <CardContent className="gap-1.5 px-4 py-3.5">
                  <Text className="text-[13px] font-bold text-card-foreground">
                    Sign in to track progress
                  </Text>
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    Streak, weekly average, and daily tracking are shown for
                    signed-in learners.
                  </Text>
                </CardContent>
              </Card>
            ) : activityOverviewQuery.isLoading ? (
              <View className="gap-2.5">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </View>
            ) : activityOverviewQuery.error ? (
              <Card>
                <CardContent className="gap-1.5 px-4 py-3.5">
                  <Text className="text-[13px] font-bold text-card-foreground">
                    Tracking unavailable
                  </Text>
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    {activityOverviewQuery.error instanceof Error
                      ? activityOverviewQuery.error.message
                      : "Unable to load tracking metrics right now."}
                  </Text>
                </CardContent>
              </Card>
            ) : (
              <>
                <View className="flex-row gap-2.5">
                  <Card
                    className="flex-1"
                    style={{ borderWidth: 1, borderColor: theme.border }}
                  >
                    <CardContent className="gap-1.5 px-3.5 py-3">
                      <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-primary">
                        Daily Tracking
                      </Text>
                      <Text className="text-[19px] font-black text-card-foreground">
                        {effectiveDailyTrackingCount}
                      </Text>
                      <Text className="text-[11px] text-muted-foreground">
                        activities today
                      </Text>
                    </CardContent>
                  </Card>

                  <Card
                    className="flex-1"
                    style={{ borderWidth: 1, borderColor: theme.border }}
                  >
                    <CardContent className="gap-1.5 px-3.5 py-3">
                      <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-primary">
                        Weekly Tracking
                      </Text>
                      <Text className="text-[19px] font-black text-card-foreground">
                        {effectiveWeeklyActiveDays}/7
                      </Text>
                      <Text className="text-[11px] text-muted-foreground">
                        active days
                      </Text>
                    </CardContent>
                  </Card>
                </View>

                <Card style={{ borderWidth: 1, borderColor: theme.border }}>
                  <CardContent className="gap-3 px-4 py-3.5">
                    <View className="gap-1.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          Daily Goal Progress
                        </Text>
                        <Text className="text-[11px] font-black text-primary">
                          {effectiveDailyTrackingCount}/{DAILY_ACTIVITY_TARGET}
                        </Text>
                      </View>
                      <View
                        className="h-2 overflow-hidden rounded-full"
                        style={{
                          backgroundColor: withOpacity(theme.primary, 0.14),
                        }}
                      >
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${dailyTrackingProgress}%`,
                            backgroundColor: theme.primary,
                          }}
                        />
                      </View>
                    </View>

                    <View className="gap-1.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          Weekly Consistency
                        </Text>
                        <Text className="text-[11px] font-black text-primary">
                          {effectiveWeeklyActiveDays}/7 days
                        </Text>
                      </View>
                      <View
                        className="h-2 overflow-hidden rounded-full"
                        style={{
                          backgroundColor: withOpacity(theme.accent, 0.16),
                        }}
                      >
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${weeklyTrackingProgress}%`,
                            backgroundColor: theme.accent,
                          }}
                        />
                      </View>
                      <Text className="text-[11px] leading-5 text-muted-foreground">
                        {trackingSnapshot.weeklyTotalActivities} total learning
                        activities in the last 7 days.
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              </>
            )}
          </View>
        </FadeInView>

        <FadeInView delay={getStaggerDelay(3)}>
          <View className="gap-2.5">
            <View className="gap-0.5">
              <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
                Practice Areas
              </Text>
              <Text className="text-[17px] font-extrabold text-foreground">
                Quiz Categories
              </Text>
            </View>

            {subjectsQuery.isLoading ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 16 }}
              >
                {Array.from({ length: 3 }).map((_, index) => (
                  <View key={`subject-skeleton-${index}`} className="w-[300px]">
                    <Card>
                      <CardContent className="gap-3 px-4 py-4">
                        <View className="flex-row items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-2xl" />
                          <View className="flex-1 gap-1.5">
                            <Skeleton className="h-4 w-36 rounded-lg" />
                            <Skeleton className="h-3 w-24 rounded-lg" />
                          </View>
                        </View>
                        <Skeleton className="h-8 rounded-xl" />
                        <View className="flex-row gap-2">
                          <Skeleton className="h-10 flex-1 rounded-2xl" />
                          <Skeleton className="h-10 w-12 rounded-2xl" />
                        </View>
                      </CardContent>
                    </Card>
                  </View>
                ))}
              </ScrollView>
            ) : subjectsQuery.error ? (
              <Card className="rounded-[28px]">
                <CardContent className="gap-2 px-4 py-4">
                  <Text className="text-sm font-black text-destructive">
                    Review subjects unavailable
                  </Text>
                  <Text className="text-[13px] leading-5 text-muted-foreground">
                    {subjectsQuery.error instanceof Error
                      ? subjectsQuery.error.message
                      : "Unable to load review subjects from Appwrite."}
                  </Text>
                </CardContent>
              </Card>
            ) : (
              <FlashList
                data={reviewSubjects}
                estimatedItemSize={200}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
                keyExtractor={(item) => item.id}
                decelerationRate="fast"
                renderItem={renderSubjectCard}
                ItemSeparatorComponent={SubjectCardSeparator}
                ListEmptyComponent={
                  <Card className="w-[300px]">
                    <CardContent className="gap-2 px-4 py-4">
                      <Text className="text-sm font-black text-card-foreground">
                        No review subjects yet
                      </Text>
                      <Text className="text-[13px] leading-5 text-muted-foreground">
                        Add Appwrite subject and topic records to populate this
                        section.
                      </Text>
                    </CardContent>
                  </Card>
                }
              />
            )}
          </View>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  )
}
