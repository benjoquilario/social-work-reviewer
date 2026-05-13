import { memo } from "react"
import type { ProfileTab } from "@/contexts/profile-context"
import {
  Award,
  BadgeCheck,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock3,
  Flame,
  Settings,
  Star,
  UserRoundPen,
} from "lucide-react-native"
import { Image, Pressable, View } from "react-native"

import type { UserProfile } from "@/lib/auth"
import type { OverallPerformanceStats } from "@/lib/performance-stats"
import type { ActivityAchievement, UserActivityFeed } from "@/lib/progress"
import { withOpacity } from "@/lib/theme"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { OverallPerformanceSection } from "@/components/dashboard/overall-performance"

import {
  ProfileSummaryCard,
  TabButton,
  type ProfileDetailCard,
  type ProfileRecentActivityItem,
  type ThemePalette,
} from "./profile-primitives"

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
      return { badgeName: "Century Scholar", icon: "flame", tone: "warning" }
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

    return { badgeName: "Streak Builder", icon: "flame", tone: "accent" }
  }

  if (achievement.achievementType === "consistency") {
    if (metric >= 100) {
      return { badgeName: "Perfect Ace", icon: "star", tone: "warning" }
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
      return { badgeName: "Grand Examiner", icon: "award", tone: "warning" }
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

    return { badgeName: "Quiz Cadet", icon: "check", tone: "accent" }
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

    return { badgeName: "Lesson Explorer", icon: "book", tone: "accent" }
  }

  if (achievement.achievementType === "weekly_average") {
    if (metric >= 90) {
      return { badgeName: "Elite Accuracy", icon: "award", tone: "warning" }
    }

    return {
      badgeName: "Strong Weekly Average",
      icon: "award",
      tone: "success",
    }
  }

  return { badgeName: "Milestone Unlocked", icon: "award", tone: "primary" }
}

function renderAchievementBadgeIcon(icon: AchievementBadgeIcon, color: string) {
  if (icon === "flame") return <Flame size={13} color={color} />
  if (icon === "check") return <CheckCircle2 size={13} color={color} />
  if (icon === "book") return <BookOpen size={13} color={color} />
  if (icon === "star") return <Star size={13} color={color} />
  return <Award size={13} color={color} />
}

