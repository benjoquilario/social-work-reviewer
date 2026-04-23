import { memo, useCallback, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { ArrowLeft } from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  getOverallPerformanceStats,
  getQuestionsAnsweredTimeline,
  type TimelineWindow,
} from "@/lib/performance-stats"
import { getStaggerDelay } from "@/lib/motion"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { FadeInView } from "@/components/ui/motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"

import { ActivityMetricsSection } from "@/components/dashboard/activity-metrics"
import { OverallPerformanceSection } from "@/components/dashboard/overall-performance"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

const DashboardUnauthenticatedState = memo(function DashboardUnauthenticatedState({
  theme,
}: {
  theme: ThemePalette
}) {
  return (
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
  )
})

const DashboardLoadingState = memo(function DashboardLoadingState() {
  return (
    <View className="gap-3 px-4">
      <Skeleton className="h-56 rounded-2xl" />
      <View className="flex-row gap-2.5">
        <Skeleton className="h-24 flex-1 rounded-2xl" />
        <Skeleton className="h-24 flex-1 rounded-2xl" />
      </View>
      <Skeleton className="h-64 rounded-2xl" />
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
    queryFn: () => getQuestionsAnsweredTimeline(user?.$id ?? "", window, offset),
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

  const isLoadingContent = timelineQuery.isLoading && performanceQuery.isLoading

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
          <DashboardUnauthenticatedState theme={theme} />
        ) : isLoadingContent ? (
          <DashboardLoadingState />
        ) : (
          <View className="gap-5 px-4">
            <FadeInView delay={getStaggerDelay(0)}>
              <ActivityMetricsSection
                timeline={timeline}
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
                  <Skeleton className="h-40 rounded-2xl" />
                  <Skeleton className="h-32 rounded-2xl" />
                </View>
              ) : performanceStats ? (
                <OverallPerformanceSection stats={performanceStats} theme={theme} />
              ) : null}
            </FadeInView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
