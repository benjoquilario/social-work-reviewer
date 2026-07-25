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
          {eyebrow ? (
            <Text className="text-[11px] font-bold uppercase tracking-[1.6px] text-primary">
              {eyebrow}
            </Text>
          ) : null}

          <Text
            role="heading"
            aria-level={1}
            className={
              compact
                ? "text-[22px] font-extrabold leading-7 text-foreground"
                : "text-[24px] font-extrabold leading-8 text-foreground"
            }
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-[13px] leading-5 text-muted-foreground">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {trailing ?? null}
      </View>
    </View>
  )
}
