import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  ProfileProvider,
  useProfileEditState,
} from "@/contexts/profile-context"
import { useQuery } from "@tanstack/react-query"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { Alert, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppPreferences } from "@/lib/app-preferences"
import { getAvatarUrl, getInitials } from "@/lib/auth"
import { buildExamCountdown } from "@/lib/exam-countdown"
import { getOverallPerformanceStats } from "@/lib/performance-stats"
import { getUserActivityFeed } from "@/lib/progress"
import { listLearningSubjects } from "@/lib/learning-content"
import { getStaggerDelay } from "@/lib/motion"
import {
  buildRecentActivityEntries,
  buildStudyProgressSummary,
  buildSubjectProgressItems,
} from "@/lib/study-dashboard"
import { useThemePalette } from "@/hooks/use-theme"
import { FadeInView } from "@/components/ui/motion"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { RecentActivitySection } from "@/components/study/recent-activity"
import {
  SubjectProgressSection,
  type SubjectRailItem,
} from "@/components/study/subject-progress-section"
import {
  AchievementsSection,
  ProfileEditDialog,
  ProfileIdentityCard,
  ProfileProgressCard,
  ProfileTopBar,
  ProfileVerifyEmailCard,
  getAchievementBadgeMeta,
  type AchievementCardItem,
} from "@/components/profile"
import { getMembership } from "@/lib/member/membership"
import { getMemberTypeDisplay } from "@/lib/member/profile"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MemberIdentityRows } from "@/components/member/member-identity-row"
import { MembershipCard } from "@/components/member/membership-card"
import { useIsPremium, useSubscription } from "@/hooks/use-membership"

const SUBJECT_PREVIEW_COUNT = 6
const ACHIEVEMENT_PREVIEW_COUNT = 6
const RECENT_ACTIVITY_COUNT = 4

const ACHIEVEMENT_DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
})