export const ProfileHeroSection = memo(function ProfileHeroSection({
  theme,
  isDark,
  displayName,
  username,
  memberSince,
  initials,
  avatarSource,
  imageFailed,
  profile,
  profileCompletion,
  emailVerified,
  nestedSurfaceColor,
  nestedBorderColor,
  surfaceBorderColor,
  elevatedSurfaceColor,
  onImageError,
  onOpenEdit,
  onOpenSettings,
}: {
  theme: ThemePalette
  isDark: boolean
  displayName: string
  username: string
  memberSince: string
  initials: string
  avatarSource: string
  imageFailed: boolean
  profile: UserProfile | null
  profileCompletion: number
  emailVerified: boolean
  nestedSurfaceColor: string
  nestedBorderColor: string
  surfaceBorderColor: string
  elevatedSurfaceColor: string
  onImageError: () => void
  onOpenEdit: () => void
  onOpenSettings: () => void
}) {
  return (
    <>
      <View
        className="overflow-hidden"
        style={{
          backgroundColor: theme.secondary,
        }}
      >
        <View
          className="absolute -right-12 top-8 h-40 w-40 rounded-full"
          style={{ backgroundColor: withOpacity(theme.primary, 0.15) }}
        />
        <View
          className="absolute -left-10 bottom-0 h-32 w-32 rounded-full"
          style={{ backgroundColor: withOpacity(theme.accent, 0.12) }}
        />

        <View className="flex-row items-center justify-between px-4 pt-2">
          <View
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: withOpacity(theme.card, 0.82) }}
          >
            <Text className="text-[10px] font-black uppercase tracking-[1.2px] text-foreground">
              Reviewer Profile
            </Text>
          </View>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: withOpacity(theme.card, 0.78) }}
            onPress={onOpenSettings}
          >
            <Settings size={18} color={theme.foreground} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View className="px-4 pb-20 pt-6">
          <Text className="text-[30px] font-black leading-8 text-foreground">
            A polished study identity,
            {"\n"}built for consistency.
          </Text>
          <Text className="mt-2 max-w-[320px] text-[13px] leading-5 text-muted-foreground">
            Shape how you appear across progress, achievements, and community
            spaces with a cleaner, calmer profile.
          </Text>
        </View>
      </View>

      <View className="px-4" style={{ marginTop: -72 }}>
        <View
          className="rounded-[34px] border px-4 pb-4 pt-5"
          style={{
            borderColor: surfaceBorderColor,
            backgroundColor: elevatedSurfaceColor,
            shadowColor: "#000000",
            shadowOpacity: isDark ? 0.24 : 0.08,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 14 },
            elevation: isDark ? 10 : 4,
          }}
        >
          <View className="flex-row items-start gap-4">
            <View className="relative">
              <View
                className="overflow-hidden rounded-full border-4"
                style={{ borderColor: theme.background }}
              >
                {avatarSource && !imageFailed ? (
                  <Image
                    source={{ uri: avatarSource }}
                    style={{ width: 96, height: 96 }}
                    resizeMode="cover"
                    onError={onImageError}
                  />
                ) : (
                  <View
                    className="items-center justify-center bg-primary"
                    style={{ width: 96, height: 96 }}
                  >
                    <Text className="text-3xl font-black text-primary-foreground">
                      {initials}
                    </Text>
                  </View>
                )}
              </View>
              <Pressable
                className="absolute -bottom-1 -right-1 h-10 w-10 items-center justify-center rounded-full border-2 bg-primary"
                style={{ borderColor: theme.background }}
                onPress={onOpenEdit}
              >
                <Camera
                  size={14}
                  color={theme.primaryForeground}
                  strokeWidth={2.4}
                />
              </Pressable>
            </View>

            <View className="flex-1 gap-1.5">
              <View
                className="self-start rounded-full px-3 py-1.5"
                style={{ backgroundColor: withOpacity(theme.primary, 0.12) }}
              >
                <Text className="text-[10px] font-black uppercase tracking-[1.1px] text-primary">
                  {profile?.isPremium ? "Premium Member" : "Active Learner"}
                </Text>
              </View>
              <Text className="text-[24px] font-black text-card-foreground">
                {displayName}
              </Text>
              <Text className="text-[13px] text-muted-foreground">
                {username}
              </Text>
              <Text className="text-[12px] text-muted-foreground">
                Member since {memberSince}
              </Text>
            </View>
          </View>

          <View
            className="mt-4 rounded-[24px] border px-4 py-4"
            style={{
              borderColor: nestedBorderColor,
              backgroundColor: nestedSurfaceColor,
            }}
          >
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-[11px] font-black uppercase tracking-[1.2px] text-primary">
                  Profile Completion
                </Text>
                <Text className="mt-1 text-[22px] font-black text-card-foreground">
                  {profileCompletion}%
                </Text>
                <Text className="text-[12px] leading-5 text-muted-foreground">
                  Keep your account ready for achievements, leaderboards, and
                  community recognition.
                </Text>
              </View>
              <View className="items-end gap-1.5">
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                  Status
                </Text>
                <Text
                  className="text-[13px] font-black"
                  style={{ color: emailVerified ? theme.success : theme.warning }}
                >
                  {emailVerified ? "Verified" : "Needs verification"}
                </Text>
              </View>
            </View>

            <View
              className="mt-3 h-3 overflow-hidden rounded-full"
              style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
            >
              <View
                className="h-full rounded-full"
                style={{
                  width: `${profileCompletion}%`,
                  backgroundColor: theme.primary,
                }}
              />
            </View>
          </View>

          <View className="mt-4 flex-row gap-2.5">
            <ProfileSummaryCard
              label="Plan"
              value={profile?.isPremium ? "Pro" : "Free"}
              helper={
                profile?.isPremium ? "Reviewer access" : "Upgrade anytime"
              }
              backgroundColor={nestedSurfaceColor}
              borderColor={nestedBorderColor}
            />
            <ProfileSummaryCard
              label="Email"
              value={emailVerified ? "Verified" : "Pending"}
              helper={emailVerified ? "Trusted account" : "Needs action"}
              backgroundColor={nestedSurfaceColor}
              borderColor={nestedBorderColor}
            />
            <ProfileSummaryCard
              label="Profile"
              value={`${profileCompletion}%`}
              helper="Profile strength"
              backgroundColor={nestedSurfaceColor}
              borderColor={nestedBorderColor}
            />
          </View>

          <View className="mt-4 flex-row gap-2.5">
            <Button className="h-11 flex-1 rounded-2xl" onPress={onOpenEdit}>
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
              className="h-11 flex-1 rounded-2xl"
              onPress={onOpenSettings}
            >
              <Settings size={15} color={theme.primary} strokeWidth={2.2} />
              <Text className="text-[13px] font-bold">Settings</Text>
            </Button>
          </View>
        </View>
      </View>
    </>
  )
})

