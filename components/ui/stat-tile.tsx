import { type ReactNode } from "react"
import { View, type ViewProps } from "react-native"

import { TONE_TEXT_CLASS, type Tone } from "@/lib/tone"
import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

type StatTileProps = ViewProps & {
  /** Small uppercase label, e.g. "Streak". */
  label: string
  /** The headline value, e.g. "12 days". */
  value: string
  /** Optional supporting line under the value. */
  caption?: string
  /** Optional leading icon (16px lucide icon works well). */
  icon?: ReactNode
  /** Shared vocabulary from `lib/tone.ts` — same values `Badge` takes. */
  tone?: Tone
}

/**
 * Compact metric tile: label · value · caption. Use inside a row of
 * `flex-1` tiles or a grid. Replaces the per-screen stat tile variants.
 *
 * ```tsx
 * <View className="flex-row gap-2">
 *   <StatTile className="flex-1" label="Answered" value="128" />
 *   <StatTile className="flex-1" label="Accuracy" value="82%" tone="success" />
 * </View>
 * ```
 */
function StatTile({
  label,
  value,
  caption,
  icon,
  tone = "default",
  className,
  ...props
}: StatTileProps) {
  return (
    <View
      className={cn(
        "gap-1 rounded-xl border border-border/70 bg-card px-3.5 py-3",
        className
      )}
      {...props}
    >
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text variant="label">{label}</Text>
      </View>
      <Text className={cn("text-lg font-extrabold", TONE_TEXT_CLASS[tone])}>
        {value}
      </Text>
      {caption ? <Text variant="caption">{caption}</Text> : null}
    </View>
  )
}

export { StatTile }
export type { StatTileProps }
