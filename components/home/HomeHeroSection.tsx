import { memo } from "react"
import { Pressable, View } from "react-native"
import { Image } from "expo-image"
import { BellRing, Sparkles, Target } from "lucide-react-native"
import type { ThemePalette } from "@/lib/home-types"
import {
  getBorderColor,
  getReviewerFeaturePalette,
  THEME,
} from "@/lib/theme"
import { CommunityAvatar } from "@/components/community/avatar"
import { Text } from "@/components/ui/text"

export const HomeHeroSection = memo(function HomeHeroSection({
  theme,
  firstName,
  initials,
  profileAvatarUrl,
  hasDailyReminder,
  isNotificationUpdating,
  onPressNotification,
  effectiveDayStreak,
  effectiveWeeklyAverage,
  effectiveWeeklyActiveDays,
}: {
  theme: ThemePalette
  firstName: string
  initials: string
  profileAvatarUrl: string | null
  hasDailyReminder: boolean
  isNotificationUpdating: boolean
  onPressNotification: () => void
  effectiveDayStreak: number
  effectiveWeeklyAverage: number
  effectiveWeeklyActiveDays: number
}) {
  const featurePalette = getReviewerFeaturePalette(
    theme === THEME.dark ? "dark" : "light"
  )

  return (
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
            <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-primary">
              Welcome Back
            </Text>
            <Text className="text-[16px] font-black text-foreground">
              Hi, {firstName}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          className="h-11 w-11 items-center justify-center rounded-2xl border"
          style={{
            borderColor: getBorderColor(theme),
            backgroundColor: theme.card,
            opacity: isNotificationUpdating ? 0.7 : 1,
          }}
          onPress={onPressNotification}
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

      <View>
        <View
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full"
          style={{ backgroundColor: featurePalette.primaryGlow }}
        />
        <View
          className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full"
          style={{ backgroundColor: featurePalette.accentGlow }}
        />

        <View className="flex-row items-center justify-between gap-4">
          <View className="max-w-[58%] gap-3">
            <View
              className="self-start rounded-full px-3 py-1.5"
              style={{ backgroundColor: featurePalette.overlayStrong }}
            >
              <Text className="text-[10px] font-bold uppercase tracking-[1.3px]">
                Social Work Reviewer
              </Text>
            </View>
            <View className="gap-2">
              <Text className="text-[18px] font-extrabold leading-[30px]">
                Build momentum with smarter weekly review.
              </Text>
            </View>
          </View>

          <Image
            source={require("@/assets/images/happy-graduation.png")}
            style={{ width: 134, height: 134 }}
            contentFit="contain"
          />
        </View>

        <View className="mt-4 flex-row gap-2.5">
          <View
            className="flex-1 rounded-[22px] px-3.5 py-3"
            style={{
              backgroundColor: featurePalette.overlayStrong,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View className="flex-row items-center gap-2">
              <Sparkles size={14} color={featurePalette.primary} />
              <Text
                className="text-[10px] font-bold uppercase tracking-[1px]"
                style={{ color: featurePalette.mutedForeground }}
              >
                Streak
              </Text>
            </View>
            <Text className="mt-2 text-[20px] font-black">
              {effectiveDayStreak}
            </Text>
            <Text className="text-[11px]">days in motion</Text>
          </View>

          <View
            className="flex-1 rounded-[22px] px-3.5 py-3"
            style={{
              backgroundColor: featurePalette.overlayStrong,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View className="flex-row items-center gap-2">
              <Target size={14} color={featurePalette.chart3} />
              <Text className="text-[10px] font-bold uppercase tracking-[1px]">
                Weekly
              </Text>
            </View>
            <Text className="mt-2 text-[22px] font-black">
              {effectiveWeeklyAverage}%
            </Text>
            <Text
              className="text-[11px]"
              style={{ color: featurePalette.mutedForeground }}
            >
              {effectiveWeeklyActiveDays}/7 active days
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
})
