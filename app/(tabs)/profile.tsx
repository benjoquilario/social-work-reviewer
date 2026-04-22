import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import {
  Award,
  BadgeCheck,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  Clock3,
  Flame,
  GraduationCap,
  Settings,
  Star,
  UserRoundPen,
} from "lucide-react-native"
import { Alert, Image, Pressable, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getAvatarUrl, getInitials } from "@/lib/auth"
import { getOverallPerformanceStats } from "@/lib/performance-stats"
import { getUserActivityFeed, type ActivityAchievement } from "@/lib/progress"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { CircularProgress } from "@/components/ui/circular-progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { OverallPerformanceSection } from "@/app/dashboard"

// Hoist Intl formatters — on Hermes, each constructor allocates locale data.
const MEMBER_SINCE_FMT = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
})
const ACTIVITY_DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

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

const ACTIVITY_PAGE_SIZE = 6

type AchievementBadgeIcon = "flame" | "check" | "book" | "star" | "award"

type AchievementBadgeMeta = {
  badgeName: string
  icon: AchievementBadgeIcon
  tone: "primary" | "accent" | "success" | "warning"
}

function getAchievementBadgeMeta(
  achievement: ActivityAchievement
): AchievementBadgeMeta {
  const metric = Math.round(achievement.metricValue)

  if (achievement.achievementType === "streak") {
    if (metric >= 100) {
      return {
        badgeName: "Century Scholar",
        icon: "flame",
        tone: "warning",
      }
    }

    if (metric >= 60) {
      return {
        badgeName: "Discipline Vanguard",
        icon: "flame",
        tone: "success",
      }
    }

    if (metric >= 30) {
      return {
        badgeName: "Monthly Momentum",
        icon: "flame",
        tone: "primary",
      }
    }

    return {
      badgeName: "Streak Builder",
      icon: "flame",
      tone: "accent",
    }
  }

  if (achievement.achievementType === "consistency") {
    if (metric >= 100) {
      return {
        badgeName: "Perfect Ace",
        icon: "star",
        tone: "warning",
      }
    }

    if (metric >= 85) {
      return {
        badgeName: "Silver Strategist",
        icon: "check",
        tone: "success",
      }
    }

    return {
      badgeName: "Bronze Breakthrough",
      icon: "check",
      tone: "primary",
    }
  }

  if (achievement.achievementType === "quiz_completion") {
    if (metric >= 50) {
      return {
        badgeName: "Grand Examiner",
        icon: "award",
        tone: "warning",
      }
    }

    if (metric >= 25) {
      return {
        badgeName: "Exam Pathfinder",
        icon: "award",
        tone: "success",
      }
    }

    if (metric >= 10) {
      return {
        badgeName: "Quiz Specialist",
        icon: "check",
        tone: "primary",
      }
    }

    return {
      badgeName: "Quiz Cadet",
      icon: "check",
      tone: "accent",
    }
  }

  if (achievement.achievementType === "completion") {
    if (metric >= 50) {
      return {
        badgeName: "Master of Modules",
        icon: "book",
        tone: "warning",
      }
    }

    if (metric >= 25) {
      return {
        badgeName: "Curriculum Conqueror",
        icon: "book",
        tone: "success",
      }
    }

    if (metric >= 10) {
      return {
        badgeName: "Study Architect",
        icon: "book",
        tone: "primary",
      }
    }

    return {
      badgeName: "Lesson Explorer",
      icon: "book",
      tone: "accent",
    }
  }

  if (achievement.achievementType === "weekly_average") {
    if (metric >= 90) {
      return {
        badgeName: "Elite Accuracy",
        icon: "award",
        tone: "warning",
      }
    }

    return {
      badgeName: "Strong Weekly Average",
      icon: "award",
      tone: "success",
    }
  }

  return {
    badgeName: "Milestone Unlocked",
    icon: "award",
    tone: "primary",
  }
}

function renderAchievementBadgeIcon(icon: AchievementBadgeIcon, color: string) {
  if (icon === "flame") {
    return <Flame size={13} color={color} />
  }

  if (icon === "check") {
    return <CheckCircle2 size={13} color={color} />
  }

  if (icon === "book") {
    return <BookOpen size={13} color={color} />
  }

  if (icon === "star") {
    return <Star size={13} color={color} />
  }

  return <Award size={13} color={color} />
}

