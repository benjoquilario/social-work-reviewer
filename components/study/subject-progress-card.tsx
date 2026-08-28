import { memo } from "react"
import { Lock, type LucideIcon } from "lucide-react-native"
import { Pressable, View } from "react-native"

import type { ThemePalette } from "@/lib/theme"
import { withOpacity } from "@/lib/theme"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Text } from "@/components/ui/text"


type SubjectProgressCardProps = {
  theme: ThemePalette
  Icon: LucideIcon
  title: string
  completed: number
  total: number
  percent: number
  /** "Materials" / "Topics" — whatever the counts actually measure. */
  unitLabel: string
  color: string
  isLocked: boolean
  onPress: () => void
}

/**
 * One subject card in a horizontal progress rail — Home's "Continue
 * Studying" and Profile's "Subjects Progress" are the same card.
 *
 * Fixed 148px width so the next card is always partly visible at the screen
 * edge — the cut-off card is what tells a learner the row scrolls. A row of
 * cards that happens to end flush looks like a complete grid and never gets
 * swiped.
 */
export const SubjectProgressCard = memo(function SubjectProgressCard({
  theme,
  Icon,
  title,
  completed,
  total,
  percent,
  unitLabel,
  color,
  isLocked,
  onPress,
}: SubjectProgressCardProps) {
  const safePercent = Math.min(Math.max(Math.round(percent), 0), 100)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        isLocked
          ? `${title}, premium subject. Tap to unlock.`
          : `${title}, ${safePercent} percent complete, ${completed} of ${total} ${unitLabel.toLowerCase()}`
      }
      onPress={onPress}
      className="w-[148px] gap-2.5 rounded-xl border border-border/80 bg-card p-3.5 active:opacity-85"
    >
      <View className="flex-row items-start justify-between">
        <View
          className="h-9 w-9 items-center justify-center rounded-md"
          style={{ backgroundColor: withOpacity(color, 0.12) }}
        >
          <Icon size={18} color={color} strokeWidth={2.3} />
        </View>

        {isLocked ? (
          <Lock size={13} color={theme.mutedForeground} strokeWidth={2.4} />
        ) : null}
      </View>

      <Text
        variant="callout"
        numberOfLines={2}
        className="font-bold text-card-foreground"
      >
        {title}
      </Text>

      <View className="flex-row items-center gap-2">
        <ProgressBar
          className="flex-1"
          size="sm"
          value={safePercent}
          // The label is already on the Pressable; announcing it twice makes
          // the card tedious to hear.
          label={undefined}
        />
        <Text className="text-[10px] font-bold text-muted-foreground">
          {safePercent}%
        </Text>
      </View>

      <Text variant="caption" className="text-[10px]">
        {completed} / {total} {unitLabel}
      </Text>
    </Pressable>
  )
})
