import { memo } from "react"
import type { LucideIcon } from "lucide-react-native"
import { View } from "react-native"

import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

export type MetricCellData = {
  key: string
  Icon: LucideIcon
  /** Resolved palette colour for the icon. */
  color: string
  value: string
  label: string
}

/**
 * One cell: icon, value, label.
 *
 * Deliberately not `StatTile` — that primitive is a bordered card for a
 * standalone metric, whereas these sit inside a card and read as one group.
 * Giving each its own border would fence them off and add vertical rules the
 * eye has to cross.
 *
 * The value outranks the label in size and weight. A learner scanning this row
 * wants "1,248", not "Questions Solved".
 */
export const MetricCell = memo(function MetricCell({
  Icon,
  color,
  value,
  label,
}: Omit<MetricCellData, "key">) {
  return (
    <View className="flex-1 items-center gap-1">
      <Icon size={17} color={color} strokeWidth={2.3} />
      <Text className="text-base font-extrabold text-foreground">{value}</Text>
      <Text
        variant="caption"
        numberOfLines={2}
        className="text-center text-[10px] leading-[13px]"
      >
        {label}
      </Text>
    </View>
  )
})

/**
 * The four-up stat row shared by the Home progress card, the Profile identity
 * card and the Profile progress card. Four is the practical maximum before the
 * labels start wrapping to three lines on a 360px screen.
 */
export const MetricRow = memo(function MetricRow({
  items,
  className,
}: {
  items: MetricCellData[]
  className?: string
}) {
  return (
    <View className={cn("flex-row", className)}>
      {items.map((item) => (
        <MetricCell
          key={item.key}
          Icon={item.Icon}
          color={item.color}
          value={item.value}
          label={item.label}
        />
      ))}
    </View>
  )
})
