import { memo } from "react"
import { View } from "react-native"
import { Clock, Info, Target, Zap } from "lucide-react-native"

import type { OverallPerformanceStats } from "@/lib/performance-stats"
import { THEME, getThemeChartPalette, withOpacity } from "@/lib/theme"
import { Card, CardContent } from "@/components/ui/card"
import { CircularProgress } from "@/components/ui/circular-progress"
import { Text } from "@/components/ui/text"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

const SubjectBreakdownRow = memo(function SubjectBreakdownRow({
  subjectName,
  correctPercent,
  label,
  colorIndex,
  theme,
}: {
  subjectName: string
  correctPercent: number
  label: "STRONGEST" | null
  colorIndex: number
  theme: ThemePalette
}) {
  const chartPalette = getThemeChartPalette(theme)
  const barColor = chartPalette[colorIndex % chartPalette.length]

  return (
    <View
      style={{
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: withOpacity(theme.border, 0.4),
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-2.5">
          <View style={{ width: 4, height: 24, borderRadius: 2, backgroundColor: barColor }} />
          <Text
            style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, flex: 1 }}
            numberOfLines={2}
          >
            {subjectName}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: theme.foreground }}>
            {correctPercent}%
          </Text>
          {label ? (
            <View
              style={{
                backgroundColor: withOpacity(theme.success, 0.12),
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "800", letterSpacing: 0.6, color: theme.success }}>
                {label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: withOpacity(barColor, 0.12),
          marginTop: 10,
          marginLeft: 16,
        }}
      >
        <View
          style={{
            height: 4,
            borderRadius: 2,
            width: `${Math.min(correctPercent, 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </View>
    </View>
  )
})

const PerformanceHeader = memo(function PerformanceHeader({ theme }: { theme: ThemePalette }) {
  return (
    <View className="gap-0.5">
      <Text variant="eyebrow">
        Performance Insights
      </Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-base font-extrabold text-foreground">
          Overall Performance
        </Text>
        <Info size={14} color={theme.mutedForeground} />
      </View>
    </View>
  )
})

const PerformanceRingCard = memo(function PerformanceRingCard({
  stats, theme
}: {
  stats: OverallPerformanceStats
  theme: ThemePalette
}) {
  return (
    <Card style={{ borderWidth: 1, borderColor: theme.border }}>
      <CardContent size="loose">
        <View className="flex-row items-center gap-5">
          <CircularProgress
            percent={stats.correctPercent}
            size={130}
            strokeWidth={10}
            trackColor={withOpacity(theme.primary, 0.1)}
            color={theme.success}
          />
          <View className="flex-1 gap-4">
            <View>
              <View className="flex-row items-baseline gap-1">
                <Text style={{ fontSize: 22, fontWeight: "900", color: theme.foreground }}>
                  {stats.uniqueQuestionsAnswered}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "500", color: theme.mutedForeground }}>
                  of {stats.totalQuestions}
                </Text>
              </View>
              <Text className="text-2xs text-muted-foreground">Unique Questions Answered</Text>
            </View>
            <View>
              <View className="flex-row items-baseline gap-1">
                <Text style={{ fontSize: 22, fontWeight: "900", color: theme.foreground }}>
                  {stats.correctAnswers}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "500", color: theme.mutedForeground }}>
                  of {stats.totalAnswered}
                </Text>
              </View>
              <Text className="text-2xs text-muted-foreground">Correct Answers</Text>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  )
})

const PerformanceQuickStats = memo(function PerformanceQuickStats({
  stats, theme
}: {
  stats: OverallPerformanceStats
  theme: ThemePalette
}) {
  const avgMinutes = Math.floor(stats.averageTimePerQuestion / 60)
  const avgSeconds = stats.averageTimePerQuestion % 60

  return (
    <View className="flex-row gap-2.5">
      <Card className="flex-1" style={{ borderWidth: 1, borderColor: theme.border }}>
        <CardContent size="compact" className="items-center gap-1.5">
          <View
            className="h-9 w-9 items-center justify-center rounded-sm"
            style={{ backgroundColor: withOpacity(theme.primary, 0.12) }}
          >
            <Clock size={16} color={theme.primary} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: "900", color: theme.foreground }}>
            {avgMinutes}m {avgSeconds}s
          </Text>
          <Text className="text-center text-2xs leading-[14px] text-muted-foreground">
            Avg. Time Per{"\n"}Question
          </Text>
        </CardContent>
      </Card>

      <Card className="flex-1" style={{ borderWidth: 1, borderColor: theme.border }}>
        <CardContent size="compact" className="items-center gap-1.5">
          <View
            className="h-9 w-9 items-center justify-center rounded-sm"
            style={{ backgroundColor: withOpacity(theme.accent, 0.12) }}
          >
            <Zap size={16} color={theme.accent} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: "900", color: theme.foreground }}>
            {stats.bestStreak}
          </Text>
          <Text className="text-center text-2xs leading-[14px] text-muted-foreground">
            Most Correct{"\n"}In A Row
          </Text>
        </CardContent>
      </Card>
    </View>
  )
})

const PerformanceCategoryBreakdown = memo(function PerformanceCategoryBreakdown({
  stats, theme
}: {
  stats: OverallPerformanceStats
  theme: ThemePalette
}) {
  return (
    <Card style={{ borderWidth: 1, borderColor: theme.border }}>
      <CardContent>
        <View className="mb-1 flex-row items-center gap-2">
          <View
            className="h-8 w-8 items-center justify-center rounded-sm"
            style={{ backgroundColor: withOpacity(theme.chart4, 0.12) }}
          >
            <Target size={14} color={theme.chart4} />
          </View>
          <Text className="text-sm font-bold text-foreground">
            Category Breakdown
          </Text>
        </View>
        {stats.subjectBreakdown.map((subject, index) => (
          <SubjectBreakdownRow
            key={subject.subjectId}
            subjectName={subject.subjectName}
            correctPercent={subject.correctPercent}
            label={subject.label}
            colorIndex={index}
            theme={theme}
          />
        ))}
      </CardContent>
    </Card>
  )
})

export const OverallPerformanceSection = memo(function OverallPerformanceSection({
  stats, theme
}: {
  stats: OverallPerformanceStats
  theme: ThemePalette
}) {
  return (
    <View className="gap-4">
      <PerformanceHeader theme={theme} />
      <PerformanceRingCard stats={stats} theme={theme} />
      <PerformanceQuickStats stats={stats} theme={theme} />
      <PerformanceCategoryBreakdown stats={stats} theme={theme} />
    </View>
  )
})
