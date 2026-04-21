import { memo, useCallback, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Target,
  Trophy,
  Zap,
} from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  getOverallPerformanceStats,
  getQuestionsAnsweredTimeline,
  type OverallPerformanceStats,
  type QuestionsAnsweredTimeline,
  type TimelineWindow,
} from "@/lib/performance-stats"
import { getStaggerDelay } from "@/lib/motion"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { CircularProgress } from "@/components/ui/circular-progress"
import { FadeInView } from "@/components/ui/motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

// ─── Window Toggle ────────────────────────────────────────────────────────────

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
      style={{
        backgroundColor: withOpacity(theme.primary, 0.08),
      }}
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
                color: isActive
                  ? theme.primaryForeground
                  : theme.mutedForeground,
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

// ─── Bar Chart ────────────────────────────────────────────────────────────────

const BarChart = memo(function BarChart({
  timeline,
  theme,
  selectedBarIndex,
  onSelectBar,
}: {
  timeline: QuestionsAnsweredTimeline
  theme: ThemePalette
  selectedBarIndex: number | null
  onSelectBar: (index: number) => void
}) {
  const maxValue = Math.max(1, ...timeline.points.map((p) => p.value))
  const BAR_MAX_HEIGHT = 110

  return (
    <View className="gap-2">
      <View style={{ height: BAR_MAX_HEIGHT + 28, position: "relative" }}>
        {/* Gridlines */}
        {[0, 0.5, 1].map((ratio) => (
          <View
            key={`grid-${ratio}`}
            style={{
              position: "absolute",
              left: 0,
              right: 30,
              top: (1 - ratio) * BAR_MAX_HEIGHT,
              height: 1,
              backgroundColor: withOpacity(theme.border, 0.5),
            }}
          />
        ))}

        {/* Y-axis labels */}
        <View
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            alignItems: "flex-end",
            height: BAR_MAX_HEIGHT,
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: theme.mutedForeground,
              fontWeight: "600",
            }}
          >
            {maxValue}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: theme.mutedForeground,
              fontWeight: "600",
            }}
          >
            {Math.round(maxValue / 2)}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: theme.mutedForeground,
              fontWeight: "600",
            }}
          >
            0
          </Text>
        </View>

        {/* Bars */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
            paddingRight: 36,
            height: BAR_MAX_HEIGHT,
          }}
        >
          {timeline.points.map((point, index) => {
            const height =
              point.value === 0
                ? 4
                : Math.max((point.value / maxValue) * BAR_MAX_HEIGHT, 8)
            const isSelected = selectedBarIndex === index

            return (
              <Pressable
                key={point.key}
                onPress={() => onSelectBar(index)}
                style={{
                  flex: 1,
                  alignItems: "center",
                }}
              >
                {/* Tooltip */}
                {isSelected && point.value > 0 ? (
                  <View
                    style={{
                      backgroundColor: theme.primary,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      marginBottom: 6,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "800",
                        color: theme.primaryForeground,
                      }}
                      numberOfLines={1}
                    >
                      {point.value}
                    </Text>
                    <View
                      style={{
                        position: "absolute",
                        bottom: -4,
                        width: 0,
                        height: 0,
                        borderLeftWidth: 5,
                        borderRightWidth: 5,
                        borderTopWidth: 5,
                        borderLeftColor: "transparent",
                        borderRightColor: "transparent",
                        borderTopColor: theme.primary,
                      }}
                    />
                  </View>
                ) : null}

                {/* Bar */}
                <View
                  style={{
                    width: "85%",
                    height,
                    borderRadius: 6,
                    backgroundColor:
                      point.value === 0
                        ? withOpacity(theme.primary, 0.06)
                        : isSelected
                          ? theme.primary
                          : withOpacity(theme.primary, 0.3),
                  }}
                />
              </Pressable>
            )
          })}
        </View>

        {/* Labels */}
        <View
          className="flex-row"
          style={{ paddingRight: 36, marginTop: 8, gap: 8 }}
        >
          {timeline.points.map((point) => (
            <View key={`label-${point.key}`} style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: theme.mutedForeground,
                  textAlign: "center",
                }}
              >
                {point.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
})

