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
  const description = isLocked
    ? "Premium-only. Unlock to access drills and all topic material."
    : subject.description || "No description added yet."

  return (
    <View className="w-[240px]">
      <Card>
        <CardContent className="gap-3 px-4 py-4">
          {/* Header row */}
          <View className="flex-row items-center gap-3">
            <View
              className="h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: withOpacity(tone, 0.12) }}
            >
              {isLocked ? (
                <LockKeyhole size={18} color={tone} />
              ) : (
                <FolderOpen size={18} color={tone} />
              )}
            </View>
            <View className="flex-1">
              <Text
                className="text-[14px] font-black leading-[18px] text-foreground"
                numberOfLines={2}
              >
                {subject.name}
              </Text>
              <Text className="text-[11px] text-muted-foreground">
                {subject.materialCount} materials · {subject.topicCount} topics
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text
            className="text-[12px] leading-[18px] text-muted-foreground"
            numberOfLines={2}
          >
            {description}
          </Text>

          {/* Actions */}
          <View className="flex-row gap-1.5">
            <MotionPressable
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5"
              style={{
                backgroundColor: isLocked ? withOpacity(tone, 0.1) : tone,
              }}
              onPress={() => onPrimaryAction(subject)}
            >
              {isLocked ? (
                <LockKeyhole size={13} color={tone} />
              ) : (
                <ArrowRight size={13} color={theme.primaryForeground} />
              )}
              <Text
                className="text-[12px] font-black"
                style={{ color: isLocked ? tone : theme.primaryForeground }}
              >
                {isLocked ? "Unlock" : "Quiz"}
              </Text>
            </MotionPressable>

            <MotionPressable
              className="flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5"
              style={{
                borderWidth: 1,
                borderColor: withOpacity(theme.mutedForeground, 0.25),
              }}
              onPress={() => onSecondaryAction(subject)}
            >
              <BookOpenText size={13} color={theme.mutedForeground} />
              <Text className="text-[12px] font-semibold text-muted-foreground">
                Topics
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
  const weeklyMetric = useMemo(
    () => PERFORMANCE_METRICS.find((metric) => metric.window === "week"),
    []
  )
  const headerStats = useMemo(
    () => [
      { label: "Streak", value: `${DAILY_TRACKER.streakDays} days` },
      {
        label: "Weekly Avg",
        value: `${weeklyMetric?.averageScore ?? 0}% score`,
      },
      { label: "Focus", value: DAILY_TRACKER.focusLabel },
    ],
    [weeklyMetric?.averageScore]
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
        contentContainerClassName="gap-5 px-4 pb-32 pt-4"
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
            badgeValue={`${DAILY_TRACKER.completedSessions}/${DAILY_TRACKER.targetSessions} sessions`}
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
                  <Card>
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

        {/* <FadeInView delay={getStaggerDelay(2)}>
          <View className="gap-2.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-foreground">
                Full Exam Simulation
              </Text>
              <View
                className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
                style={{ backgroundColor: withOpacity(theme.accent, 0.18) }}
              >
                <Zap size={11} color={theme.accent} />
                <Text
                  className="text-[10px] font-black uppercase tracking-wide"
                  style={{ color: theme.accent }}
                >
                  Board Prep
                </Text>
              </View>
            </View>

            {FULL_EXAM_PRESETS.map((exam) => (
              <MotionPressable
                key={exam.id}
                onPress={() =>
                  router.push({
                    pathname: "/quiz",
                    params: {
                      categoryId: "all-categories",
                      totalQuestions: String(exam.totalQuestions),
                      minutes: String(exam.minutes),
                      examId: exam.id,
                    },
                  })
                }
              >
                <Card>
                  <CardContent className="gap-2 px-4 py-3.5">
                    <View className="flex-row items-start gap-3">
                      <View
                        className="h-10 w-10 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: withOpacity(theme.primary, 0.1),
                        }}
                      >
                        <Rocket size={18} color={theme.primary} />
                      </View>
                      <View className="flex-1 gap-0.5">
                        <Text className="text-[15px] font-bold leading-5 text-foreground">
                          {exam.title}
                        </Text>
                        <Text className="text-[12px] leading-[18px] text-muted-foreground">
                          {exam.description}
                        </Text>
                      </View>
                      <ArrowRight size={16} color={theme.mutedForeground} />
                    </View>
                    <View className="flex-row gap-2 pl-[52px]">
                      <Text className="text-[11px] font-bold uppercase tracking-wide text-primary">
                        {exam.totalQuestions} items
                      </Text>
                      <Text
                        className="text-[11px] font-bold uppercase tracking-wide"
                        style={{ color: theme.accent }}
                      >
                        {exam.minutes} min
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              </MotionPressable>
            ))}
          </View>
        </FadeInView> */}

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
                  <View key={`subject-skeleton-${index}`} className="w-[240px]">
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
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
                keyExtractor={(item) => item.id}
                decelerationRate="fast"
                renderItem={renderSubjectCard}
                ItemSeparatorComponent={SubjectCardSeparator}
                ListEmptyComponent={
                  <Card className="w-[240px]">
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