function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  multiline?: boolean
}) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light

  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedForeground}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className="rounded-2xl border px-4 py-3 text-sm text-foreground"
        style={{
          minHeight: multiline ? 96 : 52,
          borderColor: theme.border,
          backgroundColor: isDark ? "hsl(240 10% 14%)" : "hsl(243 30% 97%)",
          fontFamily: "PlusJakartaSans_500Medium",
          color: theme.foreground,
        }}
      />
    </View>
  )
}

export default function ProfileScreen() {
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
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [fullName, setFullName] = useState("")
  const [schoolName, setSchoolName] = useState("")
  const [reviewType, setReviewType] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [imageFailed, setImageFailed] = useState(false)
  const [activeTab, setActiveTab] = useState<"details" | "activity" | "performance">("details")
  const [quizAttemptsLimit, setQuizAttemptsLimit] = useState(ACTIVITY_PAGE_SIZE)
  const [learningHistoryLimit, setLearningHistoryLimit] =
    useState(ACTIVITY_PAGE_SIZE)
  const [achievementsLimit, setAchievementsLimit] = useState(ACTIVITY_PAGE_SIZE)

  useEffect(() => {
    if (!profile) void refreshProfile()
  }, [profile, refreshProfile])

  useEffect(() => {
    setImageFailed(false)
  }, [profile?.avatarUrl, user?.name])

  useEffect(() => {
    setQuizAttemptsLimit(ACTIVITY_PAGE_SIZE)
    setLearningHistoryLimit(ACTIVITY_PAGE_SIZE)
    setAchievementsLimit(ACTIVITY_PAGE_SIZE)
  }, [user?.$id])

  const displayName = profile?.fullName ?? user?.name ?? "Reviewer"
  const email = profile?.email ?? user?.email ?? ""
  const emailVerified = user?.emailVerification === true
  const avatarSource = useMemo(
    () => profile?.avatarUrl?.trim() || getAvatarUrl(displayName),
    [displayName, profile?.avatarUrl]
  )
  const memberSince = formatMemberSince(profile?.createdAt)
  const initials = getInitials(displayName)
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
      getUserActivityFeed(user?.$id ?? "", {
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
  const recentActivityItems = useMemo(() => {
    if (!activityFeed) {
      return []
    }

    const quizItems = activityFeed.quizAttempts.map((attempt) => {
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

    const learningItems = activityFeed.learningHistory.map((entry) => ({
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
  }, [activityFeed, theme.primary, theme.success, theme.warning])

  function openEditDialog() {
    setFullName(profile?.fullName ?? user?.name ?? "")
    setSchoolName(profile?.schoolName ?? "")
    setReviewType(profile?.reviewType ?? "")
    setAvatarUrl(profile?.avatarUrl ?? "")
    setIsEditOpen(true)
  }

  async function handlePickProfilePhoto() {
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
  }

  async function handleSaveProfile() {
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
  }

  async function handleSendVerification() {
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
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        contentContainerClassName="pb-32"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Cover area */}
        <View
          style={{
            height: 160,
            backgroundColor: withOpacity(theme.primary, 0.15),
          }}
        >
          {/* Top bar icons */}
          <SafeAreaView
            edges={["top"]}
            className="flex-row items-center justify-between px-4 pt-2"
          >
            <View />
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: withOpacity(theme.background, 0.7) }}
              onPress={() => router.push("/settings")}
            >
              <Settings size={18} color={theme.foreground} strokeWidth={2.2} />
            </Pressable>
          </SafeAreaView>
        </View>

        {/* Avatar overlapping cover */}
        <View className="items-center" style={{ marginTop: -50 }}>
          <View className="relative">
            <View
              className="overflow-hidden rounded-full border-4"
              style={{ borderColor: theme.background }}
            >
              {avatarSource && !imageFailed ? (
                <Image
                  source={{ uri: avatarSource }}
                  style={{ width: 100, height: 100 }}
                  resizeMode="cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <View
                  className="items-center justify-center bg-primary"
                  style={{ width: 100, height: 100 }}
                >
                  <Text className="text-3xl font-black text-primary-foreground">
                    {initials}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-2 bg-primary"
              style={{ borderColor: theme.background }}
              onPress={openEditDialog}
            >
              <Camera
                size={14}
                color={theme.primaryForeground}
                strokeWidth={2.4}
              />
            </Pressable>
          </View>

          {/* Name & subtitle */}
          <View className="mt-3 items-center gap-1">
            <Text className="text-[20px] font-black text-foreground">
              {displayName}
            </Text>
            <Text className="text-[13px] text-muted-foreground">
              @{email.split("@")[0]}
            </Text>
            <Text className="text-[12px] text-muted-foreground">
              Member since {memberSince}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View className="mt-4 flex-row justify-center gap-8 border-b border-border/40 pb-4">
          <View className="items-center">
            <Text className="text-[17px] font-black text-foreground">
              {profile?.isPremium ? "Pro" : "Free"}
            </Text>
            <Text className="text-[11px] text-muted-foreground">Plan</Text>
          </View>
          <View className="items-center">
            <Text className="text-[17px] font-black text-foreground">
              {emailVerified ? "Yes" : "No"}
            </Text>
            <Text className="text-[11px] text-muted-foreground">Verified</Text>
          </View>
          <View className="items-center">
            <Text className="text-[17px] font-black text-foreground">
              {profile?.schoolName ? "1" : "0"}
            </Text>
            <Text className="text-[11px] text-muted-foreground">School</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-2.5 px-4 pt-4">
          <Button className="h-11 flex-1 rounded-xl" onPress={openEditDialog}>
            <UserRoundPen
              size={15}
              color={theme.primaryForeground}
              strokeWidth={2.3}
            />
            <Text className="text-[13px] font-bold text-primary-foreground">
              Edit Profile
            </Text>
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onPress={() => router.push("/settings")}
          >
            <Settings size={15} color={theme.primary} strokeWidth={2.2} />
            <Text className="text-[13px] font-bold">Settings</Text>
          </Button>
        </View>

        <View className="mt-4 flex-row border-b border-border/40">
          <Pressable
            className="flex-1 items-center pb-3"
            onPress={() => setActiveTab("details")}
          >
            <Text
              className="text-[13px] font-bold"
              style={{
                color:
                  activeTab === "details"
                    ? theme.primary
                    : theme.mutedForeground,
              }}
            >
              Details
            </Text>
            {activeTab === "details" ? (
              <View
                className="absolute bottom-0 h-0.5 w-12 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
            ) : null}
          </Pressable>
          <Pressable
            className="flex-1 items-center pb-3"
            onPress={() => setActiveTab("activity")}
          >
            <Text
              className="text-[13px] font-bold"
              style={{
                color:
                  activeTab === "activity"
                    ? theme.primary
                    : theme.mutedForeground,
              }}
            >
              Activity
            </Text>
            {activeTab === "activity" ? (
              <View
                className="absolute bottom-0 h-0.5 w-12 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
            ) : null}
          </Pressable>
          <Pressable
            className="flex-1 items-center pb-3"
            onPress={() => setActiveTab("performance")}
          >
            <Text
              className="text-[13px] font-bold"
              style={{
                color:
                  activeTab === "performance"
                    ? theme.primary
                    : theme.mutedForeground,
              }}
            >
              Performance
            </Text>
            {activeTab === "performance" ? (
              <View
                className="absolute bottom-0 h-0.5 w-12 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
            ) : null}
          </Pressable>
        </View>

        {/* Tab content */}
        <View className="gap-3 px-4 pt-4">
          {activeTab === "details" ? (
            <>
              {/* Info rows -- details tab */}
              <View className="flex-row items-center gap-3 py-2">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
                >
                  <GraduationCap size={16} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-muted-foreground">
                    Review Focus
                  </Text>
                  <Text className="text-[14px] font-semibold text-foreground">
                    {profile?.reviewType || "Not set yet"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3 py-2">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
                >
                  <BookOpen size={16} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-muted-foreground">
                    School
                  </Text>
                  <Text className="text-[14px] font-semibold text-foreground">
                    {profile?.schoolName || "Not added yet"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3 py-2">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
                >
                  <Calendar size={16} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-muted-foreground">
                    Joined
                  </Text>
                  <Text className="text-[14px] font-semibold text-foreground">
                    {memberSince}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3 py-2">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
                >
                  <Star size={16} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-muted-foreground">
                    Plan
                  </Text>
                  <Text className="text-[14px] font-semibold text-foreground">
                    {profile?.isPremium ? "Premium Member" : "Free Plan"}
                  </Text>
                </View>
              </View>

              {/* Email verification */}
              <View
                className="mt-2 flex-row items-center gap-3 rounded-2xl px-3.5 py-3"
                style={{
                  backgroundColor: emailVerified
                    ? withOpacity(theme.success, 0.08)
                    : withOpacity(theme.warning, 0.08),
                  borderWidth: 1,
                  borderColor: emailVerified
                    ? withOpacity(theme.success, 0.2)
                    : withOpacity(theme.warning, 0.2),
                }}
              >
                <BadgeCheck
                  size={18}
                  color={emailVerified ? theme.success : theme.warning}
                />
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-foreground">
                    {emailVerified ? "Email Verified" : "Email Not Verified"}
                  </Text>
                  {!emailVerified ? (
                    <Pressable
                      onPress={() => void handleSendVerification()}
                      disabled={isSendingVerification}
                    >
                      <Text className="mt-0.5 text-[12px] font-semibold text-primary">
                        {isSendingVerification ? "Sending..." : "Verify now"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </>
          ) : activeTab === "activity" ? (
            /* Activity tab */
            <View className="gap-3 py-1">
              {activityQuery.isLoading ? (
                <View className="gap-2.5">
                  <View
                    className="h-20 rounded-2xl border"
                    style={{
                      backgroundColor: withOpacity(theme.primary, 0.08),
                      borderColor: theme.border,
                    }}
                  />
                  <View
                    className="h-24 rounded-2xl border"
                    style={{
                      backgroundColor: withOpacity(theme.primary, 0.08),
                      borderColor: theme.border,
                    }}
                  />
                  <View
                    className="h-32 rounded-2xl border"
                    style={{
                      backgroundColor: withOpacity(theme.primary, 0.08),
                      borderColor: theme.border,
                    }}
                  />
                </View>
              ) : activityQuery.error ? (
                <View className="items-center gap-2 rounded-2xl border border-border bg-card px-4 py-4">
                  <Text className="text-[14px] font-bold text-foreground">
                    Activity unavailable
                  </Text>
                  <Text className="text-center text-[12px] leading-5 text-muted-foreground">
                    {activityQuery.error instanceof Error
                      ? activityQuery.error.message
                      : "Unable to load your recent activity right now."}
                  </Text>
                </View>
              ) : activityFeed ? (
                <>
                  <View className="rounded-2xl border border-border bg-card px-3.5 py-3.5">
                    <Text className="text-[11px] font-black uppercase tracking-[1.3px] text-primary">
                      Activity Overview
                    </Text>
                    <View className="mt-2 flex-row gap-2.5">
                      <View className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5">
                        <View className="flex-row items-center gap-1.5">
                          <Flame size={14} color={theme.primary} />
                          <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-muted-foreground">
                            Streak
                          </Text>
                        </View>
                        <Text className="mt-1 text-[20px] font-black text-card-foreground">
                          {activityFeed.dayStreak}
                        </Text>
                        <Text className="text-[11px] text-muted-foreground">
                          days active
                        </Text>
                      </View>
                      <View className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5">
                        <View className="flex-row items-center gap-1.5">
                          <CheckCircle2 size={14} color={theme.success} />
                          <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-muted-foreground">
                            Weekly Avg
                          </Text>
                        </View>
                        <Text className="mt-1 text-[20px] font-black text-card-foreground">
                          {activityFeed.weeklyAverageScore}%
                        </Text>
                        <Text className="text-[11px] text-muted-foreground">
                          score this week
                        </Text>
                      </View>
                    </View>
                    <View className="mt-2 rounded-xl border border-border bg-background px-3 py-2.5">
                      <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-muted-foreground">
                        Completed
                      </Text>
                      <Text className="mt-1 text-[13px] font-semibold text-card-foreground">
                        {activityFeed.completedQuizzes} quizzes ·{" "}
                        {activityFeed.completedMaterials} materials
                      </Text>
                      <Text className="mt-0.5 text-[11px] text-muted-foreground">
                        Last active{" "}
                        {formatActivityDate(activityFeed.lastActiveAt)}
                      </Text>
                    </View>
                  </View>

                  <View className="rounded-2xl border border-border bg-card px-3.5 py-3.5">
                    <View className="mb-2 flex-row items-center gap-2">
                      <Award size={15} color={theme.primary} />
                      <Text className="text-[13px] font-bold text-card-foreground">
                        Recent Achievements
                      </Text>
                    </View>

                    {activityFeed.achievements.length === 0 ? (
                      <Text className="text-[12px] leading-5 text-muted-foreground">
                        No achievements yet. Keep practicing to unlock badges.
                      </Text>
                    ) : (
                      activityFeed.achievements.map((achievement, index) => {
                        const badgeMeta = getAchievementBadgeMeta(achievement)
                        const badgeTone =
                          badgeMeta.tone === "success"
                            ? theme.success
                            : badgeMeta.tone === "warning"
                              ? theme.warning
                              : badgeMeta.tone === "accent"
                                ? theme.accent
                                : theme.primary

                        return (
                          <View
                            key={achievement.id}
                            className="py-2"
                            style={{
                              borderBottomWidth:
                                index === activityFeed.achievements.length - 1
                                  ? 0
                                  : 1,
                              borderBottomColor: withOpacity(theme.border, 0.8),
                            }}
                          >
                            <View className="flex-row items-center gap-2">
                              <View
                                className="h-6 w-6 items-center justify-center rounded-full"
                                style={{
                                  backgroundColor: withOpacity(badgeTone, 0.15),
                                }}
                              >
                                {renderAchievementBadgeIcon(
                                  badgeMeta.icon,
                                  badgeTone
                                )}
                              </View>
                              <Text
                                className="text-[11px] font-black uppercase tracking-[1.1px]"
                                style={{ color: badgeTone }}
                              >
                                {badgeMeta.badgeName}
                              </Text>
                            </View>
                            <Text className="mt-1 text-[12px] font-bold text-card-foreground">
                              {achievement.title}
                            </Text>
                            <Text className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                              {achievement.description ?? "Milestone unlocked"}
                            </Text>
                            <Text className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              {achievement.metricValue} ·{" "}
                              {formatActivityDate(achievement.earnedAt)}
                            </Text>
                          </View>
                        )
                      })
                    )}

                    {activityFeed.achievementsHasMore ? (
                      <Button
                        variant="outline"
                        className="mt-2 h-9 rounded-xl"
                        onPress={() =>
                          setAchievementsLimit(
                            (previousValue) =>
                              previousValue + ACTIVITY_PAGE_SIZE
                          )
                        }
                      >
                        <Text className="text-[11px] font-bold">
                          Load more achievements
                        </Text>
                      </Button>
                    ) : null}
                  </View>

                  <View className="rounded-2xl border border-border bg-card px-3.5 py-3.5">
                    <View className="mb-2 flex-row items-center gap-2">
                      <Clock3 size={14} color={theme.primary} />
                      <Text className="text-[13px] font-bold text-card-foreground">
                        Recent Activity Timeline
                      </Text>
                    </View>

                    {recentActivityItems.length === 0 ? (
                      <Text className="text-[12px] leading-5 text-muted-foreground">
                        No recent quiz or learning activity yet.
                      </Text>
                    ) : (
                      recentActivityItems.map((item, index) => (
                        <View
                          key={item.id}
                          className="flex-row gap-2.5 py-2"
                          style={{
                            borderBottomWidth:
                              index === recentActivityItems.length - 1 ? 0 : 1,
                            borderBottomColor: withOpacity(theme.border, 0.8),
                          }}
                        >
                          <View
                            className="mt-1 h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.tone }}
                          />
                          <View className="flex-1 gap-0.5">
                            <View className="flex-row items-center justify-between gap-2">
                              <Text
                                className="flex-1 text-[12px] font-semibold text-card-foreground"
                                numberOfLines={2}
                              >
                                {item.title}
                              </Text>
                              <Text
                                className="text-[10px] font-black uppercase tracking-[1px]"
                                style={{ color: item.tone }}
                              >
                                {item.kindLabel}
                              </Text>
                            </View>
                            <Text className="text-[11px] text-muted-foreground">
                              {item.metric}
                            </Text>
                            <Text className="text-[10px] leading-4 text-muted-foreground">
                              {item.statusText}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  <View className="flex-row gap-2.5">
                    {activityFeed.quizAttemptsHasMore ? (
                      <Button
                        variant="outline"
                        className="h-10 flex-1 rounded-xl"
                        onPress={() =>
                          setQuizAttemptsLimit(
                            (previousValue) =>
                              previousValue + ACTIVITY_PAGE_SIZE
                          )
                        }
                      >
                        <Text className="text-[11px] font-bold">
                          More Quiz Data
                        </Text>
                      </Button>
                    ) : null}

                    {activityFeed.learningHistoryHasMore ? (
                      <Button
                        variant="outline"
                        className="h-10 flex-1 rounded-xl"
                        onPress={() =>
                          setLearningHistoryLimit(
                            (previousValue) =>
                              previousValue + ACTIVITY_PAGE_SIZE
                          )
                        }
                      >
                        <Text className="text-[11px] font-bold">
                          More Learning Data
                        </Text>
                      </Button>
                    ) : null}
                  </View>
                </>
              ) : null}

              <Button
                className="mt-1 h-11 rounded-xl px-6"
                onPress={() => router.push("/dashboard")}
              >
                <Text className="text-[13px] font-bold text-primary-foreground">
                  View Dashboard
                </Text>
              </Button>
            </View>
          ) : activeTab === "performance" ? (
            /* Performance tab */
            <View className="gap-3 py-1">
              {performanceQuery.isLoading ? (
                <View className="gap-2.5">
                  <View
                    className="h-40 rounded-2xl border"
                    style={{
                      backgroundColor: withOpacity(theme.primary, 0.08),
                      borderColor: theme.border,
                    }}
                  />
                  <View
                    className="h-32 rounded-2xl border"
                    style={{
                      backgroundColor: withOpacity(theme.primary, 0.08),
                      borderColor: theme.border,
                    }}
                  />
                </View>
              ) : performanceQuery.error ? (
                <View className="items-center gap-2 rounded-2xl border border-border bg-card px-4 py-4">
                  <Text className="text-[14px] font-bold text-foreground">
                    Performance unavailable
                  </Text>
                  <Text className="text-center text-[12px] leading-5 text-muted-foreground">
                    {performanceQuery.error instanceof Error
                      ? performanceQuery.error.message
                      : "Unable to load your performance data right now."}
                  </Text>
                </View>
              ) : performanceQuery.data ? (
                <OverallPerformanceSection
                  stats={performanceQuery.data}
                  theme={theme}
                />
              ) : null}

              <Button
                className="mt-1 h-11 rounded-xl px-6"
                onPress={() => router.push("/dashboard")}
              >
                <Text className="text-[13px] font-bold text-primary-foreground">
                  Full Dashboard
                </Text>
              </Button>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update the profile details shown across your reviewer account.
            </DialogDescription>
          </DialogHeader>

          <View className="gap-3">
            <View className="gap-2">
              <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                Profile photo
              </Text>
              <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-background px-3.5 py-3">
                <View className="relative">
                  {(avatarUrl || profile?.avatarUrl || avatarSource) &&
                  !imageFailed ? (
                    <Image
                      source={{
                        uri: avatarUrl || profile?.avatarUrl || avatarSource,
                      }}
                      className="h-16 w-16 rounded-full"
                      resizeMode="cover"
                      onError={() => setImageFailed(true)}
                    />
                  ) : (
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
                      <Text className="text-lg font-black text-primary-foreground">
                        {initials}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-1 gap-2">
                  <Text className="text-sm font-bold text-card-foreground">
                    Upload from device
                  </Text>
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    Square photos work best. Max size: 5 MB.
                  </Text>
                  <View className="flex-row gap-2">
                    <Button
                      className="h-10 flex-1 rounded-2xl"
                      onPress={() => void handlePickProfilePhoto()}
                      disabled={isUploadingAvatar}
                    >
                      <Camera
                        size={15}
                        color={theme.primaryForeground}
                        strokeWidth={2.3}
                      />
                      <Text className="font-bold text-primary-foreground">
                        {isUploadingAvatar ? "Uploading…" : "Choose photo"}
                      </Text>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 rounded-2xl"
                      onPress={() => setAvatarUrl("")}
                    >
                      <Text className="font-bold">Clear</Text>
                    </Button>
                  </View>
                </View>
              </View>
            </View>
            <ProfileInput
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
            />
            <ProfileInput
              label="School"
              value={schoolName}
              onChangeText={setSchoolName}
              placeholder="Add your school or organization"
            />
            <ProfileInput
              label="Review focus"
              value={reviewType}
              onChangeText={setReviewType}
              placeholder="Example: Social Work Board Exam"
            />
          </View>

          <DialogFooter>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={() => setAvatarUrl("")}
            >
              <Text className="font-bold">Use initials avatar</Text>
            </Button>
            <Button
              className="h-11 rounded-2xl"
              onPress={() => void handleSaveProfile()}
              disabled={isSubmitting}
            >
              <Text className="font-bold text-primary-foreground">
                {isSubmitting ? "Saving…" : "Save changes"}
              </Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  )
}