export const ProfileTabRail = memo(function ProfileTabRail({
  theme,
  activeTab,
  tabRailColor,
  nestedBorderColor,
  onChangeTab,
}: {
  theme: ThemePalette
  activeTab: ProfileTab
  tabRailColor: string
  nestedBorderColor: string
  onChangeTab: (tab: ProfileTab) => void
}) {
  return (
    <View className="mt-4 px-4">
      <View
        className="flex-row gap-2 rounded-[24px] border px-2 py-2"
        style={{
          borderColor: nestedBorderColor,
          backgroundColor: tabRailColor,
        }}
      >
        <TabButton
          label="Details"
          active={activeTab === "details"}
          onPress={() => onChangeTab("details")}
          theme={theme}
        />
        <TabButton
          label="Activity"
          active={activeTab === "activity"}
          onPress={() => onChangeTab("activity")}
          theme={theme}
        />
        <TabButton
          label="Performance"
          active={activeTab === "performance"}
          onPress={() => onChangeTab("performance")}
          theme={theme}
        />
      </View>
    </View>
  )
})

export const ProfileDetailsTab = memo(function ProfileDetailsTab({
  theme,
  detailCards,
  emailVerified,
  isSendingVerification,
  surfaceBorderColor,
  elevatedSurfaceColor,
  nestedBorderColor,
  nestedSurfaceColor,
  onSendVerification,
}: {
  theme: ThemePalette
  detailCards: ProfileDetailCard[]
  emailVerified: boolean
  isSendingVerification: boolean
  surfaceBorderColor: string
  elevatedSurfaceColor: string
  nestedBorderColor: string
  nestedSurfaceColor: string
  onSendVerification: () => void
}) {
  return (
    <>
      <View
        className="rounded-[26px] border px-4 py-4"
        style={{
          borderColor: surfaceBorderColor,
          backgroundColor: elevatedSurfaceColor,
        }}
      >
        <Text className="text-[11px] font-black uppercase tracking-[1.3px] text-primary">
          Profile Overview
        </Text>
        <Text className="mt-1 text-[16px] font-black text-card-foreground">
          Reviewer identity details
        </Text>
        <Text className="mt-1 text-[12px] leading-5 text-muted-foreground">
          Keep your learner profile complete so achievements, progress, and
          community participation feel consistent across the app.
        </Text>

        <View className="mt-3 gap-2.5">
          {detailCards.map((item) => (
            <View
              key={item.key}
              className="flex-row items-center gap-3 rounded-2xl border px-3.5 py-3"
              style={{
                borderColor: nestedBorderColor,
                backgroundColor: nestedSurfaceColor,
              }}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
              >
                {item.icon}
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[1.1px] text-muted-foreground">
                  {item.label}
                </Text>
                <Text className="mt-0.5 text-[14px] font-semibold text-card-foreground">
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View
        className="flex-row items-center gap-3 rounded-[26px] px-4 py-4"
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
              onPress={onSendVerification}
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
  )
})

export const ProfileActivityTab = memo(function ProfileActivityTab({
  theme,
  activityFeed,
  recentActivityItems,
  isLoading,
  errorMessage,
  surfaceBorderColor,
  elevatedSurfaceColor,
  nestedBorderColor,
  nestedSurfaceColor,
  onLoadMoreAchievements,
  onLoadMoreQuizData,
  onLoadMoreLearningData,
  onViewDashboard,
  formatActivityDate,
}: {
  theme: ThemePalette
  activityFeed: UserActivityFeed | null
  recentActivityItems: ProfileRecentActivityItem[]
  isLoading: boolean
  errorMessage: string | null
  surfaceBorderColor: string
  elevatedSurfaceColor: string
  nestedBorderColor: string
  nestedSurfaceColor: string
  onLoadMoreAchievements: () => void
  onLoadMoreQuizData: () => void
  onLoadMoreLearningData: () => void
  onViewDashboard: () => void
  formatActivityDate: (value: string | null | undefined) => string
}) {
  return (
    <View className="gap-3 py-1">
      {isLoading ? (
        <View className="gap-2.5">
          <View
            className="h-20 rounded-2xl border"
            style={{
              backgroundColor: withOpacity(theme.primary, 0.08),
              borderColor: nestedBorderColor,
            }}
          />
          <View
            className="h-24 rounded-2xl border"
            style={{
              backgroundColor: withOpacity(theme.primary, 0.08),
              borderColor: nestedBorderColor,
            }}
          />
          <View
            className="h-32 rounded-2xl border"
            style={{
              backgroundColor: withOpacity(theme.primary, 0.08),
              borderColor: nestedBorderColor,
            }}
          />
        </View>
      ) : errorMessage ? (
        <View
          className="items-center gap-2 rounded-2xl border px-4 py-4"
          style={{
            borderColor: surfaceBorderColor,
            backgroundColor: elevatedSurfaceColor,
          }}
        >
          <Text className="text-[14px] font-bold text-foreground">
            Activity unavailable
          </Text>
          <Text className="text-center text-[12px] leading-5 text-muted-foreground">
            {errorMessage}
          </Text>
        </View>
      ) : activityFeed ? (
        <>
          <View
            className="rounded-2xl border px-3.5 py-3.5"
            style={{
              borderColor: surfaceBorderColor,
              backgroundColor: elevatedSurfaceColor,
            }}
          >
            <Text className="text-[11px] font-black uppercase tracking-[1.3px] text-primary">
              Activity Overview
            </Text>
            <View className="mt-2 flex-row gap-2.5">
              <View
                className="flex-1 rounded-xl border px-3 py-2.5"
                style={{
                  borderColor: nestedBorderColor,
                  backgroundColor: nestedSurfaceColor,
                }}
              >
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
              <View
                className="flex-1 rounded-xl border px-3 py-2.5"
                style={{
                  borderColor: nestedBorderColor,
                  backgroundColor: nestedSurfaceColor,
                }}
              >
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
            <View
              className="mt-2 rounded-xl border px-3 py-2.5"
              style={{
                borderColor: nestedBorderColor,
                backgroundColor: nestedSurfaceColor,
              }}
            >
              <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-muted-foreground">
                Completed
              </Text>
              <Text className="mt-1 text-[13px] font-semibold text-card-foreground">
                {activityFeed.completedQuizzes} quizzes ·{" "}
                {activityFeed.completedMaterials} materials
              </Text>
              <Text className="mt-0.5 text-[11px] text-muted-foreground">
                Last active {formatActivityDate(activityFeed.lastActiveAt)}
              </Text>
            </View>
          </View>

          <View
            className="rounded-2xl border px-3.5 py-3.5"
            style={{
              borderColor: surfaceBorderColor,
              backgroundColor: elevatedSurfaceColor,
            }}
          >
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
                        index === activityFeed.achievements.length - 1 ? 0 : 1,
                      borderBottomColor: nestedBorderColor,
                    }}
                  >
                    <View className="flex-row items-center gap-2">
                      <View
                        className="h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: withOpacity(badgeTone, 0.15),
                        }}
                      >
                        {renderAchievementBadgeIcon(badgeMeta.icon, badgeTone)}
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
                onPress={onLoadMoreAchievements}
              >
                <Text className="text-[11px] font-bold">
                  Load more achievements
                </Text>
              </Button>
            ) : null}
          </View>

          <View
            className="rounded-2xl border px-3.5 py-3.5"
            style={{
              borderColor: surfaceBorderColor,
              backgroundColor: elevatedSurfaceColor,
            }}
          >
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
                    borderBottomColor: nestedBorderColor,
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
                onPress={onLoadMoreQuizData}
              >
                <Text className="text-[11px] font-bold">More Quiz Data</Text>
              </Button>
            ) : null}

            {activityFeed.learningHistoryHasMore ? (
              <Button
                variant="outline"
                className="h-10 flex-1 rounded-xl"
                onPress={onLoadMoreLearningData}
              >
                <Text className="text-[11px] font-bold">
                  More Learning Data
                </Text>
              </Button>
            ) : null}
          </View>
        </>
      ) : null}

      <Button className="mt-1 h-11 rounded-xl px-6" onPress={onViewDashboard}>
        <Text className="text-[13px] font-bold text-primary-foreground">
          View Dashboard
        </Text>
      </Button>
    </View>
  )
})

