import { type ReactNode } from "react"
import { View, type ViewProps } from "react-native"

import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

type EmptyStateProps = ViewProps & {
  /** Optional illustration or icon shown above the title. */
  icon?: ReactNode
  title: string
  description?: string
  /** Optional call to action (usually a `Button`). */
  action?: ReactNode
  /** `destructive` styles the state as an error. */
  tone?: "default" | "destructive"
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
        "items-center gap-2 rounded-2xl border border-border/70 bg-card px-5 py-8",
        tone === "destructive" && "border-destructive/25 bg-destructive/5",
        className
      )}
      {...props}
    >
      {icon ? <View className="mb-1">{icon}</View> : null}
      <Text
        className={cn(
          "text-center text-[15px] font-extrabold",
          tone === "destructive" ? "text-destructive" : "text-foreground"
        )}
      >
        {title}
      </Text>
      {description ? (
        <Text className="text-center text-[12px] leading-[18px] text-muted-foreground">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-2">{action}</View> : null}
    </View>
  )
}

export { EmptyState }
export type { EmptyStateProps }
