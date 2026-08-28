import { type ReactNode } from "react"
import { View, type ViewProps } from "react-native"

import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

type SectionHeaderProps = ViewProps & {
  /** Small uppercase kicker above the title, e.g. "Quiz Categories". */
  eyebrow?: string
  title: string
  subtitle?: string
  /** Trailing action, e.g. a "See all" link or an icon button. */
  action?: ReactNode
}

/**
 * Standard section heading: eyebrow · title · subtitle, with an optional
 * trailing action. Replaces the hand-rolled eyebrow/title blocks that were
 * copy-pasted across screens with drifting sizes and letter-spacing.
 */
function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <View
      className={cn("flex-row items-end justify-between gap-3", className)}
      {...props}
    >
      <View className="flex-1 gap-1">
        {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
        <Text variant="heading">{title}</Text>
        {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
      </View>
      {action ?? null}
    </View>
  )
}

export { SectionHeader }
export type { SectionHeaderProps }
