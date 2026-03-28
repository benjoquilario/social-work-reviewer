import { View } from "react-native"

import { Text } from "@/components/ui/text"

type HeaderStat = {
  label: string
  value: string
}

type AppShellHeaderProps = {
  eyebrow?: string
  title: string
  subtitle: string
  avatarLabel?: string
  stats?: HeaderStat[]
  compact?: boolean
}

export function AppShellHeader({
  eyebrow,
  title,
  subtitle,
  avatarLabel = "RV",
  stats,
  compact = false,
}: AppShellHeaderProps) {
  return (
    <View
      className={
        compact
          ? "overflow-hidden rounded-[24px] border border-border bg-card px-4 py-4"
          : "overflow-hidden rounded-[26px] border border-border bg-card px-4 py-4"
      }
    >
      <View
        className={
          compact
            ? "absolute -right-7 -top-7 h-24 w-24 rounded-full bg-primary/10"
            : "absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10"
        }
      />
      <View
        className={
          compact
            ? "bg-chart2/15 absolute -bottom-8 -left-8 h-20 w-20 rounded-full"
            : "bg-chart2/15 absolute -bottom-9 -left-8 h-20 w-20 rounded-full"
        }
      />

      {eyebrow ? (
        <Text
          className={
            compact
              ? "mt-4 text-[11px] font-black uppercase tracking-[1.6px] text-primary"
              : "mt-4 text-[11px] font-black uppercase tracking-[1.6px] text-primary"
          }
        >
          {eyebrow}
        </Text>
      ) : null}

      <Text
        className={
          compact
            ? "mt-2 text-[24px] font-black leading-8 text-card-foreground"
            : "mt-2 text-[24px] font-black leading-8 text-card-foreground"
        }
      >
        {title}
      </Text>
      <Text className="mt-2 text-[13px] leading-5 text-muted-foreground">
        {subtitle}
      </Text>

      {stats?.length ? (
        <View
          className={compact ? "mt-4 flex-row gap-2" : "mt-4 flex-row gap-1.5"}
        >
          {stats.slice(0, 3).map((stat) => (
            <View
              key={stat.label}
              className={
                compact
                  ? "flex-1 rounded-2xl border border-border/80 bg-background/80 px-3 py-2.5"
                  : "flex-1 rounded-2xl border border-border/80 bg-background/80 px-3 py-3"
              }
            >
              <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                {stat.label}
              </Text>
              <Text className="mt-1 text-sm font-black text-card-foreground">
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
