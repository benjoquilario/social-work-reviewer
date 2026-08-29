import { memo } from "react"
import { View } from "react-native"

import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

/**
 * How far through the sitting they are.
 *
 * A single filled track rather than a percentage label: the denominator here
 * is the run length, and members read position far faster than they read
 * "43%".
 */

type SessionProgressProps = {
  position: number
  total: number
  answeredCount: number
}

export const SessionProgress = memo(function SessionProgress({
  position,
  total,
  answeredCount,
}: SessionProgressProps) {
  const theme = useThemePalette()
  const safeTotal = Math.max(total, 1)
  const percent = Math.min((position / safeTotal) * 100, 100)

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text variant="label">
          {position} / {total}
        </Text>
        <Text variant="label">{answeredCount} answered</Text>
      </View>

      <View
        className="h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: theme.muted }}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: position }}
      >
        <View
          className="h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: theme.primary }}
        />
      </View>
    </View>
  )
})
