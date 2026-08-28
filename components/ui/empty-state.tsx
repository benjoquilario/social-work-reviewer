import { type ReactNode } from "react"
import { View, type ViewProps } from "react-native"

import { TONE_TEXT_CLASS, type Tone } from "@/lib/tone"
import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

type EmptyStateProps = ViewProps & {
  /** Optional illustration or icon shown above the title. */
  icon?: ReactNode
  title: string
  description?: string
  /** Optional call to action (usually a `Button`). */
  action?: ReactNode
  /**
   * Shared vocabulary from `lib/tone.ts` — colors the title. `destructive`
   * additionally tints the whole card, since a failed load should read as an
   * error at a glance rather than only in the copy.
   */
  tone?: Tone
}

/**
 * Shared empty/error state card. Use for empty lists, failed queries,
 * and zero-result filters so every screen communicates the same way.
 *
 * ```tsx
 * <EmptyState
 *   tone="destructive"
 *   title="Subjects unavailable"
 *   description="We could not load subjects. Check your connection and retry."
 *   action={<Button size="sm" onPress={refetch}><Text>Retry</Text></Button>}
 * />
 * ```
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "default",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <View
      className={cn(
        "items-center gap-2 rounded-xl border border-border/70 bg-card px-5 py-8",
        tone === "destructive" && "border-destructive/25 bg-destructive/5",
        className
      )}
      {...props}
    >
      {icon ? <View className="mb-1">{icon}</View> : null}
      <Text
        variant="subheading"
        className={cn("text-center", TONE_TEXT_CLASS[tone])}
      >
        {title}
      </Text>
      {description ? (
        <Text variant="caption" className="text-center">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-2">{action}</View> : null}
    </View>
  )
}

export { EmptyState }
export type { EmptyStateProps }
