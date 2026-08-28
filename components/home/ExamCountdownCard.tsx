import { memo } from "react"
import { CalendarDays, ChevronRight, Sparkles } from "lucide-react-native"
import { Image, Pressable, View } from "react-native"

import type { ExamCountdown } from "@/lib/exam-countdown"
import type { ThemePalette } from "@/lib/theme"
import { toSvgColor, withOpacity } from "@/lib/theme"
import { Text } from "@/components/ui/text"

const GRADUATION_ART = require("../../assets/images/happy-graduation.png")

type ExamCountdownCardProps = {
  theme: ThemePalette
  /** null until the learner sets a date — the card then prompts for one. */
  countdown: ExamCountdown | null
  onPress: () => void
}

/** Shared shell so the empty and filled states can't drift apart. */
function CountdownSurface({
  children,
  accessibilityLabel,
  onPress,
}: {
  children: React.ReactNode
  accessibilityLabel: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="overflow-hidden rounded-2xl border border-primary/15 bg-primary/[0.07] active:opacity-90"
    >
      {children}
    </Pressable>
  )
}

/**
 * The countdown to exam day — the screen's emotional anchor.
 *
 * The number is the loudest thing on Home by design: a learner opening the app
 * should feel the deadline before they read anything else. Everything around
 * it stays quiet so the digits carry the weight.
 */
export const ExamCountdownCard = memo(function ExamCountdownCard({
  theme,
  countdown,
  onPress,
}: ExamCountdownCardProps) {
  if (!countdown) {
    return (
      <CountdownSurface
        accessibilityLabel="Set your exam date"
        onPress={onPress}
      >
        <View className="flex-row items-center gap-3.5 px-4 py-4">
          <View className="h-11 w-11 items-center justify-center rounded-md bg-primary">
            <CalendarDays
              size={20}
              color={theme.primaryForeground}
              strokeWidth={2.3}
            />
          </View>

          <View className="flex-1 gap-0.5">
            <Text variant="subheading">Set your exam date</Text>
            <Text variant="caption">
              Track the countdown to your board exam.
            </Text>
          </View>

          <ChevronRight
            size={20}
            color={theme.mutedForeground}
            strokeWidth={2.2}
          />
        </View>
      </CountdownSurface>
    )
  }

  return (
    <CountdownSurface
      accessibilityLabel={`${countdown.daysLabel} ${countdown.daysCaption}. Exam on ${countdown.scheduleLabel}. Tap to change the date.`}
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className="flex-1 gap-2 py-4 pl-4">
          <View className="flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-md bg-primary">
              <CalendarDays
                size={17}
                color={theme.primaryForeground}
                strokeWidth={2.4}
              />
            </View>
            <Text variant="caption" className="text-foreground/70">
              Days until your exam
            </Text>
          </View>

          {/* Baseline-aligned so the unit reads as part of the number rather
              than a caption stacked under it. */}
          <View className="flex-row items-baseline gap-2">
            <Text className="text-5xl font-extrabold leading-[52px] text-primary">
              {countdown.daysLabel}
            </Text>
            <Text variant="subheading" className="text-foreground/80">
              {countdown.daysCaption}
            </Text>
          </View>

          <Text variant="caption">{countdown.scheduleLabel}</Text>
        </View>

        <View className="relative h-[120px] w-[124px] items-center justify-center">
          <Sparkles
            size={16}
            // Lucide renders through react-native-svg, whose colour parser
            // predates CSS Color Level 4 and cannot read the space-separated
            // `hsl(H S% L% / A)` these tokens use. `toSvgColor` converts to the
            // legacy comma form.
            color={toSvgColor(withOpacity(theme.primary, 0.55))}
            strokeWidth={2.4}
            style={{ position: "absolute", top: 14, left: 4 }}
          />
          <Image
            source={GRADUATION_ART}
            resizeMode="contain"
            accessible={false}
            className="h-[104px] w-[112px]"
          />
        </View>
      </View>
    </CountdownSurface>
  )
})