// ─── Date Navigator ───────────────────────────────────────────────────────────

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
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: theme.foreground,
        }}
      >
        {rangeLabel}
      </Text>

      <View className="flex-row items-center gap-1.5">
        <Pressable
          onPress={onPrev}
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withOpacity(theme.primary, 0.08),
          }}
        >
          <ChevronLeft size={16} color={theme.primary} />
        </Pressable>

        <Pressable
          onPress={onToday}
          style={{
            paddingHorizontal: 14,
            height: 34,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withOpacity(theme.primary, 0.08),
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: theme.primary,
            }}
          >
            Today
          </Text>
        </Pressable>

        <Pressable
          onPress={onNext}
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withOpacity(theme.primary, 0.08),
          }}
        >
          <ChevronRight size={16} color={theme.primary} />
        </Pressable>
      </View>
    </View>
  )
})

// ─── Subject Breakdown Row ────────────────────────────────────────────────────

const SUBJECT_BAR_COLORS = [
  "hsl(199 89% 48%)",  // primary blue
  "hsl(165 62% 43%)",  // teal
  "hsl(18 94% 62%)",   // orange accent
  "hsl(272 74% 66%)",  // purple
  "hsl(338 78% 61%)",  // pink
]

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
  const barColor = SUBJECT_BAR_COLORS[colorIndex % SUBJECT_BAR_COLORS.length]

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
          <View
            style={{
              width: 4,
              height: 24,
              borderRadius: 2,
              backgroundColor: barColor,
            }}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: theme.foreground,
              flex: 1,
            }}
            numberOfLines={2}
          >
            {subjectName}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "900",
              color: theme.foreground,
            }}
          >
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
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "800",
                  letterSpacing: 0.6,
                  color: theme.success,
                }}
              >
                {label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Progress bar */}
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

// ─── Overall Performance Section ──────────────────────────────────────────────

