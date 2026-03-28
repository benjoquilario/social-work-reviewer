import { memo, useCallback, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  DAILY_TRACKER,
  FULL_EXAM_PRESETS,
  PERFORMANCE_METRICS,
} from "@/data/reviewer-data"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import {
  ArrowRight,
  BookOpenText,
  ChartColumnIncreasing,
  Clock3,
  Flame,
  FolderOpen,
  LockKeyhole,
  MessagesSquare,
  Newspaper,
  Rocket,
  Target,
  Zap,
} from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  listLearningSubjects,
  type LearningSubject,
} from "@/lib/learning-content"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

const SubjectCardSeparator = memo(function SubjectCardSeparator() {
  return <View className="w-3" />
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
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const { user, profile, isAuthenticated, refreshProfile } = useAuth()
  const isPremiumUser = profile?.isPremium === true

  const firstName = (profile?.fullName ?? user?.name ?? "Reviewer").split(
    " "
  )[0]
  const weeklyMetric = useMemo(
    () => PERFORMANCE_METRICS.find((m) => m.window === "week"),
    []
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
  const navigateToCategoryTopics = useCallback(
    (categoryId: string) =>
      router.push({ pathname: "/review/[categoryId]", params: { categoryId } }),
    [router]
  )

  const renderSubjectCard = useCallback(
    ({ item: subject }: ListRenderItemInfo<LearningSubject>) => {
      const isLocked = subject.isLocked

      return (
        <View className="w-[260px] overflow-hidden rounded-3xl">
          <Card className="rounded-3xl">
            <CardContent className="gap-2.5 px-4 py-2">
              <View className="flex-row items-start gap-3">
                <View
                  className="h-10 w-10 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: withOpacity(theme.primary, 0.15),
                  }}
                >
                  {isLocked ? (
                    <LockKeyhole size={20} color={theme.primary} />
                  ) : (
                    <FolderOpen size={20} color={theme.primary} />
                  )}
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="line-clamp-3 text-sm font-extrabold leading-5 text-card-foreground">
                    {subject.name}
                  </Text>
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    {subject.materialCount} materials · {subject.topicCount}{" "}
                    topics
                  </Text>
                </View>
              </View>
              {!isPremiumUser && subject.hasPremiumContent ? (
                <View className="self-start rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    {subject.freeMaterialCount} free ·{" "}
                    {subject.premiumMaterialCount} premium
                  </Text>
                </View>
              ) : null}
              <Text className="text-[13px] leading-5 text-muted-foreground">
                {isLocked
                  ? "This subject is fully premium and locked for free users."
                  : subject.description || "No subject description added yet."}
              </Text>
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {isLocked ? "Premium locked" : "Timed quiz from Appwrite"}
              </Text>
              <View className="mt-1 flex-row gap-2">
                <Pressable
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl py-3"
                  disabled={isLocked}
                  style={{
                    backgroundColor: isLocked ? theme.muted : theme.primary,
                    opacity: isLocked ? 0.6 : 1,
                  }}
                  onPress={() => navigateToCategoryMode(subject.id)}
                >
                  <Text
                    className="text-[10px] font-black uppercase tracking-wide"
                    style={{
                      color: isLocked
                        ? theme.mutedForeground
                        : theme.primaryForeground,
                    }}
                  >
                    {isLocked ? "Locked" : "Timed Quiz"}
                  </Text>
                  <ArrowRight
                    size={13}
                    color={
                      isLocked ? theme.mutedForeground : theme.primaryForeground
                    }
                  />
                </Pressable>
                <Pressable
                  className="flex-1 items-center justify-center rounded-2xl border py-3"
                  disabled={isLocked}
                  style={{
                    borderColor: theme.border,
                    opacity: isLocked ? 0.6 : 1,
                  }}
                  onPress={() => navigateToCategoryTopics(subject.id)}
                >
                  <Text className="text-[10px] font-black uppercase tracking-wide text-card-foreground">
                    Topics
                  </Text>
                </Pressable>
              </View>
            </CardContent>
          </Card>
        </View>
      )
    },
    [isPremiumUser, navigateToCategoryMode, navigateToCategoryTopics, theme]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-5 px-4 pb-28 pt-5"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting Header ───────────────────────────────────────────── */}
        <View className="gap-1">
          <Text className="text-[11px] font-black uppercase tracking-[1.8px] text-primary">
            Daily Review System
          </Text>
          <Text className="text-[24px] font-black leading-tight text-foreground">
            {getGreeting()},{"\n"}
            {firstName} 👋
          </Text>
          <Text className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
            Keep your streak going — one session at a time.
          </Text>
        </View>

        {/* ── Streak + Score strip ──────────────────────────────────────── */}
        <View className="flex-row gap-2.5">
          <Card className="flex-1 rounded-3xl">
            <CardContent
              className="gap-1 px-3 py-2"
              style={{ backgroundColor: "hsl(38 92% 58% / 0.12)" }}
            >
              <View className="flex-row items-center gap-1.5">
                <Flame size={14} color={theme.accent} />
                <Text
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: theme.accent }}
                >
                  Streak
                </Text>
              </View>
              <Text className="text-2xl font-black text-foreground">
                {DAILY_TRACKER.streakDays}
              </Text>
              <Text className="text-[11px] text-muted-foreground">days</Text>
            </CardContent>
          </Card>

          <Card className="flex-1 rounded-3xl">
            <CardContent
              className="gap-1 px-3 py-2"
              style={{ backgroundColor: withOpacity(theme.primary, 0.14) }}
            >
              <View className="flex-row items-center gap-1.5">
                <Clock3 size={14} color={theme.primary} />
                <Text className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Today
                </Text>
              </View>
              <Text className="text-2xl font-black text-foreground">
                {DAILY_TRACKER.completedSessions}
                <Text className="text-base font-bold text-muted-foreground">
                  /{DAILY_TRACKER.targetSessions}
                </Text>
              </Text>
              <Text className="text-[11px] text-muted-foreground">
                sessions
              </Text>
            </CardContent>
          </Card>

          <Card className="flex-1 rounded-3xl">
            <CardContent
              className="gap-1 px-3 py-2"
              style={{ backgroundColor: withOpacity(theme.primary, 0.08) }}
            >
              <View className="flex-row items-center gap-1.5">
                <Target size={14} color={theme.primary} />
                <Text className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Avg
                </Text>
              </View>
              <Text className="text-2xl font-black text-foreground">
                {weeklyMetric?.averageScore ?? 0}
                <Text className="text-base font-bold text-muted-foreground">
                  %
                </Text>
              </Text>
              <Text className="text-[11px] text-muted-foreground">weekly</Text>
            </CardContent>
          </Card>
        </View>

        {/* ── Quick Access (horizontal scroll) ─────────────────────────── */}
        <View className="gap-2.5">
          <Text className="text-base font-extrabold text-foreground">
            Quick Access
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2.5 pr-4"
            decelerationRate="fast"
          >
            {[
              {
                icon: <BookOpenText size={20} color={theme.primary} />,
                label: "Review Content",
                sub: "Numbered review sections",
                path: "/learn",
              },
              {
                icon: <ChartColumnIncreasing size={20} color={theme.primary} />,
                label: "Dashboard",
                sub: "Progress and weak areas",
                path: "/dashboard",
              },
              {
                icon: <MessagesSquare size={20} color={theme.primary} />,
                label: "Community",
                sub: "Learn with peers",
                path: "/community",
              },
              {
                icon: <Newspaper size={20} color={theme.primary} />,
                label: "Latest News",
                sub: "New materials",
                path: "/news",
              },
            ].map((item) => (
              <Pressable
                key={item.label}
                className="w-[190px] rounded-3xl"
                onPress={() => router.push(item.path as never)}
              >
                <Card className="rounded-3xl">
                  <CardContent className="gap-2 px-4 py-2">
                    <View
                      className="h-10 w-10 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: withOpacity(theme.primary, 0.15),
                      }}
                    >
                      {item.icon}
                    </View>
                    <Text className="text-sm font-bold text-card-foreground">
                      {item.label}
                    </Text>
                    <Text className="text-[12px] leading-4 text-muted-foreground">
                      {item.sub}
                    </Text>
                  </CardContent>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── Full Exam Simulation ──────────────────────────────────────── */}
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-foreground">
              Full Exam Simulation
            </Text>
            <View
              className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
              style={{ backgroundColor: withOpacity(theme.accent, 0.2) }}
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
            <Pressable
              key={exam.id}
              className="overflow-hidden rounded-3xl"
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
              <Card className="rounded-3xl">
                <CardContent className="gap-2.5 px-4 py-2">
                  <View className="flex-row items-start gap-3">
                    <View
                      className="h-10 w-10 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: withOpacity(theme.primary, 0.15),
                      }}
                    >
                      <Rocket size={20} color={theme.primary} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-extrabold leading-6 text-card-foreground">
                        {exam.title}
                      </Text>
                      <Text className="text-[13px] leading-5 text-muted-foreground">
                        {exam.description}
                      </Text>
                    </View>
                    <ArrowRight size={16} color={theme.mutedForeground} />
                  </View>
                  <View className="flex-row gap-2">
                    <View
                      className="rounded-full px-3 py-1"
                      style={{
                        backgroundColor: withOpacity(theme.primary, 0.15),
                      }}
                    >
                      <Text className="text-[11px] font-black uppercase tracking-wide text-primary">
                        {exam.totalQuestions} items
                      </Text>
                    </View>
                    <View
                      className="rounded-full px-3 py-1"
                      style={{
                        backgroundColor: withOpacity(theme.accent, 0.2),
                      }}
                    >
                      <Text
                        className="text-[11px] font-black uppercase tracking-wide"
                        style={{ color: theme.accent }}
                      >
                        {exam.minutes} min
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* ── Quiz Categories (horizontal scroll) ───────────────────────── */}
        <View className="gap-2.5">
          <Text className="text-[17px] font-extrabold text-foreground">
            Quiz Categories
          </Text>
          {subjectsQuery.isLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 16 }}
            >
              {Array.from({ length: 3 }).map((_, index) => (
                <View
                  key={`subject-skeleton-${index}`}
                  className="w-[260px] overflow-hidden rounded-3xl"
                >
                  <Card className="rounded-3xl">
                    <CardContent className="gap-3 px-4 py-4">
                      <Skeleton className="h-10 w-10 rounded-2xl" />
                      <Skeleton className="h-5 w-40 rounded-lg" />
                      <Skeleton className="h-4 w-24 rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <View className="flex-row gap-2">
                        <Skeleton className="h-11 flex-1 rounded-2xl" />
                        <Skeleton className="h-11 flex-1 rounded-2xl" />
                      </View>
                    </CardContent>
                  </Card>
                </View>
              ))}
            </ScrollView>
          ) : subjectsQuery.error ? (
            <Card className="rounded-3xl">
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
                <Card className="rounded-3xl">
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
      </ScrollView>
    </SafeAreaView>
  )
}
