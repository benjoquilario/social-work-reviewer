import { useCallback, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  ProfileProvider,
  useProfileEditState,
  useProfilePaginationState,
  useProfileViewState,
} from "@/contexts/profile-context"
import { useQuery } from "@tanstack/react-query"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { BookOpen, Calendar, GraduationCap, Star } from "lucide-react-native"
import { Alert, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getAvatarUrl, getInitials } from "@/lib/auth"
import { getOverallPerformanceStats } from "@/lib/performance-stats"
import { getUserActivityFeed } from "@/lib/progress"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { ProfileEditDialog } from "@/components/profile/profile-edit-dialog"
import type {
  ProfileDetailCard,
  ProfileRecentActivityItem,
} from "@/components/profile/profile-primitives"
import {
  ProfileActivityTab,
  ProfileDetailsTab,
  ProfileHeroSection,
  ProfilePerformanceTab,
  ProfileTabRail,
} from "@/components/profile/profile-sections"

const MEMBER_SINCE_FMT = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
})
const ACTIVITY_DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

type SortableRecentActivityItem = ProfileRecentActivityItem & {
  timestamp: string
}

function formatMemberSince(value: string | undefined) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Not available"
  return MEMBER_SINCE_FMT.format(parsed)
}

function formatActivityDate(value: string | null | undefined) {
  if (!value) {
    return "Not available"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "Not available"
  }

  return ACTIVITY_DATE_FMT.format(parsed)
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(seconds, 0)
  const minutes = Math.floor(safeSeconds / 60)
  const remainderSeconds = safeSeconds % 60

  if (minutes === 0) {
    return `${remainderSeconds}s`
  }

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  return `${minutes}m ${remainderSeconds}s`
}

