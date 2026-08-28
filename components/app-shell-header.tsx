import { type ReactNode } from "react"
import { View } from "react-native"

import { Text } from "@/components/ui/text"

type AppShellHeaderProps = {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** Optional trailing element (avatar, action button, …) */
  trailing?: ReactNode
  compact?: boolean
}

/**
 * Top-of-screen header used by tab screens: eyebrow · title · subtitle.
 */
export function AppShellHeader({
  eyebrow,
  title,
  subtitle,
  trailing,
  compact = false,
}: AppShellHeaderProps) {
  return (
    <View className={compact ? "gap-4 px-1" : "gap-5 px-1"}>
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1 gap-1.5">
          {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}

          <Text
            variant="title"
            className={compact ? undefined : "text-2xl leading-8"}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text variant="callout" className="text-muted-foreground">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {trailing ?? null}
      </View>
    </View>
  )
}