export const ProfilePerformanceTab = memo(function ProfilePerformanceTab({
  theme,
  stats,
  isLoading,
  errorMessage,
  surfaceBorderColor,
  elevatedSurfaceColor,
  nestedBorderColor,
  onViewDashboard,
}: {
  theme: ThemePalette
  stats: OverallPerformanceStats | null | undefined
  isLoading: boolean
  errorMessage: string | null
  surfaceBorderColor: string
  elevatedSurfaceColor: string
  nestedBorderColor: string
  onViewDashboard: () => void
}) {
  return (
    <View className="gap-3 py-1">
      {isLoading ? (
        <View className="gap-2.5">
          <View
            className="h-40 rounded-2xl border"
            style={{
              backgroundColor: withOpacity(theme.primary, 0.08),
              borderColor: nestedBorderColor,
            }}
          />
          <View
            className="h-32 rounded-2xl border"
            style={{
              backgroundColor: withOpacity(theme.primary, 0.08),
              borderColor: nestedBorderColor,
            }}
          />
        </View>
      ) : errorMessage ? (
        <View
          className="items-center gap-2 rounded-2xl border px-4 py-4"
          style={{
            borderColor: surfaceBorderColor,
            backgroundColor: elevatedSurfaceColor,
          }}
        >
          <Text className="text-[14px] font-bold text-foreground">
            Performance unavailable
          </Text>
          <Text className="text-center text-[12px] leading-5 text-muted-foreground">
            {errorMessage}
          </Text>
        </View>
      ) : stats ? (
        <OverallPerformanceSection stats={stats} theme={theme} />
      ) : null}

      <Button className="mt-1 h-11 rounded-xl px-6" onPress={onViewDashboard}>
        <Text className="text-[13px] font-bold text-primary-foreground">
          Full Dashboard
        </Text>
      </Button>
    </View>
  )
})
