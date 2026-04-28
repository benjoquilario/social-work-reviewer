import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DAILY_TRACKER, PERFORMANCE_METRICS } from "@/data/reviewer-data"
import {
  FlashList,
  type ListRenderItem,
  type ListRenderItemInfo,
} from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import {
  ArrowRight,
  BellRing,
  BookOpenText,
  ChartColumnIncreasing,
  Clock3,
  FolderOpen,
  ListChecks,
  LockKeyhole,
  MessagesSquare,
  Newspaper,
  Play,
  Search,
} from "lucide-react-native"
import { Pressable, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getInitials } from "@/lib/auth"
import { getBoardExamSetById } from "@/lib/board-exams"
import {
  listLearningSubjects,
  type LearningSubject,
} from "@/lib/learning-content"
import { getStaggerDelay } from "@/lib/motion"
import {
  cancelDailyStudyReminders,
  getNotificationPermissionStatus,
  hasScheduledStudyReminder,
  requestNotificationPermissions,
  scheduleDailyStudyReminder,
} from "@/lib/notifications"
import {
  getUserActivityFeed,
  listUserResumableAttempts,
  type ActivityLearningHistory,
  type ActivityQuizAttempt,
  type UserActivityFeed,
} from "@/lib/progress"
import { getQuizExamDetail } from "@/lib/quiz-content"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { FadeInView, MotionPressable } from "@/components/ui/motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { CommunityAvatar } from "@/components/community/avatar"

const SubjectCardSeparator = memo(function SubjectCardSeparator() {
  return <View className="w-2.5" />
})

const DAILY_ACTIVITY_TARGET = 4

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

type TrackingSnapshot = {
  dailyCount: number
  weeklyActiveDays: number
  weeklyTotalActivities: number
}

type TrackingMetrics = {
  trackingSnapshot: TrackingSnapshot
  effectiveDayStreak: number
  effectiveWeeklyAverage: number
  effectiveDailyTrackingCount: number
  effectiveWeeklyActiveDays: number
  dailyTrackingProgress: number
  weeklyTrackingProgress: number
}

type ResumeAttemptCard = {
  id: string
  title: string
  subtitle: string
  progressLabel: string
  updatedLabel: string
  onPressParams: { pathname: "/quiz"; params: Record<string, string> } | null
}

function formatDurationCompact(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safeSeconds / 60)

  if (minutes <= 0) {
    return `${safeSeconds}s`
  }

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

