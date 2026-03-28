import { useMemo, useState } from "react"
import {
  CATEGORIES,
  DAILY_TRACKER,
  PERFORMANCE_METRICS,
  type PerformanceWindow,
} from "@/data/reviewer-data"
import { useRouter } from "expo-router"
import {
  Activity,
  ArrowLeft,
  EllipsisVertical,
  Flame,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  UserCircle2,
} from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

const WINDOWS: { label: string; value: PerformanceWindow }[] = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
]

export default function DashboardScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const [activeWindow, setActiveWindow] = useState<PerformanceWindow>("week")

  const metric = useMemo(
    () => PERFORMANCE_METRICS.find((m) => m.window === activeWindow),
    [activeWindow]
  )

  const rankedCategories = useMemo(
    () =>
      [...(metric?.categories ?? [])].sort((a, b) => b.accuracy - a.accuracy),
    [metric]
  )

  const strongest = CATEGORIES.find((c) => c.id === metric?.strongestCategoryId)
  const weakest = CATEGORIES.find((c) => c.id === metric?.weakestCategoryId)

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-28 pt-5"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-2xl"
            onPress={() => {
              if (router.canGoBack()) {
                router.back()
                return
              }

              router.replace("/(tabs)")
            }}
          >
            <ArrowLeft size={22} color={theme.primary} strokeWidth={2.5} />
          </Pressable>

          <View className="flex-row items-center gap-4">
            <Search size={20} color={theme.primary} strokeWidth={2.2} />
            <UserCircle2 size={22} color={theme.primary} strokeWidth={2.1} />
            <EllipsisVertical
              size={20}
              color={theme.primary}
              strokeWidth={2.2}
            />
          </View>
        </View>

        {/* Header */}
        <View className="gap-0.5">
          <Text className="text-[11px] font-black uppercase tracking-[1.8px] text-primary">
            Performance
          </Text>
          <Text className="text-[22px] font-black leading-tight text-foreground">
            Your Dashboard
          </Text>
          <Text className="text-[13px] leading-5 text-muted-foreground">
            Track your progress, strengths, and areas for improvement.
          </Text>
        </View>

        {/* Streak + Focus row */}
        <View className="flex-row gap-2.5">
          <View
            className="flex-1 gap-1 rounded-3xl p-4"
            style={{
              backgroundColor: withOpacity(theme.accent, 0.18),
              borderWidth: 1,
              borderColor: withOpacity(theme.accent, 0.3),
            }}
          >
            <View className="flex-row items-center gap-1.5">
              <Flame size={14} color={theme.accent} />
              <Text
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: theme.accent }}
              >
                Streak
              </Text>
            </View>
            <Text className="text-2xl font-black text-foreground">
              {DAILY_TRACKER.streakDays}
            </Text>
            <Text className="text-[11px] text-muted-foreground">
              {DAILY_TRACKER.completedSessions}/{DAILY_TRACKER.targetSessions}{" "}
              today
            </Text>
          </View>

          <View
            className="flex-1 gap-1 rounded-3xl p-4"
            style={{
              backgroundColor: withOpacity(theme.primary, 0.12),
              borderWidth: 1,
              borderColor: withOpacity(theme.primary, 0.25),
            }}
          >
            <View className="flex-row items-center gap-1.5">
              <Target size={14} color={theme.primary} />
              <Text className="text-[10px] font-black uppercase tracking-widest text-primary">
                Focus
              </Text>
            </View>
            <Text
              className="text-[13px] font-black text-foreground"
              numberOfLines={2}
            >
              {DAILY_TRACKER.focusLabel}
            </Text>
            <Text className="text-[11px] text-muted-foreground">
              Next block
            </Text>
          </View>
        </View>

        {/* Time window tabs */}
        <View
          className="flex-row gap-1 rounded-2xl p-1"
          style={{ backgroundColor: theme.muted }}
        >
          {WINDOWS.map((w) => {
            const isActive = activeWindow === w.value
            return (
              <Pressable
                key={w.value}
                onPress={() => setActiveWindow(w.value)}
                className="flex-1 items-center justify-center rounded-xl py-2.5"
                style={{
                  backgroundColor: isActive ? theme.card : "transparent",
                  shadowColor: isActive ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.08 : 0,
                  shadowRadius: 3,
                  elevation: isActive ? 2 : 0,
                }}
              >
                <Text
                  className="text-[13px] font-black"
                  style={{
                    color: isActive ? theme.primary : theme.mutedForeground,
                  }}
                >
                  {w.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Metric summary card */}
        {metric ? (
          <Card className="rounded-3xl">
            <CardContent className="gap-3 px-4 py-4">
              <View className="flex-row items-center justify-between">
                <View className="gap-0.5">
                  <Text className="text-base font-extrabold text-card-foreground">
                    {WINDOWS.find((w) => w.value === activeWindow)?.label}{" "}
                    Overview
                  </Text>
                  <Text className="text-[13px] text-muted-foreground">
                    {metric.questionsAnswered} answered ·{" "}
                    {metric.examSimulations} exam runs
                  </Text>
                </View>
                <View
                  className="rounded-2xl px-3 py-1.5"
                  style={{
                    backgroundColor: withOpacity(theme.primary, 0.15),
                    borderWidth: 1,
                    borderColor: withOpacity(theme.primary, 0.3),
                  }}
                >
                  <Text className="text-lg font-black text-primary">
                    {metric.averageScore}%
                  </Text>
                </View>
              </View>

              {/* Strongest / Weakest */}
              <View className="flex-row gap-3">
                <View
                  className="flex-1 gap-1 rounded-2xl p-3"
                  style={{ borderWidth: 1, borderColor: theme.border }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <TrendingUp size={13} color={theme.primary} />
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
                      Strongest
                    </Text>
                  </View>
                  <Text
                    className="text-[13px] font-bold text-card-foreground"
                    numberOfLines={2}
                  >
                    {strongest?.title ?? "—"}
                  </Text>
                </View>
                <View
                  className="flex-1 gap-1 rounded-2xl p-3"
                  style={{ borderWidth: 1, borderColor: theme.border }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <Activity size={13} color={theme.destructive} />
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-destructive">
                      Needs Work
                    </Text>
                  </View>
                  <Text
                    className="text-[13px] font-bold text-card-foreground"
                    numberOfLines={2}
                  >
                    {weakest?.title ?? "—"}
                  </Text>
                </View>
              </View>

              {/* Category ranking with progress bars */}
              <View
                className="gap-3 rounded-2xl p-3"
                style={{
                  backgroundColor: isDark ? theme.muted : "hsl(243 30% 97%)",
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View className="flex-row items-center gap-2">
                  <Sparkles size={14} color={theme.primary} />
                  <Text className="text-xs font-black uppercase tracking-[1.4px] text-primary">
                    Category Ranking
                  </Text>
                </View>

                {rankedCategories.map((catMetric, index) => {
                  const category = CATEGORIES.find(
                    (c) => c.id === catMetric.categoryId
                  )
                  return (
                    <View key={catMetric.categoryId} className="gap-1.5">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 flex-row items-center gap-2">
                          <View
                            className="h-7 w-7 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: withOpacity(theme.primary, 0.15),
                            }}
                          >
                            <Text className="text-[11px] font-black text-primary">
                              {String(index + 1).padStart(2, "0")}
                            </Text>
                          </View>
                          <Text
                            className="flex-1 text-[13px] font-bold text-card-foreground"
                            numberOfLines={1}
                          >
                            {category?.title ?? catMetric.categoryId}
                          </Text>
                        </View>
                        <Text className="ml-2 text-[13px] font-black text-primary">
                          {catMetric.accuracy}%
                        </Text>
                      </View>

                      {/* Progress bar */}
                      <View className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${catMetric.accuracy}%`,
                            backgroundColor:
                              catMetric.accuracy >= 80
                                ? theme.success
                                : catMetric.accuracy >= 65
                                  ? theme.primary
                                  : theme.destructive,
                          }}
                        />
                      </View>
                      <Text className="text-[11px] text-muted-foreground">
                        {catMetric.answered} answered · {category?.groupLabel}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </CardContent>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
