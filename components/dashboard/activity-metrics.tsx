import { memo } from "react"
import { Pressable, View } from "react-native"
import { BarChart3, ChevronLeft, ChevronRight, Trophy } from "lucide-react-native"

import type { QuestionsAnsweredTimeline, TimelineWindow } from "@/lib/performance-stats"
import { THEME, withOpacity } from "@/lib/theme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart } from "./bar-chart"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

const WINDOWS: TimelineWindow[] = ["week", "month", "year"]
const WINDOW_LABELS: Record<TimelineWindow, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
}

const WindowToggle = memo(function WindowToggle({
  active,
  onSelect,
  theme,
}: {
  active: TimelineWindow
  onSelect: (w: TimelineWindow) => void
  theme: ThemePalette
}) {
  return (
    <View
      className="flex-row overflow-hidden rounded-2xl"
      style={{ backgroundColor: withOpacity(theme.primary, 0.08) }}
    >
      {WINDOWS.map((w) => {
        const isActive = w === active
        return (
          <Pressable
            key={w}
            onPress={() => onSelect(w)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: isActive ? theme.primary : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: isActive ? theme.primaryForeground : theme.mutedForeground,
              }}
            >
              {WINDOW_LABELS[w]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
})

const DateNavigator = memo(function DateNavigator({
  rangeLabel,
  onPrev,
  onNext,
  onToday,
  theme,
}: {
  rangeLabel: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  theme: ThemePalette
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text style={{ fontSize: 13, fontWeight: "700", color: theme.foreground }}>
        {rangeLabel}
      </Text>
      <View className="flex-row items-center gap-1.5">
        <Pressable
          onPress={onPrev}
          style={{
            width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center",
            backgroundColor: withOpacity(theme.primary, 0.08),
          }}
        >
          <ChevronLeft size={16} color={theme.primary} />
        </Pressable>
        <Pressable
          onPress={onToday}
          style={{
            paddingHorizontal: 14, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center",
            backgroundColor: withOpacity(theme.primary, 0.08),
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: theme.primary }}>Today</Text>
        </Pressable>
        <Pressable
          onPress={onNext}
          style={{
            width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center",
            backgroundColor: withOpacity(theme.primary, 0.08),
          }}
        >
          <ChevronRight size={16} color={theme.primary} />
        </Pressable>
      </View>
    </View>
  )
})

export const ActivityMetricsSection = memo(function ActivityMetricsSection({
  timeline,
  isLoading,
  window,
  onWindowChange,
  selectedBarIndex,
  onSelectBar,
  onPrev,
  onNext,
  onToday,
  theme,
}: {
  timeline: QuestionsAnsweredTimeline | null
  isLoading: boolean
  window: TimelineWindow
  onWindowChange: (w: TimelineWindow) => void
  selectedBarIndex: number | null
  onSelectBar: (index: number) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  theme: ThemePalette
}) {
  const periodLabel = window === "week" ? "This Week" : window === "month" ? "This Month" : "This Year"

  return (
    <View className="gap-3">
      <View className="gap-0.5">
        <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
          Activity Metrics
        </Text>
        <Text className="text-[17px] font-extrabold text-foreground">
          Questions Answered
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <WindowToggle active={window} onSelect={onWindowChange} theme={theme} />
      </View>

      {isLoading ? (
        <Skeleton className="h-36 rounded-2xl" />
      ) : timeline ? (
        <Card style={{ borderWidth: 1, borderColor: theme.border }}>
          <CardContent className="gap-4 px-4 py-4">
            <BarChart
              timeline={timeline}
              theme={theme}
              selectedBarIndex={selectedBarIndex}
              onSelectBar={onSelectBar}
            />
            <DateNavigator
              rangeLabel={timeline.rangeLabel}
              onPrev={onPrev}
              onNext={onNext}
              onToday={onToday}
              theme={theme}
            />
          </CardContent>
        </Card>
      ) : null}

      {timeline ? (
        <View className="flex-row gap-2.5">
          <Card className="flex-1" style={{ borderWidth: 1, borderColor: theme.border }}>
            <CardContent className="gap-1.5 px-3.5 py-3">
              <View className="flex-row items-center gap-1.5">
                <BarChart3 size={13} color={theme.primary} />
                <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-primary">
                  {periodLabel}
                </Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: theme.foreground }}>
                {timeline.questionsThisPeriod}
              </Text>
              <Text className="text-[11px] text-muted-foreground">questions answered</Text>
            </CardContent>
          </Card>
          <Card className="flex-1" style={{ borderWidth: 1, borderColor: theme.border }}>
            <CardContent className="gap-1.5 px-3.5 py-3">
              <View className="flex-row items-center gap-1.5">
                <Trophy size={13} color={theme.accent} />
                <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-accent">
                  Best Day
                </Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: theme.foreground }}>
                {timeline.mostAnsweredInOneDay}
              </Text>
              <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                {timeline.mostAnsweredDate}
              </Text>
            </CardContent>
          </Card>
        </View>
      ) : null}
    </View>
  )
})