function formatRelativeDateLabel(value: string | null) {
  if (!value) {
    return "Recently updated"
  }

  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) {
    return "Recently updated"
  }

  const deltaMinutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000)
  if (deltaMinutes < 1) return "Just now"
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`

  const deltaHours = Math.floor(deltaMinutes / 60)
  if (deltaHours < 24) return `${deltaHours}h ago`

  const deltaDays = Math.floor(deltaHours / 24)
  return `${deltaDays}d ago`
}

function parseBoardExamAttemptExamId(examId: string) {
  if (!examId.startsWith("board-exam:")) {
    return null
  }

  const [, setId = "", totalQuestions = "", minutes = ""] = examId.split(":")
  if (!setId || !totalQuestions || !minutes) {
    return null
  }

  return {
    setId,
    totalQuestions,
    minutes,
  }
}

function getSubjectCardPresentation(theme: ThemePalette, isLocked: boolean) {
  const tone = isLocked ? theme.accent : theme.primary
  const primaryCtaText = isLocked
    ? theme.secondaryForeground
    : theme.primaryForeground

  return {
    tone,
    statusIconBg: isLocked
      ? withOpacity(theme.accent, 0.14)
      : withOpacity(theme.primary, 0.12),
    statusIcon: isLocked ? LockKeyhole : FolderOpen,
    badgeBg: isLocked ? withOpacity(theme.accent, 0.14) : theme.secondary,
    badgeText: isLocked ? theme.accent : theme.secondaryForeground,
    statusLabel: isLocked ? "Premium" : "Open",
    primaryIcon: isLocked ? LockKeyhole : ArrowRight,
    primaryLabel: isLocked ? "Unlock" : "Start Quiz",
    primaryCtaBg: isLocked ? theme.secondary : tone,
    primaryCtaText,
  }
}

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
  const cardPresentation = getSubjectCardPresentation(theme, subject.isLocked)
  const StatusIcon = cardPresentation.statusIcon
  const PrimaryIcon = cardPresentation.primaryIcon
  const premiumCountColor = subject.hasPremiumContent
    ? cardPresentation.tone
    : theme.mutedForeground

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
              style={{ backgroundColor: cardPresentation.statusIconBg }}
            >
              <StatusIcon size={18} color={cardPresentation.tone} />
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
                  style={{ backgroundColor: cardPresentation.badgeBg }}
                >
                  <Text
                    className="text-[10px] font-black uppercase tracking-[0.7px]"
                    style={{ color: cardPresentation.badgeText }}
                  >
                    {cardPresentation.statusLabel}
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
                style={{ color: premiumCountColor }}
              >
                {subject.premiumMaterialCount}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <MotionPressable
              className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-3"
              style={{ backgroundColor: cardPresentation.primaryCtaBg }}
              onPress={() => onPrimaryAction(subject)}
            >
              <PrimaryIcon size={15} color={cardPresentation.primaryCtaText} />
              <Text
                className="text-[13px] font-black"
                style={{ color: cardPresentation.primaryCtaText }}
              >
                {cardPresentation.primaryLabel}
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

const ResumeAnsweringSection = memo(function ResumeAnsweringSection({
  items,
  isLoading,
  errorMessage,
  onPressItem,
  theme,
}: {
  items: ResumeAttemptCard[]
  isLoading: boolean
  errorMessage: string | null
  onPressItem: (item: ResumeAttemptCard) => void
  theme: ThemePalette
}) {
  if (isLoading) {
    return (
      <View className="gap-2.5">
        <View className="gap-0.5">
          <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
            Resume Answering
          </Text>
          <Text className="text-[17px] font-extrabold text-foreground">
            Continue your previous attempts
          </Text>
        </View>
        <Skeleton className="h-24 rounded-[26px]" />
      </View>
    )
  }

  if (errorMessage) {
    return (
      <View className="gap-2.5">
        <View className="gap-0.5">
          <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
            Resume Answering
          </Text>
          <Text className="text-[17px] font-extrabold text-foreground">
            Continue your previous attempts
          </Text>
        </View>
        <Card style={{ borderWidth: 1, borderColor: theme.border }}>
          <CardContent className="gap-1.5 px-4 py-4">
            <Text className="text-[13px] font-bold text-card-foreground">
              Resume data unavailable
            </Text>
            <Text className="text-[12px] leading-5 text-muted-foreground">
              {errorMessage}
            </Text>
          </CardContent>
        </Card>
      </View>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <View className="gap-2.5">
      <View className="gap-0.5">
        <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
          Resume Answering
        </Text>
        <Text className="text-[17px] font-extrabold text-foreground">
          Continue your previous attempts
        </Text>
        <Text className="text-[12px] leading-5 text-muted-foreground">
          Jump back into your ongoing board exam or quiz exactly where you left
          off.
        </Text>
      </View>

      <View className="gap-2.5">
        {items.map((item) => (
          <MotionPressable key={item.id} onPress={() => onPressItem(item)}>
            <Card
              className="rounded-[26px]"
              style={{ borderWidth: 1, borderColor: theme.border }}
            >
              <CardContent className="gap-3 px-4 py-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-[15px] font-black text-card-foreground">
                      {item.title}
                    </Text>
                    <Text className="text-[12px] leading-5 text-muted-foreground">
                      {item.subtitle}
                    </Text>
                  </View>
                  <View
                    className="h-11 w-11 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: withOpacity(theme.primary, 0.14),
                    }}
                  >
                    <Play size={16} color={theme.primary} />
                  </View>
                </View>

                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-row items-center gap-1.5">
                    <ListChecks size={13} color={theme.primary} />
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.9px] text-primary">
                      {item.progressLabel}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Clock3 size={13} color={theme.mutedForeground} />
                    <Text className="text-[11px] font-semibold text-muted-foreground">
                      {item.updatedLabel}
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </MotionPressable>
        ))}
      </View>
    </View>
  )
})

const TrackingPulseSection = memo(function TrackingPulseSection({
  theme,
  isSignedIn,
  isLoading,
  errorMessage,
  effectiveDailyTrackingCount,
  effectiveWeeklyActiveDays,
  dailyTrackingProgress,
  weeklyTrackingProgress,
  weeklyTotalActivities,
}: {
  theme: ThemePalette
  isSignedIn: boolean
  isLoading: boolean
  errorMessage: string | null
  effectiveDailyTrackingCount: number
  effectiveWeeklyActiveDays: number
  dailyTrackingProgress: number
  weeklyTrackingProgress: number
  weeklyTotalActivities: number
}) {
  return (
    <View className="gap-2.5">
      <View className="gap-0.5">
        <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
          Tracking Pulse
        </Text>
        <Text className="text-[17px] font-extrabold text-foreground">
          Daily And Weekly Tracking
        </Text>
        <Text className="text-[12px] leading-5 text-muted-foreground">
          Real streak, weekly average, and activity momentum from your Appwrite
          progress data.
        </Text>
      </View>

      {!isSignedIn ? (
        <Card>
          <CardContent className="gap-1.5 px-4 py-3.5">
            <Text className="text-[13px] font-bold text-card-foreground">
              Sign in to track progress
            </Text>
            <Text className="text-[12px] leading-5 text-muted-foreground">
              Streak, weekly average, and daily tracking are shown for signed-in
              learners.
            </Text>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <View className="gap-2.5">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </View>
      ) : errorMessage ? (
        <Card>
          <CardContent className="gap-1.5 px-4 py-3.5">
            <Text className="text-[13px] font-bold text-card-foreground">
              Tracking unavailable
            </Text>
            <Text className="text-[12px] leading-5 text-muted-foreground">
              {errorMessage}
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
                  {weeklyTotalActivities} total learning activities in the last
                  7 days.
                </Text>
              </View>
            </CardContent>
          </Card>
        </>
      )}
    </View>
  )
})

const PracticeAreasSection = memo(function PracticeAreasSection({
  theme,
  isLoading,
  errorMessage,
  reviewSubjects,
  renderSubjectCard,
}: {
  theme: ThemePalette
  isLoading: boolean
  errorMessage: string | null
  reviewSubjects: LearningSubject[]
  renderSubjectCard: ListRenderItem<LearningSubject>
}) {
  return (
    <View className="gap-2.5">
      <View className="gap-0.5">
        <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
          Practice Areas
        </Text>
        <Text className="text-[17px] font-extrabold text-foreground">
          Quiz Categories
        </Text>
      </View>

      {isLoading ? (
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
      ) : errorMessage ? (
        <Card className="rounded-[28px]">
          <CardContent className="gap-2 px-4 py-4">
            <Text className="text-sm font-black text-destructive">
              Review subjects unavailable
            </Text>
            <Text className="text-[13px] leading-5 text-muted-foreground">
              {errorMessage}
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
  )
})

const BoardExamsSection = memo(function BoardExamsSection({
  theme,
  onPress,
}: {
  theme: ThemePalette
  onPress: () => void
}) {
  return (
    <View className="gap-2.5">
      <View className="gap-0.5">
        <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
          Board Exams
        </Text>
        <Text className="text-[17px] font-extrabold text-foreground">
          Category To Set Review
        </Text>
      </View>

      <Card
        className="rounded-[26px]"
        style={{ borderWidth: 1, borderColor: theme.border }}
      >
        <CardContent className="gap-3.5 px-4 py-4">
          <View className="flex-row items-start gap-3">
            <View
              className="h-11 w-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: withOpacity(theme.primary, 0.14) }}
            >
              <ListChecks size={18} color={theme.primary} />
            </View>

            <View className="flex-1 gap-1">
              <Text className="text-[15px] font-black text-card-foreground">
                Build A Professional Board Exam Routine
              </Text>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                Open categories, choose Set A/B/C/D, select a mode, and answer
                each question in a timed flow.
              </Text>
            </View>
          </View>

          <MotionPressable
            className="h-11 flex-row items-center justify-center gap-2 rounded-2xl"
            style={{ backgroundColor: theme.primary }}
            onPress={onPress}
          >
            <ListChecks size={15} color={theme.primaryForeground} />
            <Text
              className="text-[13px] font-black"
              style={{ color: theme.primaryForeground }}
            >
              Open Board Exams
            </Text>
          </MotionPressable>
        </CardContent>
      </Card>
    </View>
  )
})

function matchesSearchQuery(value: string, query: string) {
  return value.toLowerCase().includes(query)
}

// function getGreeting() {
//   const hour = new Date().getHours()
//   if (hour < 12) return "Good morning"
//   if (hour < 17) return "Good afternoon"
//   return "Good evening"
// }

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

function parseDayKey(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return null
  }

  return toDayKey(timestamp)
}

function incrementDayActivityCount(
  activityCountByDay: Map<string, number>,
  dayKey: string
) {
  activityCountByDay.set(dayKey, (activityCountByDay.get(dayKey) ?? 0) + 1)
}

function collectActivityCounts<T>(
  items: T[],
  getTimestamp: (item: T) => string | null | undefined,
  activityCountByDay: Map<string, number>
) {
  for (const item of items) {
    const dayKey = parseDayKey(getTimestamp(item))
    if (!dayKey) {
      continue
    }

    incrementDayActivityCount(activityCountByDay, dayKey)
  }
}

function summarizeWeeklySnapshot(
  activityCountByDay: Map<string, number>,
  weeklyKeys: string[]
) {
  let weeklyActiveDays = 0
  let weeklyTotalActivities = 0

  for (const dayKey of weeklyKeys) {
    const count = activityCountByDay.get(dayKey) ?? 0
    weeklyTotalActivities += count

    if (count > 0) {
      weeklyActiveDays += 1
    }
  }

  return {
    weeklyActiveDays,
    weeklyTotalActivities,
  }
}

function buildTrackingSnapshot(
  attempts: ActivityQuizAttempt[],
  learningHistory: ActivityLearningHistory[]
): TrackingSnapshot {
  const activityCountByDay = new Map<string, number>()
  const todayKey = toDayKey(new Date())
  const weeklyKeys = buildRecentDayKeys(7)

  collectActivityCounts(
    attempts,
    (attempt) => attempt.finishedAt ?? attempt.startedAt,
    activityCountByDay
  )
  collectActivityCounts(
    learningHistory,
    (entry) => entry.lastAccessedAt,
    activityCountByDay
  )

  const { weeklyActiveDays, weeklyTotalActivities } = summarizeWeeklySnapshot(
    activityCountByDay,
    weeklyKeys
  )

  return {
    dailyCount: activityCountByDay.get(todayKey) ?? 0,
    weeklyActiveDays,
    weeklyTotalActivities,
  }
}

function buildTrackingMetrics(
  activityFeed: UserActivityFeed | null
): TrackingMetrics {
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
  const effectiveDayStreak = activityFeed?.dayStreak ?? DAILY_TRACKER.streakDays
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

  const [hasDailyReminder, setHasDailyReminder] = useState(false)
  const [isNotificationUpdating, setIsNotificationUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const displayName = profile?.fullName ?? user?.name ?? "Reviewer"
  const firstName = displayName.split(" ")[0]
  const initials = getInitials(displayName)
  const profileAvatarUrl = profile?.avatarUrl?.trim() || null
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const hasSearchQuery = normalizedSearchQuery.length > 0

  const activityOverviewQuery = useQuery({
    queryKey: ["home-activity-overview", user?.$id],
    enabled: Boolean(user?.$id),
    queryFn: () =>
      getUserActivityFeed(
        { userId: user?.$id ?? "" },
        {
          quizAttemptsLimit: 80,
          learningHistoryLimit: 80,
          achievementsLimit: 6,
        }
      ),
    staleTime: 1000 * 20,
  })
  const resumableAttemptsQuery = useQuery({
    queryKey: ["home-resumable-attempts", user?.$id, profile?.isPremium],
    enabled: Boolean(user?.$id),
    queryFn: async () => {
      const ongoingAttempts = (
        await listUserResumableAttempts({
          userId: user?.$id ?? "",
          limit: 4,
        })
      )
        .sort((left, right) => {
          const leftValue = left.lastAnsweredAt ?? left.startedAt
          const rightValue = right.lastAnsweredAt ?? right.startedAt
          return rightValue.localeCompare(leftValue)
        })
        .slice(0, 4)

      const enriched = await Promise.all(
        ongoingAttempts.map(async (attempt) => {
          const boardExamMeta = parseBoardExamAttemptExamId(attempt.examId)

          if (boardExamMeta) {
            const set = await getBoardExamSetById(boardExamMeta.setId, {
              viewerIsPremium: profile?.isPremium === true,
            }).catch(() => null)

            const params = set
              ? {
                  source: "board-exam",
                  categoryId: set.categoryId,
                  setId: boardExamMeta.setId,
                  totalQuestions: boardExamMeta.totalQuestions,
                  minutes: boardExamMeta.minutes,
                }
              : null

            return {
              attempt,
              title: set?.title ?? "Board Exam",
              subtitle: set
                ? `${set.setCode} • ${formatDurationCompact(attempt.timeTaken)} elapsed`
                : `${formatDurationCompact(attempt.timeTaken)} elapsed`,
              params: params
                ? {
                    pathname: "/quiz" as const,
                    params,
                  }
                : null,
            }
          }

          const exam = await getQuizExamDetail(attempt.examId, {
            viewerIsPremium: profile?.isPremium === true,
          }).catch(() => null)

          const params = exam
            ? {
                categoryId: exam.subjectId,
                examId: exam.id,
                totalQuestions: String(exam.availableQuestionCount),
                minutes: String(exam.timeLimit),
              }
            : null

          return {
            attempt,
            title: exam?.title ?? "Quiz Attempt",
            subtitle: exam
              ? `${exam.subjectName} • ${formatDurationCompact(attempt.timeTaken)} elapsed`
              : `${formatDurationCompact(attempt.timeTaken)} elapsed`,
            params: params
              ? {
                  pathname: "/quiz" as const,
                  params,
                }
              : null,
          }
        })
      )

      return enriched
        .filter((item) => item.params)
        .map<ResumeAttemptCard>((item) => ({
          id: item.attempt.$id,
          title: item.title,
          subtitle: item.subtitle,
          progressLabel: `Question ${Math.min(item.attempt.currentQuestionIndex + 1, Math.max(item.attempt.totalItems, 1))} of ${item.attempt.totalItems}`,
          updatedLabel: formatRelativeDateLabel(
            item.attempt.lastAnsweredAt ?? item.attempt.startedAt
          ),
          onPressParams: item.params,
        }))
    },
    staleTime: 1000 * 20,
  })

  const activityFeed = activityOverviewQuery.data ?? null
  const activityOverviewErrorMessage =
    activityOverviewQuery.error instanceof Error
      ? activityOverviewQuery.error.message
      : activityOverviewQuery.error
        ? "Unable to load tracking metrics right now."
        : null
  const trackingMetrics = useMemo(
    () => buildTrackingMetrics(activityFeed),
    [activityFeed]
  )
  const resumableAttemptItems = resumableAttemptsQuery.data ?? []
  const resumableAttemptsErrorMessage =
    resumableAttemptsQuery.error instanceof Error
      ? resumableAttemptsQuery.error.message
      : resumableAttemptsQuery.error
        ? "Unable to load resumable attempts right now."
        : null

  const {
    trackingSnapshot,
    // effectiveDayStreak,
    // effectiveWeeklyAverage,
    effectiveDailyTrackingCount,
    effectiveWeeklyActiveDays,
    dailyTrackingProgress,
    weeklyTrackingProgress,
  } = trackingMetrics

  const quickAccessItems = useMemo(
    () => [
      {
        icon: <BookOpenText size={20} color={theme.primary} />,
        label: "Review Content",
        sub: "Open concise topic-based materials",
        path: "/learn",
        tone: theme.primary,
        surface:
          colorScheme === "dark"
            ? withOpacity(theme.primary, 0.18)
            : "hsl(198 100% 94%)",
      },
      {
        icon: <ChartColumnIncreasing size={20} color={theme.chart2} />,
        label: "Dashboard",
        sub: "Track momentum and weaker areas",
        path: "/dashboard",
        tone: theme.chart2,
        surface:
          colorScheme === "dark"
            ? withOpacity(theme.chart2, 0.18)
            : "hsl(156 70% 93%)",
      },
      {
        icon: <MessagesSquare size={20} color={theme.chart5} />,
        label: "Community",
        sub: "Ask, reply, and learn with peers",
        path: "/community",
        tone: theme.chart5,
        surface:
          colorScheme === "dark"
            ? withOpacity(theme.chart5, 0.18)
            : "hsl(334 100% 94%)",
      },
      {
        icon: <ListChecks size={20} color={theme.chart3} />,
        label: "Board Exams",
        sub: "Select a set and enter timed mode",
        path: "/board-exams",
        tone: theme.chart3,
        surface:
          colorScheme === "dark"
            ? withOpacity(theme.chart3, 0.18)
            : "hsl(24 100% 92%)",
      },
      {
        icon: <Newspaper size={20} color={theme.chart4} />,
        label: "Latest News",
        sub: "Catch fresh releases and updates",
        path: "/news",
        tone: theme.chart4,
        surface:
          colorScheme === "dark"
            ? withOpacity(theme.chart4, 0.18)
            : "hsl(270 100% 95%)",
      },
    ],
    [
      colorScheme,
      theme.chart2,
      theme.chart3,
      theme.chart4,
      theme.chart5,
      theme.primary,
    ]
  )
  const filteredQuickAccessItems = useMemo(
    () =>
      hasSearchQuery
        ? quickAccessItems.filter((item) =>
            matchesSearchQuery(
              `${item.label} ${item.sub}`,
              normalizedSearchQuery
            )
          )
        : quickAccessItems,
    [hasSearchQuery, normalizedSearchQuery, quickAccessItems]
  )

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  useEffect(() => {
    let isMounted = true

    void (async () => {
      const reminderEnabled = await hasScheduledStudyReminder()

      if (!isMounted) {
        return
      }

      setHasDailyReminder(reminderEnabled)
    })()

    return () => {
      isMounted = false
    }
  }, [])

  const subjectsQuery = useQuery({
    queryKey: ["home-review-subjects", isPremiumUser],
    queryFn: () => listLearningSubjects({ viewerIsPremium: isPremiumUser }),
  })
  const subjectsErrorMessage =
    subjectsQuery.error instanceof Error
      ? subjectsQuery.error.message
      : subjectsQuery.error
        ? "Unable to load review subjects from Appwrite."
        : null

  const reviewSubjects = useMemo(
    () => subjectsQuery.data ?? [],
    [subjectsQuery.data]
  )

  const filteredReviewSubjects = useMemo(
    () =>
      hasSearchQuery
        ? reviewSubjects.filter((subject) =>
            matchesSearchQuery(
              `${subject.name} ${subject.materialCount} ${subject.topicCount}`,
              normalizedSearchQuery
            )
          )
        : reviewSubjects,
    [hasSearchQuery, normalizedSearchQuery, reviewSubjects]
  )
  const shouldShowBoardExamsSection =
    !hasSearchQuery ||
    matchesSearchQuery(
      "board exams sets timed mode category set review",
      normalizedSearchQuery
    )
  const shouldShowTrackingSection =
    !hasSearchQuery ||
    matchesSearchQuery(
      "tracking progress streak weekly daily dashboard performance",
      normalizedSearchQuery
    )
  const hasSearchResults =
    filteredQuickAccessItems.length > 0 ||
    filteredReviewSubjects.length > 0 ||
    shouldShowBoardExamsSection ||
    shouldShowTrackingSection

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
  const navigateToBoardExams = useCallback(
    () => router.push("./board-exams"),
    [router]
  )
  const handleResumeAttemptPress = useCallback(
    (item: ResumeAttemptCard) => {
      if (!item.onPressParams) {
        return
      }

      router.push(item.onPressParams)
    },
    [router]
  )

  const handleToggleNotifications = useCallback(async () => {
    setIsNotificationUpdating(true)

    try {
      if (hasDailyReminder) {
        await cancelDailyStudyReminders()
        setHasDailyReminder(false)
        return
      }

      let nextPermissionStatus = await getNotificationPermissionStatus()

      if (nextPermissionStatus !== "granted") {
        nextPermissionStatus = await requestNotificationPermissions()
      }

      // setNotificationPermissionStatus(nextPermissionStatus)

      if (nextPermissionStatus === "granted") {
        await scheduleDailyStudyReminder()
        setHasDailyReminder(true)
      }
    } finally {
      setIsNotificationUpdating(false)
    }
  }, [hasDailyReminder])

  const handleNotificationPress = useCallback(() => {
    if (!isNotificationUpdating) {
      void handleToggleNotifications()
    }
  }, [handleToggleNotifications, isNotificationUpdating])

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
          <View className="gap-4">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-3">
                <CommunityAvatar
                  label={initials}
                  sourceUri={profileAvatarUrl}
                  theme={theme}
                  size="lg"
                />
                <View className="gap-0.5">
                  <Text className="text-[20px] font-black text-foreground">
                    Hi, {firstName}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                className="h-11 w-11 items-center justify-center rounded-2xl border"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  opacity: isNotificationUpdating ? 0.7 : 1,
                }}
                onPress={handleNotificationPress}
              >
                <BellRing size={18} color={theme.foreground} />
                {hasDailyReminder ? (
                  <View
                    className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: theme.chart3 }}
                  />
                ) : null}
              </Pressable>
            </View>

            <View
              className="flex-row items-center gap-3 rounded-[22px] border px-4 py-3"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.card,
              }}
            >
              <Search size={16} color={theme.mutedForeground} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search review topics, exams, or features"
                placeholderTextColor={theme.mutedForeground}
                returnKeyType="search"
                className="flex-1 text-sm text-foreground"
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: theme.foreground,
                }}
              />
            </View>
          </View>
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
              {filteredQuickAccessItems.map((item) => (
                <MotionPressable
                  key={item.label}
                  className="w-[180px]"
                  onPress={() => router.push(item.path as never)}
                >
                  <Card
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: item.surface,
                    }}
                  >
                    <CardContent className="gap-2.5 px-3.5 py-3.5">
                      <View className="flex-row items-center justify-between">
                        <View
                          className="h-9 w-9 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: withOpacity(item.tone, 0.18),
                          }}
                        >
                          {item.icon}
                        </View>
                        <ArrowRight size={14} color={theme.mutedForeground} />
                      </View>
                      <View className="gap-0.5">
                        <Text className="text-[14px] font-black text-foreground">
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

        {hasSearchQuery && !hasSearchResults ? (
          <FadeInView delay={getStaggerDelay(2)}>
            <Card style={{ borderWidth: 1, borderColor: theme.border }}>
              <CardContent className="gap-1.5 px-4 py-4">
                <Text className="text-[14px] font-black text-card-foreground">
                  No matches found
                </Text>
                <Text className="text-[12px] leading-5 text-muted-foreground">
                  Try searching for board exams, dashboard, community, or a quiz
                  category.
                </Text>
              </CardContent>
            </Card>
          </FadeInView>
        ) : null}

        {!hasSearchQuery ? (
          <FadeInView delay={getStaggerDelay(2)}>
            <ResumeAnsweringSection
              items={resumableAttemptItems}
              isLoading={resumableAttemptsQuery.isLoading}
              errorMessage={resumableAttemptsErrorMessage}
              onPressItem={handleResumeAttemptPress}
              theme={theme}
            />
          </FadeInView>
        ) : null}

        {shouldShowBoardExamsSection ? (
          <FadeInView delay={getStaggerDelay(3)}>
            <BoardExamsSection theme={theme} onPress={navigateToBoardExams} />
          </FadeInView>
        ) : null}

        {shouldShowTrackingSection ? (
          <FadeInView delay={getStaggerDelay(4)}>
            <TrackingPulseSection
              theme={theme}
              isSignedIn={Boolean(user)}
              isLoading={activityOverviewQuery.isLoading}
              errorMessage={activityOverviewErrorMessage}
              effectiveDailyTrackingCount={effectiveDailyTrackingCount}
              effectiveWeeklyActiveDays={effectiveWeeklyActiveDays}
              dailyTrackingProgress={dailyTrackingProgress}
              weeklyTrackingProgress={weeklyTrackingProgress}
              weeklyTotalActivities={trackingSnapshot.weeklyTotalActivities}
            />
          </FadeInView>
        ) : null}

        <FadeInView delay={getStaggerDelay(5)}>
          <PracticeAreasSection
            theme={theme}
            isLoading={subjectsQuery.isLoading}
            errorMessage={subjectsErrorMessage}
            reviewSubjects={filteredReviewSubjects}
            renderSubjectCard={renderSubjectCard}
          />
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  )
}
