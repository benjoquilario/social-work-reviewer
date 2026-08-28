import { View, type ViewProps } from "react-native"

import { TONE_SURFACE_CLASS, type Tone } from "@/lib/tone"
import { cn } from "@/lib/utils"

const TONE_FILL_CLASS: Record<Tone, string> = {
  default: "bg-foreground",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  accent: "bg-accent",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
}

const SIZE_CLASS = {
  sm: "h-1.5",
  default: "h-2",
  lg: "h-2.5",
} as const

type ProgressBarProps = Omit<ViewProps, "children"> & {
  /** 0–100. Values outside the range are clamped rather than overflowing. */
  value: number
  tone?: Tone
  size?: keyof typeof SIZE_CLASS
  /** Announced to screen readers, e.g. "Overall study progress". */
  label?: string
}

/**
 * Horizontal progress track.
 *
 * Every screen was hand-rolling `<View className="h-2 rounded-full bg-muted">`
 * with a nested absolutely-positioned fill, each with its own height, radius
 * and clamping (or none — a value over 100 pushed the fill past the track).
 *
 * Reports `progressbar` semantics so the value reaches assistive tech, which
 * a bare pair of Views never did.
 */
function ProgressBar({
  value,
  tone = "primary",
  size = "default",
  label,
  className,
  ...props
}: ProgressBarProps) {
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), 100)
    : 0

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safeValue) }}
      className={cn(
        "w-full overflow-hidden rounded-full",
        TONE_SURFACE_CLASS.muted,
        SIZE_CLASS[size],
        className
      )}
      {...props}
    >
      <View
        className={cn("h-full rounded-full", TONE_FILL_CLASS[tone])}
        style={{ width: `${safeValue}%` }}
      />
    </View>
  )
}

export { ProgressBar }
export type { ProgressBarProps }
