import { memo, useCallback, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getStaggerDelay } from "@/lib/motion"
import {
  getDashboardInsights,
  getDashboardReportMetrics,
  getOverallPerformanceStats,
  getQuestionsAnsweredTimeline,
  type TimelineWindow,
} from "@/lib/performance-stats"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { FadeInView } from "@/components/ui/motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { ActivityMetricsSection } from "@/components/dashboard/activity-metrics"
import { OverallPerformanceSection } from "@/components/dashboard/overall-performance"
import { ProgressInsightsSection } from "@/components/dashboard/progress-insights"
import { ScreenHeader } from "@/components/screen-header"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

const DashboardUnauthenticatedState = memo(
  function DashboardUnauthenticatedState({ theme }: { theme: ThemePalette }) {
    return (
      <FadeInView delay={getStaggerDelay(0)}>
        <Card
          className="mx-4"
          style={{ borderWidth: 1, borderColor: theme.border }}
        >
          <CardContent className="gap-1.5">
            <Text className="text-sm font-bold text-card-foreground">
              Sign in to view performance
            </Text>
            <Text className="text-xs leading-5 text-muted-foreground">
              Your quiz performance and progress data appear after login.
            </Text>
          </CardContent>
        </Card>
      </FadeInView>
    )
  }
)

const DashboardLoadingState = memo(function DashboardLoadingState() {
  return (
    <View className="gap-3 px-4">
      <Skeleton className="h-56 rounded-xl" />
      <View className="flex-row gap-2.5">
        <Skeleton className="h-24 flex-1 rounded-xl" />
        <Skeleton className="h-24 flex-1 rounded-xl" />
      </View>
      <Skeleton className="h-64 rounded-xl" />
    </View>
  )
})

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

  const reportMetricsQuery = useQuery({
    queryKey: ["dashboard-report-metrics", user?.$id],
    enabled: Boolean(user?.$id),
    queryFn: () => getDashboardReportMetrics(user?.$id ?? ""),
    staleTime: 1000 * 15,
  })

  const insightsQuery = useQuery({
    queryKey: ["dashboard-insights", user?.$id],
    enabled: Boolean(user?.$id),
    queryFn: () => getDashboardInsights(user?.$id ?? ""),
    staleTime: 1000 * 15,
  })

  const timeline = timelineQuery.data ?? null
  const performanceStats = performanceQuery.data ?? null
  const reportMetrics = reportMetricsQuery.data ?? null
  const insights = insightsQuery.data ?? null

  const isLoadingContent =
    timelineQuery.isLoading ||
    performanceQuery.isLoading ||
    reportMetricsQuery.isLoading ||
    insightsQuery.isLoading

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-5 pb-28"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-4 pt-1">
          <ScreenHeader
            title="Performance Dashboard"
            onBack={() => {
              if (router.canGoBack()) {
                router.back()
                return
              }
              router.replace("/(tabs)")
            }}
          />
        </View>

        {!user ? (
          <DashboardUnauthenticatedState theme={theme} />
        ) : isLoadingContent ? (
          <DashboardLoadingState />
        ) : (
          <View className="gap-5 px-4">
            <FadeInView delay={getStaggerDelay(0)}>
              <ActivityMetricsSection
                timeline={timeline}
                reportMetrics={reportMetrics}
                isLoading={timelineQuery.isLoading}
                window={window}
                onWindowChange={handleWindowChange}
                selectedBarIndex={selectedBarIndex}
                onSelectBar={setSelectedBarIndex}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                theme={theme}
              />
            </FadeInView>

            <FadeInView delay={getStaggerDelay(1)}>
              {performanceQuery.isLoading ? (
                <View className="gap-3">
                  <Skeleton className="h-40 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                </View>
              ) : performanceStats ? (
                <OverallPerformanceSection
                  stats={performanceStats}
                  theme={theme}
                />
              ) : null}
            </FadeInView>

            <FadeInView delay={getStaggerDelay(2)}>
              {insightsQuery.isLoading ? (
                <View className="gap-3">
                  <Skeleton className="h-32 rounded-xl" />
                  <Skeleton className="h-40 rounded-xl" />
                </View>
              ) : insights ? (
                <ProgressInsightsSection insights={insights} theme={theme} />
              ) : null}
            </FadeInView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
