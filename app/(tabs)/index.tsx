import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { QUICK_ACCESS_ITEMS } from "@/data/home-quick-access"
import { type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"

import { getInitials } from "@/lib/auth"
import { getBoardExamSetById } from "@/lib/board-exams"
import type { ResumeAttemptCard } from "@/lib/home-types"
import {
  buildTrackingMetrics,
  fetchEnrichedResumableAttempts,
  formatDurationCompact,
  formatRelativeDateLabel,
  matchesSearchQuery,
} from "@/lib/home-utils"
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
import { getUserActivityFeed, listUserResumableAttempts } from "@/lib/progress"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { FadeInView } from "@/components/ui/motion"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import {
  BoardExamsSection,
  HomeHeroSection,
  HomeSubjectCard,
  PracticeAreasSection,
  ResumeAnsweringSection,
  TrackingPulseSection,
} from "@/components/home"

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

  const displayName = profile?.fullName ?? user?.name ?? "Reviewer"
  const firstName = displayName.split(" ")[0]
  const initials = getInitials(displayName)
  const profileAvatarUrl = profile?.avatarUrl?.trim() || null
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const hasSearchQuery = normalizedSearchQuery.length > 0

  // ─── Data Queries ───────────────────────────────────────────────

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

      const enriched = await fetchEnrichedResumableAttempts(
        ongoingAttempts,
        (setId) =>
          getBoardExamSetById(setId, {
            viewerIsPremium: profile?.isPremium === true,
          }).catch(() => null),
        formatDurationCompact
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

  const subjectsQuery = useQuery({
    queryKey: ["home-review-subjects", isPremiumUser],
    queryFn: () => listLearningSubjects({ viewerIsPremium: isPremiumUser }),
  })

  // ─── Derived State ──────────────────────────────────────────────

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
    effectiveDayStreak,
    effectiveWeeklyAverage,
    effectiveDailyTrackingCount,
    effectiveWeeklyActiveDays,
    dailyTrackingProgress,
    weeklyTrackingProgress,
  } = trackingMetrics

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

  const filteredQuickAccessItems = useMemo(
    () =>
      hasSearchQuery
        ? QUICK_ACCESS_ITEMS.filter((item) =>
            matchesSearchQuery(
              `${item.label} ${item.sub}`,
              normalizedSearchQuery
            )
          )
        : QUICK_ACCESS_ITEMS,
    [hasSearchQuery, normalizedSearchQuery]
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

  // ─── Callbacks ──────────────────────────────────────────────────

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

      navigateToBoardExams()
    },
    [navigateToBoardExams, navigateToPremium]
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

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-5 px-4 pb-12 pt-4"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <FadeInView delay={getStaggerDelay(0)}>
          <HomeHeroSection
            theme={theme}
            firstName={firstName}
            initials={initials}
            profileAvatarUrl={profileAvatarUrl}
            hasDailyReminder={hasDailyReminder}
            isNotificationUpdating={isNotificationUpdating}
            onPressNotification={handleNotificationPress}
            effectiveDayStreak={effectiveDayStreak}
            effectiveWeeklyAverage={effectiveWeeklyAverage}
            effectiveWeeklyActiveDays={effectiveWeeklyActiveDays}
          />
        </FadeInView>

        {/* <FadeInView delay={getStaggerDelay(1)}>
          <View className="gap-2.5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
                  Daily Shortcuts
                </Text>
                <Text className="text-[18px] font-extrabold text-foreground">
                  Quick Access
                </Text>
                <Text className="text-[13px] leading-5 text-muted-foreground">
                  Fast paths into the parts of Reviewer you will most likely use
                  in this session.
                </Text>
              </View>
              <View
                className="rounded-full px-3 py-1.5"
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                }}
              >
                <Text className="text-[10px] font-black uppercase tracking-[0.8px] text-primary">
                  {filteredQuickAccessItems.length} paths
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 pr-4"
              decelerationRate="fast"
            >
              {filteredQuickAccessItems.map((item) => {
                const QuickAccessIcon = item.Icon
                const cardPresentation = getQuickAccessCardPresentation(
                  theme,
                  item.tone
                )

                return (
                  <MotionPressable
                    key={`${colorScheme}-${item.label}`}
                    accessibilityLabel={`${item.label}. ${item.sub}`}
                    accessibilityRole="button"
                    className="w-[276px]"
                    onPress={() => router.push(item.path as never)}
                  >
                    <Card
                      className="rounded-[24px]"
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.card,
                      }}
                    >
                      <CardContent className="gap-3 px-3 py-3">
                        <View className="flex-row items-center gap-3">
                          <View
                            className="h-10 w-10 items-center justify-center rounded-2xl"
                            style={{
                              backgroundColor: cardPresentation.iconBg,
                            }}
                          >
                            <QuickAccessIcon
                              size={18}
                              color={cardPresentation.accent}
                            />
                          </View>

                          <View className="flex-1 gap-1">
                            <View
                              className="self-start rounded-full px-2.5 py-1"
                              style={{
                                backgroundColor: cardPresentation.eyebrowBg,
                              }}
                            >
                              <Text
                                className="text-[10px] font-black uppercase tracking-[0.7px]"
                                style={{ color: cardPresentation.accent }}
                                numberOfLines={1}
                              >
                                {item.eyebrow}
                              </Text>
                            </View>
                            <Text
                              className="text-[16px] font-black leading-[20px] text-foreground"
                              numberOfLines={1}
                            >
                              {item.label}
                            </Text>
                            <Text
                              className="text-[12px] leading-[18px] text-muted-foreground"
                              numberOfLines={2}
                            >
                              {item.sub}
                            </Text>
                          </View>

                          <View
                            className="h-10 w-10 items-center justify-center rounded-2xl"
                            style={{
                              backgroundColor: cardPresentation.actionBg,
                            }}
                          >
                            <ArrowRight
                              size={15}
                              color={cardPresentation.actionLabel}
                            />
                          </View>
                        </View>

                        <View
                          className="flex-row items-center justify-between rounded-[18px] px-3 py-2.5"
                          style={{ backgroundColor: cardPresentation.footerBg }}
                        >
                          <Text
                            className="text-[11px] font-black uppercase tracking-[0.8px]"
                            style={{ color: cardPresentation.actionLabel }}
                            numberOfLines={1}
                          >
                            {item.actionLabel}
                          </Text>
                        </View>
                      </CardContent>
                    </Card>
                  </MotionPressable>
                )
              })}
            </ScrollView>
          </View>
        </FadeInView> */}

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
              activityFeed={activityFeed}
              effectiveDayStreak={effectiveDayStreak}
              effectiveWeeklyAverage={effectiveWeeklyAverage}
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
