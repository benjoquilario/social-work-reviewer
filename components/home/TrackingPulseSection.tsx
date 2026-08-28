import { memo, useEffect, useMemo, useState } from "react"
import { Pressable, View } from "react-native"

import type { WeeklyCalendarDay } from "@/lib/home-types"
import {
  buildWeeklyCalendarSummary,
  DAILY_ACTIVITY_TARGET,
} from "@/lib/home-utils"
import type { UserActivityFeed } from "@/lib/progress"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { SectionHeader } from "@/components/ui/section-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

const BAR_HEIGHT = 40

/**
 * One day in the week strip. The bar's height encodes how much was reviewed
 * that day against the daily target, so a glance reads as a bar chart rather
 * than the on/off dot this used to show.
 */
const WeekDayCell = memo(function WeekDayCell({
  day,
  isSelected,
  onSelect,
}: {
  day: WeeklyCalendarDay
  isSelected: boolean
  onSelect: (key: string) => void
}) {
  const fill = Math.min(1, day.totalCount / DAILY_ACTIVITY_TARGET)
  // Anything tracked keeps a visible stub, so "a little" never reads as "none".
  const fillHeight = day.totalCount > 0 ? Math.max(6, BAR_HEIGHT * fill) : 0

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${day.label} ${day.dayNumber}, ${day.totalCount} sessions`}
      className={cn(
        "flex-1 items-center gap-2 rounded-md py-2",
        isSelected && "bg-primary/10"
      )}
      onPress={() => onSelect(day.key)}
    >
      <View
        className="w-2 justify-end overflow-hidden rounded-full bg-muted"
        style={{ height: BAR_HEIGHT }}
      >
        {fillHeight > 0 ? (
          <View
            className={cn(
              "rounded-full",
              isSelected ? "bg-primary" : "bg-primary/45"
            )}
            style={{ height: fillHeight }}
          />
        ) : null}
      </View>

      <Text
        variant="label"
        className={cn(
          isSelected && "text-primary",
          !isSelected && day.isToday && "text-foreground"
        )}
      >
        {day.label}
      </Text>
    </Pressable>
  )
})

/**
 * The week at a glance: goal, then the seven days behind it.
 *
 * The previous version reported the same emptiness five different ways —
 * weekly average, sessions tracked, a quiz/learn/streak legend, a goal
 * percentage and an active-days line — so a new account rendered nine
 * separate zeros. One goal, one strip, one detail line.
 */
export const TrackingPulseSection = memo(function TrackingPulseSection({
  isSignedIn,
  isLoading,
  errorMessage,
  activityFeed,
  effectiveWeeklyActiveDays,
  weeklyTrackingProgress,
  weeklyTotalActivities,
}: {
  isSignedIn: boolean
  isLoading: boolean
  errorMessage: string | null
  activityFeed: UserActivityFeed | null
  effectiveWeeklyActiveDays: number
  weeklyTrackingProgress: number
  weeklyTotalActivities: number
}) {
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

  return (
    <View className="gap-3">
      <SectionHeader title="This week" />

      {!isSignedIn ? (
        <EmptyState
          title="Sign in to track progress"
          description="Streaks and weekly activity are shown for signed-in learners."
        />
      ) : isLoading ? (
        <Skeleton className="h-[210px] rounded-xl" />
      ) : errorMessage ? (
        <EmptyState
          tone="destructive"
          title="Tracking unavailable"
          description={errorMessage}
        />
      ) : (
        <Card>
          <CardContent className="gap-4">
            {/* Goal */}
            <View className="flex-row items-end justify-between gap-3">
              <View className="gap-0.5">
                <Text variant="label">Active days</Text>
                <View className="flex-row items-baseline gap-0.5">
                  <Text className="text-2xl font-black leading-7">
                    {effectiveWeeklyActiveDays}
                  </Text>
                  <Text className="text-base font-bold text-muted-foreground">
                    /7
                  </Text>
                </View>
              </View>

              <Text variant="caption">
                {weeklyTotalActivities}{" "}
                {weeklyTotalActivities === 1 ? "session" : "sessions"} logged
              </Text>
            </View>

            <View className="h-2 overflow-hidden rounded-full bg-muted">
              <View
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, weeklyTrackingProgress)}%` }}
              />
            </View>

            <View className="h-px bg-border" />

            {/* Week strip */}
            <View className="flex-row items-end justify-between gap-1">
              {weeklyCalendar.days.map((day) => (
                <WeekDayCell
                  key={day.key}
                  day={day}
                  isSelected={selectedDay?.key === day.key}
                  onSelect={setSelectedDayKey}
                />
              ))}
            </View>

            {selectedDay ? (
              <Text variant="caption" className="text-center">
                {selectedDay.label} {selectedDay.dayNumber} ·{" "}
                {selectedDay.quizCount} quiz · {selectedDay.learningCount} learn
              </Text>
            ) : null}
          </CardContent>
        </Card>
      )}
    </View>
  )
})
