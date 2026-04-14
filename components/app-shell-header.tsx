import { type ReactNode } from "react"
import { View } from "react-native"

import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Text } from "@/components/ui/text"

type HeaderStat = {
  label: string
  value: string
}

type AppShellHeaderProps = {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle: ReactNode
  avatarLabel?: string
  badgeLabel?: string
  badgeValue?: string
  stats?: HeaderStat[]
  compact?: boolean
}

export function AppShellHeader({
  eyebrow,
  title,
  subtitle,
  avatarLabel = "RV",
  badgeLabel,
  badgeValue,
  stats,
  compact = false,
}: AppShellHeaderProps) {
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light

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
            className={
              compact
                ? "text-[22px] font-extrabold leading-7 text-foreground"
                : "text-[24px] font-extrabold leading-8 text-foreground"
            }
          >
            {title}
          </Text>
          <Text className="text-[13px] leading-5 text-muted-foreground">
            {subtitle}
          </Text>
        </View>

        <View
          className="items-center gap-1.5 rounded-2xl px-3 py-2.5"
          style={{
            backgroundColor: withOpacity(theme.primary, 0.08),
          }}
        >
          <View
            className="h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: withOpacity(theme.primary, 0.15) }}
          >
            <Text className="text-xs font-bold uppercase text-primary">
              {avatarLabel}
            </Text>
          </View>
          {badgeLabel ? (
            <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-primary">
              {badgeLabel}
            </Text>
          ) : null}
          {badgeValue ? (
            <Text className="max-w-[80px] text-center text-[11px] font-semibold leading-4 text-muted-foreground">
              {badgeValue}
            </Text>
          ) : null}
        </View>
      </View>

      {stats?.length ? (
        <View className="flex-row gap-2">
          {stats.slice(0, 3).map((stat) => (
            <View
              key={stat.label}
              className="flex-1 rounded-xl px-3 py-2.5"
              style={{
                backgroundColor: withOpacity(theme.muted, 0.7),
              }}
            >
              <Text className="text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground">
                {stat.label}
              </Text>
              <Text className="mt-1 text-sm font-extrabold text-foreground">
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
