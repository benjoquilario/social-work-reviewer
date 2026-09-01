import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import BookOpenText from "lucide-react-native/icons/book-open-text"
import ClipboardCheck from "lucide-react-native/icons/clipboard-check"
import GraduationCap from "lucide-react-native/icons/graduation-cap"
import History from "lucide-react-native/icons/rotate-ccw-clock"
import Target from "lucide-react-native/icons/target"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppPreferences } from "@/lib/app-preferences"
import { getInitials } from "@/lib/auth"
import { buildExamCountdown, parseExamDate } from "@/lib/exam-countdown"
import {
  buildRecentActivityEntries,
  buildStudyProgressSummary,
  buildSubjectProgressItems,
  getGreetingSalutation,
} from "@/lib/study-dashboard"
import { listLearningSubjects } from "@/lib/learning-content"
import { getStaggerDelay } from "@/lib/motion"
import { getUserActivityFeed } from "@/lib/progress"
import { getThemeChartPalette } from "@/lib/theme"
import { useAnnouncements } from "@/hooks/use-announcements"
import { useResumableSessions } from "@/hooks/use-resumable-sessions"
import { useThemePalette } from "@/hooks/use-theme"
import { DatePickerDialog } from "@/components/ui/date-picker-dialog"
import { FadeInView } from "@/components/ui/motion"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import {
  SubjectProgressSection,
  ExamCountdownCard,
  HomeGreeting,
  HomeTopBar,
  QuickActionsSection,
  RecentActivitySection,
  ResumeAnsweringSection,
  StudyProgressCard,
  type SubjectRailItem,
  type QuickAction,
} from "@/components/home"
import { useIsPremium } from "@/hooks/use-membership"

/** How many subjects the rail shows before deferring to the Learn tab. */
const SUBJECT_PREVIEW_COUNT = 6
const RECENT_ACTIVITY_COUNT = 4