function ProfileScreenContent() {
  const router = useRouter()
  const theme = useThemePalette()
  const user = useAuth((state) => state.user)
  const profile = useAuth((state) => state.profile)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  const uploadProfilePhoto = useAuth((state) => state.uploadProfilePhoto)
  const updateProfile = useAuth((state) => state.updateProfile)
  const sendVerificationEmail = useAuth((state) => state.sendVerificationEmail)

  const examDate = useAppPreferences((state) => state.preferences.examDate)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  // Flag *and* date — the cached flag alone keeps a lapsed member premium
  // until a server sweep catches up (section 6).
  const isPremiumUser = useIsPremium()

  const {
    isEditOpen,
    setIsEditOpen,
    openEditDialog: openProfileEditDialog,
    isSubmitting,
    setIsSubmitting,
    isUploadingAvatar,
    setIsUploadingAvatar,
    fullName,
    setFullName,
    memberType,
    setMemberType,
    schoolOrEmployer,
    setSchoolOrEmployer,
    licenseNumber,
    setLicenseNumber,
    avatarUrl,
    setAvatarUrl,
    clearAvatarUrl,
  } = useProfileEditState()

  useEffect(() => {
    if (!profile) void refreshProfile()
  }, [profile, refreshProfile])

  // ─── Identity ───────────────────────────────────────────────────

  const displayName = profile?.fullName ?? user?.name ?? "Reviewer"
  const email = profile?.email ?? user?.email ?? ""
  const emailVerified = user?.emailVerification === true
  const initials = getInitials(displayName)
  const avatarSource = useMemo(
    () => profile?.avatarUrl?.trim() || getAvatarUrl(displayName),
    [displayName, profile?.avatarUrl]
  )

  // Who they said they are, or "Not said" — never a guess, and never a role.
  const roleLabel = getMemberTypeDisplay(profile)
  // The paywall answer, date included — never the cached flag on its own.
  const membership = useMemo(() => getMembership(profile), [profile])
  // The row the server actually reads, rather than the four fields it caches
  // onto the profile afterwards. Empty for anybody who has never subscribed.
  const subscription = useSubscription()
  const school = profile?.schoolOrEmployer ?? undefined

  // ─── Data ───────────────────────────────────────────────────────

  const activityQuery = useQuery({
    queryKey: ["profile-activity", user?.$id],
    enabled: Boolean(user?.$id),
    queryFn: () =>
      getUserActivityFeed(
        { userId: user?.$id ?? "" },
        {
          sessionsLimit: 80,
          learningHistoryLimit: 80,
          achievementsLimit: 12,
        }
      ),
    staleTime: 1000 * 20,
  })

  const performanceQuery = useQuery({
    queryKey: ["profile-overall-performance", user?.$id],
    enabled: Boolean(user?.$id),
    queryFn: () => getOverallPerformanceStats(user?.$id ?? ""),
    staleTime: 1000 * 15,
  })

  const subjectsQuery = useQuery({
    queryKey: ["profile-review-subjects", isPremiumUser],
    queryFn: () => listLearningSubjects({ viewerIsPremium: isPremiumUser }),
  })

  // ─── Derived ────────────────────────────────────────────────────

  const activityFeed = activityQuery.data ?? null
  const countdown = useMemo(() => buildExamCountdown(examDate), [examDate])

  const allSubjectItems = useMemo(
    () =>
      buildSubjectProgressItems(subjectsQuery.data ?? [], activityFeed, theme),
    [activityFeed, subjectsQuery.data, theme]
  )

  const subjectItems = useMemo(
    () => allSubjectItems.slice(0, SUBJECT_PREVIEW_COUNT),
    [allSubjectItems]
  )

  const progressSummary = useMemo(
    () => buildStudyProgressSummary(allSubjectItems, activityFeed),
    [activityFeed, allSubjectItems]
  )

  const achievementItems = useMemo<AchievementCardItem[]>(
    () =>
      (activityFeed?.achievements ?? [])
        .slice(0, ACHIEVEMENT_PREVIEW_COUNT)
        .map((achievement) => {
          const badge = getAchievementBadgeMeta(achievement)

          return {
            id: achievement.id,
            badge,
            title: badge.badgeName,
            caption:
              achievement.description?.trim() ||
              `Earned ${ACHIEVEMENT_DATE_FMT.format(new Date(achievement.earnedAt))}`,
            tone: badge.tone,
          }
        }),
    [activityFeed]
  )

  const recentActivityItems = useMemo(
    () =>
      buildRecentActivityEntries(activityFeed, RECENT_ACTIVITY_COUNT).map(
        (entry) => ({
          id: entry.id,
          Icon: entry.Icon,
          title: entry.title,
          timeLabel: entry.timeLabel,
          scoreLabel: entry.scoreLabel,
          tone: entry.tone,
          onPress: entry.resumeAttemptId
            ? () => router.push("/board-exams")
            : undefined,
        })
      ),
    [activityFeed, router]
  )

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

  // ─── Callbacks ──────────────────────────────────────────────────

  const goToSettings = useCallback(() => router.push("/settings"), [router])
  const goToDashboard = useCallback(() => router.push("/dashboard"), [router])
  const goToLearn = useCallback(() => router.push("/learn"), [router])

  const openEditDialog = useCallback(() => {
    openProfileEditDialog({
      fullName: profile?.fullName ?? user?.name ?? "",
      memberType: profile?.memberType ?? null,
      schoolOrEmployer: profile?.schoolOrEmployer ?? "",
      licenseNumber: profile?.licenseNumber ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
    })
  }, [
    openProfileEditDialog,
    profile?.avatarUrl,
    profile?.fullName,
    profile?.licenseNumber,
    profile?.memberType,
    profile?.schoolOrEmployer,
    user?.name,
  ])

  const handlePickProfilePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to choose a profile picture."
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      selectionLimit: 1,
    })
    if (result.canceled || result.assets.length === 0) return

    const asset = result.assets[0]
    const fileSize = asset.fileSize ?? 0
    const fileName =
      asset.fileName ??
      `profile-${Date.now()}.${asset.mimeType?.split("/")[1] ?? "jpg"}`

    if (!fileSize) {
      Alert.alert(
        "Upload failed",
        "The selected image did not include a readable file size."
      )
      return
    }

    setIsUploadingAvatar(true)
    try {
      const uploadedAvatarUrl = await uploadProfilePhoto({
        uri: asset.uri,
        name: fileName,
        type: asset.mimeType ?? "image/jpeg",
        size: fileSize,
      })
      setAvatarUrl(uploadedAvatarUrl)
      Alert.alert("Photo uploaded", "Your new profile photo is ready to save.")
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error
          ? error.message
          : "Unable to upload your profile photo right now."
      )
    } finally {
      setIsUploadingAvatar(false)
    }
  }, [setAvatarUrl, setIsUploadingAvatar, uploadProfilePhoto])

  const handleSaveProfile = useCallback(async () => {
    setIsSubmitting(true)
    try {
      await updateProfile({
        fullName,
        memberType,
        schoolOrEmployer,
        licenseNumber,
        avatarUrl,
      })
      setIsEditOpen(false)
      Alert.alert("Profile updated", "Your profile details were saved.")
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error
          ? error.message
          : "Unable to update your profile right now."
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [
    avatarUrl,
    fullName,
    licenseNumber,
    memberType,
    schoolOrEmployer,
    setIsEditOpen,
    setIsSubmitting,
    updateProfile,
  ])

  const handleSendVerification = useCallback(async () => {
    setIsSendingVerification(true)
    try {
      await sendVerificationEmail()
      Alert.alert(
        "Verification sent",
        "Check your inbox and open the verification link on this device."
      )
    } catch (error) {
      Alert.alert(
        "Unable to send verification",
        error instanceof Error
          ? error.message
          : "Verification email could not be sent."
      )
    } finally {
      setIsSendingVerification(false)
    }
  }, [sendVerificationEmail])

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

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        contentContainerClassName="gap-6 px-4 pb-6 pt-1"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <ProfileTopBar
          theme={theme}
          onPressMenu={goToSettings}
          onPressSettings={goToSettings}
        />

        <FadeInView delay={getStaggerDelay(0)}>
          <View className="gap-1">
            <Text
              role="heading"
              aria-level="1"
              className="text-3xl font-extrabold leading-10 text-foreground"
            >
              My Profile
            </Text>
            <Text variant="callout" className="text-muted-foreground">
              Stay consistent. Your future self will thank you.
            </Text>
          </View>
        </FadeInView>

        {!emailVerified ? (
          <ProfileVerifyEmailCard
            theme={theme}
            email={email}
            isSending={isSendingVerification}
            onSendVerification={() => void handleSendVerification()}
          />
        ) : null}

        <FadeInView delay={getStaggerDelay(1)}>
          <ProfileIdentityCard
            theme={theme}
            displayName={displayName}
            initials={initials}
            avatarUrl={avatarSource}
            roleLabel={roleLabel}
            subtitle={school || "Add your school or review centre"}
            isSubtitlePlaceholder={!school}
            isVerified={emailVerified}
            daysLeftLabel={countdown ? countdown.daysLabel : "—"}
            questionsSolved={progressSummary.questionsSolved}
            averageScore={progressSummary.averageScore}
            dayStreak={progressSummary.dayStreak}
            onPressEdit={openEditDialog}
          />
        </FadeInView>

        <FadeInView delay={getStaggerDelay(2)}>
          <MembershipCard
            membership={membership}
            subscriptionDetail={subscription.description?.detail}
            onUpgrade={() => router.push("/premium")}
          />
        </FadeInView>

        <FadeInView delay={getStaggerDelay(3)}>
          <Card>
            <CardContent className="gap-2">
              <Text variant="label">About you</Text>
              <MemberIdentityRows profile={profile} />
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                onPress={openEditDialog}
              >
                <Text>Edit details</Text>
              </Button>
            </CardContent>
          </Card>
        </FadeInView>

        <FadeInView delay={getStaggerDelay(4)}>
          <ProfileProgressCard
            theme={theme}
            isLoading={activityQuery.isLoading || subjectsQuery.isLoading}
            progressPercent={progressSummary.progressPercent}
            topicsStudied={progressSummary.topicsStudied}
            topicsTotal={progressSummary.topicsTotal}
            hoursStudied={progressSummary.hoursStudied}
            accuracyRate={performanceQuery.data?.correctPercent ?? 0}
            onPressViewDetails={goToDashboard}
          />
        </FadeInView>

        <FadeInView delay={getStaggerDelay(3)}>
          <AchievementsSection
            theme={theme}
            items={achievementItems}
            isLoading={activityQuery.isLoading}
            onPressSeeAll={goToDashboard}
          />
        </FadeInView>

        <FadeInView delay={getStaggerDelay(4)}>
          <SubjectProgressSection
            theme={theme}
            title="Subjects Progress"
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
            onPressSeeAll={goToDashboard}
          />
        </FadeInView>
      </ScrollView>

      <ProfileEditDialog
        open={isEditOpen}
        theme={theme}
        initials={initials}
        avatarPreview={avatarUrl || profile?.avatarUrl || avatarSource}
        fullName={fullName}
        memberType={memberType}
        schoolOrEmployer={schoolOrEmployer}
        licenseNumber={licenseNumber}
        isUploadingAvatar={isUploadingAvatar}
        isSubmitting={isSubmitting}
        onOpenChange={setIsEditOpen}
        onPickPhoto={() => void handlePickProfilePhoto()}
        onClearAvatar={clearAvatarUrl}
        onChangeFullName={setFullName}
        onChangeMemberType={setMemberType}
        onChangeSchoolOrEmployer={setSchoolOrEmployer}
        onChangeLicenseNumber={setLicenseNumber}
        onSave={() => void handleSaveProfile()}
      />
    </SafeAreaView>
  )
}

export default function ProfileScreen() {
  return (
    <ProfileProvider>
      <ProfileScreenContent />
    </ProfileProvider>
  )
}
