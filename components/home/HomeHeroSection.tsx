import { memo } from "react"
import { Image } from "expo-image"
import BellRing from "lucide-react-native/icons/bell-ring"
import Flame from "lucide-react-native/icons/flame"
import Play from "lucide-react-native/icons/play"
import Target from "lucide-react-native/icons/target"
import { Pressable, View } from "react-native"

import type { ThemePalette } from "@/lib/home-types"
import { getBrandSurfacePalette } from "@/lib/theme"
import { BrandSurface } from "@/components/ui/brand-surface"
import { Text } from "@/components/ui/text"
import { CommunityAvatar } from "@/components/community/avatar"

const MASCOT = require("@/assets/images/happy-graduation.webp")

/** One inline fact under the goal — icon, then a single line of copy. */
function HeroFact({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: string
}) {
  const brand = getBrandSurfacePalette()

  return (
    <View className="flex-row items-center gap-1.5">
      {icon}
      <Text
        variant="caption"
        style={{ color: brand.mutedForeground }}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  )
}

/**
 * The hero answers one question — "what should I do right now?" — and it
 * answers it with today's numbers.
 *
 * It used to lead with a slogan and two lifetime metrics, both of which read
 * `0` on a new account and neither of which suggested an action. Today's
 * session count is the smallest unit a learner can actually move, so that is
 * the headline; streak and average score demote to one supporting line, and
 * the call to action changes wording with how far along the day is.
 */
export const HomeHeroSection = memo(function HomeHeroSection({
  theme,
  firstName,
  initials,
  profileAvatarUrl,
  hasDailyReminder,
  isNotificationUpdating,
  onPressNotification,
  onPressPrimaryAction,
  dailyCount,
  dailyTarget,
  dailyProgress,
  effectiveDayStreak,
  effectiveWeeklyAverage,
}: {
  theme: ThemePalette
  firstName: string
  initials: string
  profileAvatarUrl: string | null
  hasDailyReminder: boolean
  isNotificationUpdating: boolean
  onPressNotification: () => void
  onPressPrimaryAction: () => void
  dailyCount: number
  dailyTarget: number
  dailyProgress: number
  effectiveDayStreak: number
  effectiveWeeklyAverage: number
}) {
  const brand = getBrandSurfacePalette()
  const goalReached = dailyCount >= dailyTarget
  const actionLabel = goalReached
    ? "Goal met — go again"
    : dailyCount > 0
      ? "Keep going"
      : "Start today's session"

  return (
    <BrandSurface className="gap-4 p-5">
      {/* Greeting */}
      <View className="flex-row items-center gap-3">
        <CommunityAvatar
          label={initials}
          sourceUri={profileAvatarUrl}
          theme={theme}
          size="lg"
          tone="brand"
        />

        <View className="flex-1 gap-0.5">
          <Text variant="label" style={{ color: brand.mutedForeground }}>
            Welcome back
          </Text>
          <Text className="text-lg font-black leading-6" numberOfLines={1}>
            {firstName}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            hasDailyReminder
              ? "Turn off daily study reminder"
              : "Turn on daily study reminder"
          }
          accessibilityState={{ selected: hasDailyReminder }}
          className="h-11 w-11 items-center justify-center rounded-lg border"
          style={{
            backgroundColor: brand.overlayStrong,
            borderColor: brand.border,
            opacity: isNotificationUpdating ? 0.6 : 1,
          }}
          onPress={onPressNotification}
        >
          <BellRing size={18} color={brand.foreground} />
          {hasDailyReminder ? (
            <View
              className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: brand.accent }}
            />
          ) : null}
        </Pressable>
      </View>

      {/* Today's goal, with the mascot alongside it */}
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-2.5">
          <View className="gap-0.5">
            <Text variant="label" style={{ color: brand.mutedForeground }}>
              Today&apos;s goal
            </Text>
            <Text className="text-2xl font-black leading-8">
              {dailyCount} of {dailyTarget} sessions
            </Text>
          </View>

          <View
            className="h-2 overflow-hidden rounded-full"
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: dailyTarget, now: dailyCount }}
            style={{ backgroundColor: brand.overlaySoft }}
          >
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, Math.min(100, dailyProgress))}%`,
                backgroundColor: goalReached ? brand.accent : brand.glow,
              }}
            />
          </View>
        </View>

        <Image
          source={MASCOT}
          style={{ width: 84, height: 84 }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      </View>

      {/* Supporting facts */}
      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
        <HeroFact icon={<Flame size={13} color={brand.accent} />}>
          {`${effectiveDayStreak}-day streak`}
        </HeroFact>
        <HeroFact icon={<Target size={13} color={brand.glow} />}>
          {`${effectiveWeeklyAverage}% avg score`}
        </HeroFact>
      </View>

      {/* Primary action */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        className="h-12 flex-row items-center justify-center gap-2 rounded-md bg-white active:opacity-90"
        onPress={onPressPrimaryAction}
      >
        <Play size={15} color={brand.gradientMid} fill={brand.gradientMid} />
        <Text className="text-base font-extrabold text-brand-navy">
          {actionLabel}
        </Text>
      </Pressable>
    </BrandSurface>
  )
})