export default function ReviewerHomeScreen() {
  const router = useRouter()
  const theme = useThemePalette()
  const user = useAuth((state) => state.user)
  const profile = useAuth((state) => state.profile)
  const isAuthenticated = useAuth((state) => state.isAuthenticated)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  // Flag *and* date — the cached flag alone keeps a lapsed member premium
  // until a server sweep catches up (section 6).
  const isPremiumUser = useIsPremium()

  const examDate = useAppPreferences((state) => state.preferences.examDate)
  const setPreference = useAppPreferences((state) => state.setPreference)
  const [isExamPickerOpen, setIsExamPickerOpen] = useState(false)

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const displayName = profile?.fullName ?? user?.name ?? "Reviewer"
  const firstName = displayName.split(" ")[0]
  const initials = getInitials(displayName)
  const profileAvatarUrl = profile?.avatarUrl?.trim() || null

  // ─── Data ───────────────────────────────────────────────────────

  const activityQuery = useQuery({
    queryKey: ["home-activity-overview", user?.$id],
    enabled: Boolean(user?.$id),
    queryFn: () =>
      getUserActivityFeed(
        { userId: user?.$id ?? "" },
        {
          sessionsLimit: 80,
          learningHistoryLimit: 80,
          achievementsLimit: 6,
        }
      ),
    staleTime: 1000 * 20,
  })

  const subjectsQuery = useQuery({
    queryKey: ["home-review-subjects", isPremiumUser],
    queryFn: () => listLearningSubjects({ viewerIsPremium: isPremiumUser }),
  })

  const resumable = useResumableSessions()
  const announcements = useAnnouncements()

  // ─── Derived ────────────────────────────────────────────────────

  const activityFeed = activityQuery.data ?? null

  const activityErrorMessage =
    activityQuery.error instanceof Error
      ? activityQuery.error.message
      : activityQuery.error
        ? "Unable to load your recent activity right now."
        : null

  const subjectsErrorMessage =
    subjectsQuery.error instanceof Error
      ? subjectsQuery.error.message
      : subjectsQuery.error
        ? "Unable to load review subjects from Appwrite."
        : null

  const salutation = useMemo(() => getGreetingSalutation(), [])
  // The dot and the list come from the same query, so the badge can never
  // light up for something the Updates screen will not show.
  const showNewsBadge = announcements.hasUnread
  const countdown = useMemo(
    () => buildExamCountdown(examDate),
    [examDate]
  )

  const allSubjectItems = useMemo(
    () =>
      buildSubjectProgressItems(
        subjectsQuery.data ?? [],
        activityFeed,
        theme
      ),
    [activityFeed, subjectsQuery.data, theme]
  )

  const subjectItems = useMemo(
    () => allSubjectItems.slice(0, SUBJECT_PREVIEW_COUNT),
    [allSubjectItems]
  )

  // Summed over every subject, not just the previewed ones — the headline
  // number should describe the whole syllabus, not the first six cards.
  const progressSummary = useMemo(
    () => buildStudyProgressSummary(allSubjectItems, activityFeed),
    [activityFeed, allSubjectItems]
  )

  const recentEntries = useMemo(
    () => buildRecentActivityEntries(activityFeed, RECENT_ACTIVITY_COUNT),
    [activityFeed]
  )

  // ─── Navigation ─────────────────────────────────────────────────

  const goToQuizMode = useCallback(() => router.push("/mode"), [router])
  const goToBoardExams = useCallback(
    () => router.push("/board-exams"),
    [router]
  )
  const goToLearn = useCallback(() => router.push("/learn"), [router])
  const goToDashboard = useCallback(() => router.push("/dashboard"), [router])
  const goToNews = useCallback(() => router.push("/news"), [router])
  const goToProfile = useCallback(() => router.push("/profile"), [router])
  const goToSettings = useCallback(() => router.push("/settings"), [router])

  const handlePressSubject = useCallback(
    (item: SubjectRailItem) => {
      if (item.isLocked) {
        router.push({
          pathname: "/premium",
          params: { source: "subject", title: item.title, categoryId: item.id },
        })
        return
      }

      router.push({
        pathname: "/review/[categoryId]",
        params: { categoryId: item.id },
      })
    },
    [router]
  )

  const handleConfirmExamDate = useCallback(
    (date: Date) => {
      // 8:00 AM is when Philippine licensure exams start; storing a time keeps
      // the card's schedule line honest instead of showing 12:00 AM.
      const withStartTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        8,
        0,
        0,
        0
      )

      setPreference("examDate", withStartTime.toISOString())
      setIsExamPickerOpen(false)
    },
    [setPreference]
  )

  const handleClearExamDate = useCallback(() => {
    setPreference("examDate", null)
    setIsExamPickerOpen(false)
  }, [setPreference])

  // ─── Quick actions ──────────────────────────────────────────────

  const quickActions = useMemo<QuickAction[]>(() => {
    const palette = getThemeChartPalette(theme)

    // The reference's Flashcards and Notes have no destination in this app, so
    // these are the five study surfaces that actually exist. Reordering or
    // swapping one is a single edit to this array.
    return [
      {
        key: "start-quiz",
        Icon: ClipboardCheck,
        label: "Start Quiz",
        color: palette[0],
        onPress: goToQuizMode,
      },
      {
        key: "mock-exams",
        Icon: GraduationCap,
        label: "Mock Exams",
        color: palette[1],
        onPress: goToBoardExams,
      },
      {
        key: "subjects",
        Icon: BookOpenText,
        label: "Subjects",
        color: palette[3],
        onPress: goToLearn,
      },
      {
        key: "weak-topics",
        Icon: Target,
        label: "Weak Topics",
        color: palette[2],
        onPress: goToDashboard,
      },
      {
        // Replaces the Forum shortcut: Forum is a permanent bottom tab and so
        // is always one tap away, whereas Activity lost its entry point when
        // the Profile tabs collapsed into a single scroll.
        key: "activity",
        Icon: History,
        label: "Activity",
        color: palette[4],
        onPress: goToProfile,
      },
    ]
  }, [
    goToBoardExams,
    goToDashboard,
    goToLearn,
    goToProfile,
    goToQuizMode,
    theme,
  ])

  const recentActivityItems = useMemo(
    () =>
      recentEntries.map((entry) => ({
        id: entry.id,
        Icon: entry.Icon,
        title: entry.title,
        timeLabel: entry.timeLabel,
        scoreLabel: entry.scoreLabel,
        tone: entry.tone,
        onPress: entry.resumeAttemptId ? goToQuizMode : undefined,
      })),
    [goToQuizMode, recentEntries]
  )

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerClassName="gap-6 px-4 pb-6 pt-1"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <HomeTopBar
          theme={theme}
          displayName={displayName}
          initials={initials}
          avatarUrl={profileAvatarUrl}
          hasUnread={showNewsBadge}
          onPressMenu={goToSettings}
          onPressNotifications={goToNews}
          onPressAvatar={goToProfile}
          onPressSearch={() => router.push("/search")}
        />

        <FadeInView delay={getStaggerDelay(0)}>
          <HomeGreeting firstName={firstName} salutation={salutation} />
        </FadeInView>

        <FadeInView delay={getStaggerDelay(1)}>
          <ExamCountdownCard
            theme={theme}
            countdown={countdown}
            onPress={() => setIsExamPickerOpen(true)}
          />
        </FadeInView>

        <FadeInView delay={getStaggerDelay(2)}>
          <StudyProgressCard
            theme={theme}
            isLoading={activityQuery.isLoading || subjectsQuery.isLoading}
            progressPercent={progressSummary.progressPercent}
            topicsStudied={progressSummary.topicsStudied}
            questionsSolved={progressSummary.questionsSolved}
            averageScore={progressSummary.averageScore}
            dayStreak={progressSummary.dayStreak}
            onPressViewDetails={goToDashboard}
          />
        </FadeInView>

        <FadeInView delay={getStaggerDelay(3)}>
          <QuickActionsSection actions={quickActions} />
        </FadeInView>

        {/* Only rendered when there is something to continue: an empty
            section would still occupy a slot in the feed's gap rhythm and
            read as a double gap. */}
        {resumable.hasResumableWork || resumable.isLoading ? (
          <FadeInView delay={getStaggerDelay(4)}>
            <ResumeAnsweringSection
              theme={theme}
              items={resumable.cards}
              isLoading={resumable.isLoading}
              errorMessage={
                resumable.error instanceof Error
                  ? resumable.error.message
                  : null
              }
              onPressItem={(item) => {
                if (item.onPressParams) {
                  router.push(item.onPressParams)
                }
              }}
            />
          </FadeInView>
        ) : null}

        <FadeInView delay={getStaggerDelay(4)}>
          <SubjectProgressSection
            theme={theme}
            title="Continue Studying"
            items={subjectItems}
            isLoading={subjectsQuery.isLoading}
            errorMessage={subjectsErrorMessage}
            onPressItem={handlePressSubject}
            onPressSeeAll={goToLearn}
          />
        </FadeInView>

        <FadeInView delay={getStaggerDelay(5)}>
          <RecentActivitySection
            theme={theme}
            items={recentActivityItems}
            isLoading={activityQuery.isLoading}
            errorMessage={activityErrorMessage}
            onPressSeeAll={goToProfile}
          />
        </FadeInView>
      </ScrollView>

      <DatePickerDialog
        open={isExamPickerOpen}
        onOpenChange={setIsExamPickerOpen}
        value={parseExamDate(examDate)}
        title="Your board exam date"
        description="Home counts down the days so you always know how much runway is left."
        confirmLabel="Save exam date"
        onConfirm={handleConfirmExamDate}
        onClear={examDate ? handleClearExamDate : undefined}
      />
    </SafeAreaView>
  )
}