function ProfileScreenContent() {
  const router = useRouter()
  const user = useAuth((state) => state.user)
  const profile = useAuth((state) => state.profile)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  const uploadProfilePhoto = useAuth((state) => state.uploadProfilePhoto)
  const updateProfile = useAuth((state) => state.updateProfile)
  const sendVerificationEmail = useAuth((state) => state.sendVerificationEmail)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const surfaceBorderColor = theme.border
  const nestedBorderColor = theme.border
  const elevatedSurfaceColor = theme.card
  const nestedSurfaceColor = isDark ? "hsl(232 20% 14%)" : "hsl(210 25% 98%)"
  // const tabRailColor = isDark ? "hsl(232 20% 14%)" : "hsl(210 25% 97%)"
  const {
    activeTab,
    setActiveTab,
    imageFailed,
    setImageFailed,
    resetImageFailure,
    isSendingVerification,
    setIsSendingVerification,
  } = useProfileViewState()
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
    schoolName,
    setSchoolName,
    reviewType,
    setReviewType,
    avatarUrl,
    setAvatarUrl,
    clearAvatarUrl,
  } = useProfileEditState()
  const {
    quizAttemptsLimit,
    learningHistoryLimit,
    achievementsLimit,
    incrementQuizAttemptsLimit,
    incrementLearningHistoryLimit,
    incrementAchievementsLimit,
    resetPagination,
  } = useProfilePaginationState()

  useEffect(() => {
    if (!profile) void refreshProfile()
  }, [profile, refreshProfile])

  useEffect(() => {
    resetImageFailure()
  }, [profile?.avatarUrl, resetImageFailure, user?.name])

  useEffect(() => {
    resetPagination()
  }, [resetPagination, user?.$id])

  const displayName = profile?.fullName ?? user?.name ?? "Reviewer"
  const email = profile?.email ?? user?.email ?? ""
  const emailVerified = user?.emailVerification === true
  const avatarSource = useMemo(
    () => profile?.avatarUrl?.trim() || getAvatarUrl(displayName),
    [displayName, profile?.avatarUrl]
  )
  const memberSince = formatMemberSince(profile?.createdAt)
  const initials = getInitials(displayName)
  const username = useMemo(
    () => (email ? `@${email.split("@")[0]}` : "@reviewer"),
    [email]
  )
  const profileCompletion = useMemo(() => {
    let completed = 0
    if (profile?.fullName ?? user?.name) completed += 1
    if (email) completed += 1
    if (profile?.schoolName) completed += 1
    if (profile?.reviewType) completed += 1
    if (profile?.avatarUrl) completed += 1
    return Math.round((completed / 5) * 100)
  }, [
    email,
    profile?.avatarUrl,
    profile?.reviewType,
    profile?.schoolName,
    profile?.fullName,
    user?.name,
  ])
  const detailCards = useMemo<ProfileDetailCard[]>(
    () => [
      {
        key: "review-focus",
        icon: <GraduationCap size={16} color={theme.primary} />,
        label: "Review Focus",
        value: profile?.reviewType || "Set your board exam or study track",
      },
      {
        key: "school",
        icon: <BookOpen size={16} color={theme.primary} />,
        label: "School / Organization",
        value: profile?.schoolName || "Add your school or review center",
      },
      {
        key: "joined",
        icon: <Calendar size={16} color={theme.primary} />,
        label: "Member Since",
        value: memberSince,
      },
      {
        key: "plan",
        icon: <Star size={16} color={theme.primary} />,
        label: "Current Plan",
        value: profile?.isPremium
          ? "Premium Reviewer Access"
          : "Free Reviewer Plan",
      },
    ],
    [
      memberSince,
      profile?.isPremium,
      profile?.reviewType,
      profile?.schoolName,
      theme.primary,
    ]
  )
  const activityQuery = useQuery({
    queryKey: [
      "profile-activity",
      user?.$id,
      quizAttemptsLimit,
      learningHistoryLimit,
      achievementsLimit,
    ],
    enabled: Boolean(user?.$id),
    queryFn: () =>
      getUserActivityFeed({ userId: user?.$id ?? "" }, {
        quizAttemptsLimit,
        learningHistoryLimit,
        achievementsLimit,
      }),
  })

  const performanceQuery = useQuery({
    queryKey: ["profile-overall-performance", user?.$id],
    enabled: Boolean(user?.$id),
    queryFn: () => getOverallPerformanceStats(user?.$id ?? ""),
    staleTime: 1000 * 15,
  })
  const activityFeed = activityQuery.data ?? null
  const recentActivityItems = useMemo<ProfileRecentActivityItem[]>(() => {
    if (!activityFeed) {
      return []
    }

    const quizItems: SortableRecentActivityItem[] =
      activityFeed.quizAttempts.map((attempt) => {
        const timestamp = attempt.finishedAt ?? attempt.startedAt
        const metric = `${attempt.percent}% • ${formatDuration(attempt.timeTaken)}`
        const statusText =
          attempt.status === "done"
            ? `Finished ${formatActivityDate(attempt.finishedAt)}`
            : `Paused at question ${attempt.currentQuestionIndex + 1}`

        return {
          id: `quiz-${attempt.id}`,
          title: attempt.examTitle,
          kindLabel: "Quiz",
          metric,
          statusText,
          timestamp,
          tone: theme.primary,
        }
      })

    const learningItems: SortableRecentActivityItem[] =
      activityFeed.learningHistory.map((entry) => ({
        id: `learn-${entry.id}`,
        title: entry.materialTitle,
        kindLabel: "Learning",
        metric: `${Math.round(entry.progressPercent)}% complete`,
        statusText: `Last opened ${formatActivityDate(entry.lastAccessedAt)}`,
        timestamp: entry.lastAccessedAt,
        tone:
          entry.status === "completed"
            ? theme.success
            : entry.status === "paused"
              ? theme.warning
              : theme.primary,
      }))

    return [...quizItems, ...learningItems]
      .sort(
        (left, right) =>
          new Date(right.timestamp).getTime() -
          new Date(left.timestamp).getTime()
      )
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        title: item.title,
        kindLabel: item.kindLabel,
        metric: item.metric,
        statusText: item.statusText,
        tone: item.tone,
      }))
  }, [activityFeed, theme.primary, theme.success, theme.warning])

  const handleImageError = useCallback(() => {
    setImageFailed(true)
  }, [setImageFailed])

  const handleOpenSettings = useCallback(() => {
    router.push("/settings")
  }, [router])

  const handleViewDashboard = useCallback(() => {
    router.push("/dashboard")
  }, [router])

  const openEditDialog = useCallback(() => {
    openProfileEditDialog({
      fullName: profile?.fullName ?? user?.name ?? "",
      schoolName: profile?.schoolName ?? "",
      reviewType: profile?.reviewType ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
    })
  }, [
    openProfileEditDialog,
    profile?.avatarUrl,
    profile?.fullName,
    profile?.reviewType,
    profile?.schoolName,
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
    const mimeType = asset.mimeType ?? "image/jpeg"
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
        type: mimeType,
        size: fileSize,
      })
      setAvatarUrl(uploadedAvatarUrl)
      setImageFailed(false)
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
  }, [setAvatarUrl, setImageFailed, setIsUploadingAvatar, uploadProfilePhoto])

  const handleSaveProfile = useCallback(async () => {
    setIsSubmitting(true)
    try {
      await updateProfile({ fullName, schoolName, reviewType, avatarUrl })
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
    reviewType,
    schoolName,
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
  }, [sendVerificationEmail, setIsSendingVerification])

  const handleSendVerificationPress = useCallback(() => {
    void handleSendVerification()
  }, [handleSendVerification])

  const handlePickPhotoPress = useCallback(() => {
    void handlePickProfilePhoto()
  }, [handlePickProfilePhoto])

  const handleSaveProfilePress = useCallback(() => {
    void handleSaveProfile()
  }, [handleSaveProfile])

  const activityErrorMessage =
    activityQuery.error instanceof Error
      ? activityQuery.error.message
      : activityQuery.error
        ? "Unable to load your recent activity right now."
        : null
  const performanceErrorMessage =
    performanceQuery.error instanceof Error
      ? performanceQuery.error.message
      : performanceQuery.error
        ? "Unable to load your performance data right now."
        : null
  const avatarPreview = avatarUrl || profile?.avatarUrl || avatarSource

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        contentContainerClassName="pb-32"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeroSection
          theme={theme}
          isDark={isDark}
          displayName={displayName}
          username={username}
          memberSince={memberSince}
          initials={initials}
          avatarSource={avatarSource}
          imageFailed={imageFailed}
          profile={profile}
          profileCompletion={profileCompletion}
          emailVerified={emailVerified}
          nestedSurfaceColor={nestedSurfaceColor}
          nestedBorderColor={nestedBorderColor}
          surfaceBorderColor={surfaceBorderColor}
          elevatedSurfaceColor={elevatedSurfaceColor}
          onImageError={handleImageError}
          onOpenEdit={openEditDialog}
          onOpenSettings={handleOpenSettings}
        />

        <ProfileTabRail
          theme={theme}
          activeTab={activeTab}
          tabRailColor={elevatedSurfaceColor}
          nestedBorderColor={nestedBorderColor}
          onChangeTab={setActiveTab}
        />

        <View className="gap-3 px-4 pt-4">
          {activeTab === "details" ? (
            <ProfileDetailsTab
              theme={theme}
              detailCards={detailCards}
              emailVerified={emailVerified}
              isSendingVerification={isSendingVerification}
              surfaceBorderColor={surfaceBorderColor}
              elevatedSurfaceColor={elevatedSurfaceColor}
              nestedBorderColor={nestedBorderColor}
              nestedSurfaceColor={nestedSurfaceColor}
              onSendVerification={handleSendVerificationPress}
            />
          ) : activeTab === "activity" ? (
            <ProfileActivityTab
              theme={theme}
              activityFeed={activityFeed}
              recentActivityItems={recentActivityItems}
              isLoading={activityQuery.isLoading}
              errorMessage={activityErrorMessage}
              surfaceBorderColor={surfaceBorderColor}
              elevatedSurfaceColor={elevatedSurfaceColor}
              nestedBorderColor={nestedBorderColor}
              nestedSurfaceColor={nestedSurfaceColor}
              onLoadMoreAchievements={incrementAchievementsLimit}
              onLoadMoreQuizData={incrementQuizAttemptsLimit}
              onLoadMoreLearningData={incrementLearningHistoryLimit}
              onViewDashboard={handleViewDashboard}
              formatActivityDate={formatActivityDate}
            />
          ) : activeTab === "performance" ? (
            <ProfilePerformanceTab
              theme={theme}
              stats={performanceQuery.data}
              isLoading={performanceQuery.isLoading}
              errorMessage={performanceErrorMessage}
              surfaceBorderColor={surfaceBorderColor}
              elevatedSurfaceColor={elevatedSurfaceColor}
              nestedBorderColor={nestedBorderColor}
              onViewDashboard={handleViewDashboard}
            />
          ) : null}
        </View>
      </ScrollView>

      <ProfileEditDialog
        open={isEditOpen}
        theme={theme}
        nestedBorderColor={nestedBorderColor}
        nestedSurfaceColor={nestedSurfaceColor}
        initials={initials}
        imageFailed={imageFailed}
        avatarPreview={avatarPreview}
        fullName={fullName}
        schoolName={schoolName}
        reviewType={reviewType}
        isUploadingAvatar={isUploadingAvatar}
        isSubmitting={isSubmitting}
        onOpenChange={setIsEditOpen}
        onImageError={handleImageError}
        onPickPhoto={handlePickPhotoPress}
        onClearAvatar={clearAvatarUrl}
        onChangeFullName={setFullName}
        onChangeSchoolName={setSchoolName}
        onChangeReviewType={setReviewType}
        onSave={handleSaveProfilePress}
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
