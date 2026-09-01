import { memo } from "react"
import { Pressable, View } from "react-native"
import BarChart3 from "lucide-react-native/icons/chart-column"
import ChevronLeft from "lucide-react-native/icons/chevron-left"
import ChevronRight from "lucide-react-native/icons/chevron-right"
import Clock3 from "lucide-react-native/icons/clock-3"
import Flame from "lucide-react-native/icons/flame"
import Trophy from "lucide-react-native/icons/trophy"
import type {
  DashboardReportMetrics,
  QuestionsAnsweredTimeline,
  TimelineWindow,
} from "@/lib/performance-stats"
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
      className="flex-row overflow-hidden rounded-xl"
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
  reportMetrics,
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
  reportMetrics: DashboardReportMetrics | null
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
  const reportCards = reportMetrics
    ? [
        reportMetrics.today,
        reportMetrics.week,
        reportMetrics.month,
        reportMetrics.year,
      ]
    : []

  return (
    <View className="gap-3">
      <View className="gap-0.5">
        <Text variant="eyebrow">
          Activity Metrics
        </Text>
        <Text className="text-base font-extrabold text-foreground">
          Questions Answered
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <WindowToggle active={window} onSelect={onWindowChange} theme={theme} />
      </View>

      {isLoading ? (
        <Skeleton className="h-36 rounded-xl" />
      ) : timeline ? (
        <Card style={{ borderWidth: 1, borderColor: theme.border }}>
          <CardContent className="gap-4">
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
            <CardContent size="compact" className="gap-1.5">
              <View className="flex-row items-center gap-1.5">
                <BarChart3 size={13} color={theme.primary} />
                <Text variant="eyebrow">
                  {periodLabel}
                </Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: theme.foreground }}>
                {timeline.questionsThisPeriod}
              </Text>
              <Text className="text-2xs text-muted-foreground">questions answered</Text>
            </CardContent>
          </Card>
          <Card className="flex-1" style={{ borderWidth: 1, borderColor: theme.border }}>
            <CardContent size="compact" className="gap-1.5">
              <View className="flex-row items-center gap-1.5">
                <Trophy size={13} color={theme.accent} />
                <Text className="text-2xs font-bold uppercase tracking-[1px] text-accent-text">
                  Best Day
                </Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: theme.foreground }}>
                {timeline.mostAnsweredInOneDay}
              </Text>
              <Text className="text-2xs text-muted-foreground" numberOfLines={1}>
                {timeline.mostAnsweredDate}
              </Text>
            </CardContent>
          </Card>
        </View>
      ) : null}

      {reportMetrics ? (
        <View className="gap-2.5">
          <View className="gap-0.5">
            <Text variant="eyebrow">
              Report Snapshots
            </Text>
            <Text className="text-base font-extrabold text-foreground">
              Daily to Yearly Progress
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2.5">
            {reportCards.map((snapshot) => (
              <Card
                key={snapshot.label}
                className="min-w-[47%] flex-1"
                style={{ borderWidth: 1, borderColor: theme.border }}
              >
                <CardContent size="compact" className="gap-2">
                  <Text variant="eyebrow">
                    {snapshot.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "900",
                      color: theme.foreground,
                    }}
                  >
                    {snapshot.answeredCount}
                  </Text>
                  <Text className="text-2xs text-muted-foreground">
                    answered · {snapshot.accuracyRate}% accuracy
                  </Text>
                  <Text className="text-2xs text-muted-foreground">
                    {snapshot.studyMinutes} min · {snapshot.activeDaysCount} active
                    day{snapshot.activeDaysCount === 1 ? "" : "s"}
                  </Text>
                  <Text className="text-2xs text-muted-foreground">
                    {snapshot.earnedAchievementsCount} achievements earned
                  </Text>
                </CardContent>
              </Card>
            ))}
          </View>

          <Card style={{ borderWidth: 1, borderColor: theme.border }}>
            <CardContent className="gap-3">
              <View className="flex-row items-center justify-between gap-3">
                <View>
                  <Text variant="eyebrow">
                    Lifetime Summary
                  </Text>
                  <Text className="text-base font-extrabold text-foreground">
                    Long-term reviewer momentum
                  </Text>
                </View>
                <View
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: withOpacity(theme.primary, 0.12) }}
                >
                  <Text variant="eyebrow">
                    {reportMetrics.lifetime.achievementsCount} badges
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap gap-2.5">
                <View className="min-w-[47%] flex-1 rounded-xl p-3" style={{ backgroundColor: withOpacity(theme.primary, 0.08) }}>
                  <View className="flex-row items-center gap-1.5">
                    <Flame size={13} color={theme.accent} />
                    <Text className="text-2xs font-bold uppercase tracking-[1px]" style={{ color: theme.accent }}>
                      Current Streak
                    </Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: "900", color: theme.foreground }}>
                    {reportMetrics.lifetime.dayStreak}
                  </Text>
                  <Text className="text-2xs text-muted-foreground">consecutive days</Text>
                </View>

                <View className="min-w-[47%] flex-1 rounded-xl p-3" style={{ backgroundColor: withOpacity(theme.primary, 0.08) }}>
                  <View className="flex-row items-center gap-1.5">
                    <Clock3 size={13} color={theme.primary} />
                    <Text variant="eyebrow">
                      Study Time
                    </Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: "900", color: theme.foreground }}>
                    {reportMetrics.lifetime.totalStudyMinutes}
                  </Text>
                  <Text className="text-2xs text-muted-foreground">minutes tracked</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      ) : null}
    </View>
  )
})
