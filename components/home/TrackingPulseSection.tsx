import { memo, useEffect, useMemo, useState } from "react"
import { CalendarDays } from "lucide-react-native"
import { Pressable, View } from "react-native"

import type { ThemePalette } from "@/lib/home-types"
import {
  buildWeeklyCalendarSummary,
  DAILY_ACTIVITY_TARGET,
} from "@/lib/home-utils"
import type { UserActivityFeed } from "@/lib/progress"
import { getReviewerFeaturePalette, THEME } from "@/lib/theme"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

export const TrackingPulseSection = memo(function TrackingPulseSection({
  theme,
  isSignedIn,
  isLoading,
  errorMessage,
  activityFeed,
  effectiveDayStreak,
  effectiveWeeklyAverage,
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
  activityFeed: UserActivityFeed | null
  effectiveDayStreak: number
  effectiveWeeklyAverage: number
  effectiveDailyTrackingCount: number
  effectiveWeeklyActiveDays: number
  dailyTrackingProgress: number
  weeklyTrackingProgress: number
  weeklyTotalActivities: number
}) {
  const featurePalette = getReviewerFeaturePalette(
    theme === THEME.dark ? "dark" : "light"
  )
  const weeklyCalendar = useMemo(
    () => buildWeeklyCalendarSummary(activityFeed),
    [activityFeed]
  )
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(
    weeklyCalendar.defaultSelectedDayKey
  )

  useEffect(() => {
    if (
      !selectedDayKey ||
      !weeklyCalendar.days.some((day) => day.key === selectedDayKey)
    ) {
      setSelectedDayKey(weeklyCalendar.defaultSelectedDayKey)
    }
  }, [
    selectedDayKey,
    weeklyCalendar.days,
    weeklyCalendar.defaultSelectedDayKey,
  ])

  const selectedDay =
    weeklyCalendar.days.find((day) => day.key === selectedDayKey) ??
    weeklyCalendar.days[weeklyCalendar.days.length - 1]

  const selectedDayGoalProgress = Math.min(
    100,
    Math.round(((selectedDay?.totalCount ?? 0) / DAILY_ACTIVITY_TARGET) * 100)
  )

  return (
    <View className="gap-2.5">
      <View className="gap-0.5">
        <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
          Weekly Review
        </Text>
        {/* <Text className="text-[17px] font-extrabold text-foreground">
          Calendar And Consistency
        </Text> */}
        <Text className="text-[12px] leading-5 text-muted-foreground">
          Tap a day to inspect your review rhythm across the last seven days.
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
          <Skeleton className="h-64 rounded-[30px]" />
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
        <Card>
          <CardContent className="gap-4 px-4 py-4">
            <View
              className="absolute -right-10 -top-12 h-40 w-40 rounded-full"
              style={{ backgroundColor: featurePalette.primaryGlow }}
            />

            <View className="flex-row items-start justify-between gap-3">
              <View className="gap-1">
                <Text className="text-[16px] font-black">Weekly calendar</Text>
                <Text className="text-[12px]">
                  Tap a day to review sessions
                </Text>
              </View>

              <View
                className="flex-row items-center gap-2 rounded-full px-3 py-2"
                style={{
                  backgroundColor: featurePalette.overlayStrong,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <CalendarDays size={14} color={featurePalette.primary} />
                <Text className="text-[11px] font-bold">Summary</Text>
              </View>
            </View>

            <View className="mt-4 flex-row items-center justify-between gap-2">
              {weeklyCalendar.days.map((day, index) => {
                const isActive = selectedDay?.key === day.key
                const hasActivity = day.totalCount > 0
                const accentColor =
                  featurePalette.chartPalette[
                    index % featurePalette.chartPalette.length
                  ]

                return (
                  <Pressable
                    key={day.key}
                    className="flex-1 items-center rounded-[10px] px-2 py-2"
                    style={{
                      backgroundColor: isActive
                        ? featurePalette.activeSurface
                        : featurePalette.inactiveSurface,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                    onPress={() => setSelectedDayKey(day.key)}
                  >
                    <Text className="text-[10px] font-bold uppercase">
                      {day.label}
                    </Text>
                    <View
                      className="mt-2 h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: hasActivity
                          ? accentColor
                          : featurePalette.inactiveDot,
                      }}
                    />
                  </Pressable>
                )
              })}
            </View>

            <View
              className="mt-4 rounded-[24px] px-4 py-4"
              style={{
                backgroundColor: featurePalette.overlaySoft,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <Text className="text-[17px] font-black">
                    {selectedDay?.label}, {selectedDay?.dayNumber}
                  </Text>
                  <Text
                    className="text-[12px]"
                    style={{ color: featurePalette.mutedForeground }}
                  >
                    {selectedDay?.totalCount ?? 0} review sessions tracked
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-[18px] font-black">
                    {effectiveWeeklyAverage}%
                  </Text>
                  <Text className="text-[10px] uppercase tracking-[0.9px]">
                    weekly avg
                  </Text>
                </View>
              </View>

              <View className="mt-3 flex-row flex-wrap gap-3">
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: featurePalette.primary }}
                  />
                  <Text className="text-[12px]">
                    Quiz {selectedDay?.quizCount ?? 0}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: featurePalette.chart2 }}
                  />
                  <Text className="text-[12px]">
                    Learn {selectedDay?.learningCount ?? 0}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: featurePalette.chart3 }}
                  />
                  <Text className="text-[12px]">
                    Streak {effectiveDayStreak}
                  </Text>
                </View>
              </View>

              <View className="mt-4 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-bold">Weekly goal</Text>
                  <Text className="text-[12px] font-black">
                    {weeklyTrackingProgress}%
                  </Text>
                </View>
                <View
                  className="h-3 overflow-hidden rounded-full"
                  style={{ backgroundColor: featurePalette.overlayStrong }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(weeklyTrackingProgress, selectedDayGoalProgress)}%`,
                      backgroundColor: featurePalette.primary,
                    }}
                  />
                </View>
                <Text className="text-[11px] leading-5">
                  {effectiveWeeklyActiveDays}/7 active days •{" "}
                  {effectiveDailyTrackingCount}/{DAILY_ACTIVITY_TARGET} sessions
                  today • {weeklyTotalActivities} total activities this week
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>
      )}
    </View>
  )
})