export const OverallPerformanceSection = memo(
  function OverallPerformanceSection({
    stats,
    theme,
  }: {
    stats: OverallPerformanceStats
    theme: ThemePalette
  }) {
    const avgMinutes = Math.floor(stats.averageTimePerQuestion / 60)
    const avgSeconds = stats.averageTimePerQuestion % 60

    return (
      <View className="gap-4">
        {/* Header */}
        <View className="gap-0.5">
          <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
            Performance Insights
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-[17px] font-extrabold text-foreground">
              Overall Performance
            </Text>
            <Info size={14} color={theme.mutedForeground} />
          </View>
        </View>

        {/* Ring + Stats Card */}
        <Card style={{ borderWidth: 1, borderColor: theme.border }}>
          <CardContent className="px-4 py-5">
            <View className="flex-row items-center gap-5">
              <CircularProgress
                percent={stats.correctPercent}
                size={130}
                strokeWidth={10}
                trackColor={withOpacity(theme.primary, 0.1)}
                color={theme.success}
              />

              <View className="flex-1 gap-4">
                {/* Unique Questions */}
                <View>
                  <View className="flex-row items-baseline gap-1">
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "900",
                        color: theme.foreground,
                      }}
                    >
                      {stats.uniqueQuestionsAnswered}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: theme.mutedForeground,
                      }}
                    >
                      of {stats.totalQuestions}
                    </Text>
                  </View>
                  <Text className="text-[11px] text-muted-foreground">
                    Unique Questions Answered
                  </Text>
                </View>

                {/* Correct */}
                <View>
                  <View className="flex-row items-baseline gap-1">
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "900",
                        color: theme.foreground,
                      }}
                    >
                      {stats.correctAnswers}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: theme.mutedForeground,
                      }}
                    >
                      of {stats.totalAnswered}
                    </Text>
                  </View>
                  <Text className="text-[11px] text-muted-foreground">
                    Correct Answers
                  </Text>
                </View>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Quick Stats Row */}
        <View className="flex-row gap-2.5">
          <Card
            className="flex-1"
            style={{ borderWidth: 1, borderColor: theme.border }}
          >
            <CardContent className="items-center gap-1.5 px-3 py-3.5">
              <View
                className="h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: withOpacity(theme.primary, 0.12) }}
              >
                <Clock size={16} color={theme.primary} />
              </View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "900",
                  color: theme.foreground,
                }}
              >
                {avgMinutes}m {avgSeconds}s
              </Text>
              <Text className="text-center text-[10px] leading-[14px] text-muted-foreground">
                Avg. Time Per{"\n"}Question
              </Text>
            </CardContent>
          </Card>

          <Card
            className="flex-1"
            style={{ borderWidth: 1, borderColor: theme.border }}
          >
            <CardContent className="items-center gap-1.5 px-3 py-3.5">
              <View
                className="h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: withOpacity(theme.accent, 0.12) }}
              >
                <Zap size={16} color={theme.accent} />
              </View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "900",
                  color: theme.foreground,
                }}
              >
                {stats.bestStreak}
              </Text>
              <Text className="text-center text-[10px] leading-[14px] text-muted-foreground">
                Most Correct{"\n"}In A Row
              </Text>
            </CardContent>
          </Card>
        </View>

        {/* Subject Breakdown */}
        <Card style={{ borderWidth: 1, borderColor: theme.border }}>
          <CardContent className="px-4 py-4">
            <View className="mb-1 flex-row items-center gap-2">
              <View
                className="h-8 w-8 items-center justify-center rounded-xl"
                style={{ backgroundColor: withOpacity(theme.chart4, 0.12) }}
              >
                <Target size={14} color={theme.chart4} />
              </View>
              <Text className="text-[13px] font-bold text-foreground">
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
      </View>
    )
  }
)

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter()
  const user = useAuth((state) => state.user)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light

  const [window, setWindow] = useState<TimelineWindow>("week")
  const [offset, setOffset] = useState(0)
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null)

  const handleWindowChange = useCallback((w: TimelineWindow) => {
    setWindow(w)
    setOffset(0)
    setSelectedBarIndex(null)
  }, [])

  const handlePrev = useCallback(() => {
    setOffset((prev) => prev - 1)
    setSelectedBarIndex(null)
  }, [])

  const handleNext = useCallback(() => {
    setOffset((prev) => Math.min(prev + 1, 0))
    setSelectedBarIndex(null)
  }, [])

  const handleToday = useCallback(() => {
    setOffset(0)
    setSelectedBarIndex(null)
  }, [])

  // Queries
  const timelineQuery = useQuery({
    queryKey: ["dashboard-timeline", user?.$id, window, offset],
    enabled: Boolean(user?.$id),
    queryFn: () =>
      getQuestionsAnsweredTimeline(user?.$id ?? "", window, offset),
    staleTime: 1000 * 15,
  })

  const performanceQuery = useQuery({
    queryKey: ["dashboard-overall-performance", user?.$id],
    enabled: Boolean(user?.$id),
    queryFn: () => getOverallPerformanceStats(user?.$id ?? ""),
    staleTime: 1000 * 15,
  })

  const timeline = timelineQuery.data ?? null
  const performanceStats = performanceQuery.data ?? null

  const periodLabel = useMemo(() => {
    if (window === "week") return "This Week"
    if (window === "month") return "This Month"
    return "This Year"
  }, [window])

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-5 pb-28"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 px-4 pt-4">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
            onPress={() => {
              if (router.canGoBack()) {
                router.back()
                return
              }
              router.replace("/(tabs)")
            }}
          >
            <ArrowLeft size={18} color={theme.primary} strokeWidth={2.5} />
          </Pressable>
          <View className="flex-1 gap-0.5">
            <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
              Performance Hub
            </Text>
            <Text className="text-[20px] font-extrabold text-foreground">
              Dashboard
            </Text>
          </View>
        </View>

        {!user ? (
          <FadeInView delay={getStaggerDelay(0)}>
            <Card className="mx-4" style={{ borderWidth: 1, borderColor: theme.border }}>
              <CardContent className="gap-1.5 px-4 py-4">
                <Text className="text-[14px] font-bold text-card-foreground">
                  Sign in to view performance
                </Text>
                <Text className="text-[12px] leading-5 text-muted-foreground">
                  Your quiz performance and progress data appear after login.
                </Text>
              </CardContent>
            </Card>
          </FadeInView>
        ) : timelineQuery.isLoading && performanceQuery.isLoading ? (
          <View className="gap-3 px-4">
            <Skeleton className="h-56 rounded-2xl" />
            <View className="flex-row gap-2.5">
              <Skeleton className="h-24 flex-1 rounded-2xl" />
              <Skeleton className="h-24 flex-1 rounded-2xl" />
            </View>
            <Skeleton className="h-64 rounded-2xl" />
          </View>
        ) : (
          <View className="gap-5 px-4">
            {/* ── Section 1: Questions Answered ────────────────── */}
            <FadeInView delay={getStaggerDelay(0)}>
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
                  <WindowToggle
                    active={window}
                    onSelect={handleWindowChange}
                    theme={theme}
                  />
                </View>

                {timelineQuery.isLoading ? (
                  <Skeleton className="h-36 rounded-2xl" />
                ) : timeline ? (
                  <Card style={{ borderWidth: 1, borderColor: theme.border }}>
                    <CardContent className="gap-4 px-4 py-4">
                      <BarChart
                        timeline={timeline}
                        theme={theme}
                        selectedBarIndex={selectedBarIndex}
                        onSelectBar={setSelectedBarIndex}
                      />

                      <DateNavigator
                        rangeLabel={timeline.rangeLabel}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        onToday={handleToday}
                        theme={theme}
                      />
                    </CardContent>
                  </Card>
                ) : null}

                {/* Summary stats */}
                {timeline ? (
                  <View className="flex-row gap-2.5">
                    <Card
                      className="flex-1"
                      style={{ borderWidth: 1, borderColor: theme.border }}
                    >
                      <CardContent className="gap-1.5 px-3.5 py-3">
                        <View className="flex-row items-center gap-1.5">
                          <BarChart3 size={13} color={theme.primary} />
                          <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-primary">
                            {periodLabel}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "900",
                            color: theme.foreground,
                          }}
                        >
                          {timeline.questionsThisPeriod}
                        </Text>
                        <Text className="text-[11px] text-muted-foreground">
                          questions answered
                        </Text>
                      </CardContent>
                    </Card>

                    <Card
                      className="flex-1"
                      style={{ borderWidth: 1, borderColor: theme.border }}
                    >
                      <CardContent className="gap-1.5 px-3.5 py-3">
                        <View className="flex-row items-center gap-1.5">
                          <Trophy size={13} color={theme.accent} />
                          <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-accent">
                            Best Day
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "900",
                            color: theme.foreground,
                          }}
                        >
                          {timeline.mostAnsweredInOneDay}
                        </Text>
                        <Text
                          className="text-[11px] text-muted-foreground"
                          numberOfLines={1}
                        >
                          {timeline.mostAnsweredDate}
                        </Text>
                      </CardContent>
                    </Card>
                  </View>
                ) : null}
              </View>
            </FadeInView>

            {/* ── Section 2: Overall Performance ──────────────── */}
            <FadeInView delay={getStaggerDelay(1)}>
              {performanceQuery.isLoading ? (
                <View className="gap-3">
                  <Skeleton className="h-40 rounded-2xl" />
                  <Skeleton className="h-32 rounded-2xl" />
                </View>
              ) : performanceStats ? (
                <OverallPerformanceSection
                  stats={performanceStats}
                  theme={theme}
                />
              ) : null}
            </FadeInView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
