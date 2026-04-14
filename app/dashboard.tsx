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
  BookOpen,
  Flame,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"

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
        contentContainerClassName="pb-28"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-4">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full"
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
          <View className="flex-1">
            <Text className="text-[20px] font-black text-foreground">
              Dashboard
            </Text>
          </View>
        </View>

        {/* Accuracy hero */}
        <View className="items-center py-4">
          <View
            className="h-28 w-28 items-center justify-center rounded-full"
            style={{
              backgroundColor: withOpacity(theme.primary, 0.1),
              borderWidth: 3,
              borderColor: withOpacity(theme.primary, 0.3),
            }}
          >
            <Text className="text-[32px] font-black text-primary">
              {metric?.averageScore ?? 0}%
            </Text>
          </View>
          <Text className="mt-2 text-[13px] font-semibold text-muted-foreground">
            Overall Accuracy
          </Text>
        </View>

        {/* Quick stats row */}
        <View className="flex-row gap-2 px-4">
          <View
            className="flex-1 items-center gap-1 rounded-2xl py-3"
            style={{ backgroundColor: withOpacity(theme.primary, 0.08) }}
          >
            <BookOpen size={16} color={theme.primary} />
            <Text className="text-[16px] font-black text-foreground">
              {metric?.questionsAnswered ?? 0}
            </Text>
            <Text className="text-[10px] font-semibold text-muted-foreground">
              Questions
            </Text>
          </View>
          <View
            className="flex-1 items-center gap-1 rounded-2xl py-3"
            style={{ backgroundColor: withOpacity(theme.accent, 0.1) }}
          >
            <Flame size={16} color={theme.accent} />
            <Text className="text-[16px] font-black text-foreground">
              {DAILY_TRACKER.streakDays}
            </Text>
            <Text className="text-[10px] font-semibold text-muted-foreground">
              Day Streak
            </Text>
          </View>
          <View
            className="flex-1 items-center gap-1 rounded-2xl py-3"
            style={{ backgroundColor: withOpacity(theme.primary, 0.08) }}
          >
            <Zap size={16} color={theme.primary} />
            <Text className="text-[16px] font-black text-foreground">
              {metric?.examSimulations ?? 0}
            </Text>
            <Text className="text-[10px] font-semibold text-muted-foreground">
              Exam Runs
            </Text>
          </View>
        </View>

        {/* Period toggle */}
        <View
          className="mx-4 mt-4 flex-row gap-1 rounded-2xl p-1"
          style={{ backgroundColor: withOpacity(theme.primary, 0.06) }}
        >
          {WINDOWS.map((windowOption) => {
            const isActive = activeWindow === windowOption.value
            return (
              <Pressable
                key={windowOption.value}
                onPress={() => setActiveWindow(windowOption.value)}
                className="flex-1 items-center justify-center rounded-xl py-2.5"
                style={{
                  backgroundColor: isActive ? theme.card : "transparent",
                  shadowColor: isActive ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.06 : 0,
                  shadowRadius: 4,
                  elevation: isActive ? 2 : 0,
                }}
              >
                <Text
                  className="text-[13px] font-bold"
                  style={{
                    color: isActive ? theme.primary : theme.mutedForeground,
                  }}
                >
                  {windowOption.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Strongest / Weakest */}
        <View className="mt-4 flex-row gap-2.5 px-4">
          <View
            className="flex-1 gap-2 rounded-2xl p-3.5"
            style={{ backgroundColor: withOpacity(theme.success, 0.08) }}
          >
            <View className="flex-row items-center gap-1.5">
              <TrendingUp size={14} color={theme.success} />
              <Text
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: theme.success }}
              >
                Strongest
              </Text>
            </View>
            <Text
              className="text-[14px] font-bold text-foreground"
              numberOfLines={2}
            >
              {strongest?.title ?? "—"}
            </Text>
          </View>
          <View
            className="flex-1 gap-2 rounded-2xl p-3.5"
            style={{ backgroundColor: withOpacity(theme.destructive, 0.08) }}
          >
            <View className="flex-row items-center gap-1.5">
              <Activity size={14} color={theme.destructive} />
              <Text
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: theme.destructive }}
              >
                Needs Work
              </Text>
            </View>
            <Text
              className="text-[14px] font-bold text-foreground"
              numberOfLines={2}
            >
              {weakest?.title ?? "—"}
            </Text>
          </View>
        </View>

        {/* Focus card */}
        <View
          className="mx-4 mt-3 flex-row items-center gap-3 rounded-2xl px-4 py-3.5"
          style={{
            backgroundColor: withOpacity(theme.primary, 0.08),
            borderWidth: 1,
            borderColor: withOpacity(theme.primary, 0.15),
          }}
        >
          <Target size={18} color={theme.primary} />
          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Current Focus
            </Text>
            <Text
              className="text-[14px] font-bold text-foreground"
              numberOfLines={1}
            >
              {DAILY_TRACKER.focusLabel}
            </Text>
          </View>
          <Text className="text-[12px] font-semibold text-muted-foreground">
            {DAILY_TRACKER.completedSessions}/{DAILY_TRACKER.targetSessions}{" "}
            today
          </Text>
        </View>

        {/* Category ranking */}
        {metric ? (
          <View className="mt-5 px-4">
            <Text className="mb-3 text-[11px] font-black uppercase tracking-[1.4px] text-muted-foreground">
              Category Performance
            </Text>
            <View className="gap-2.5">
              {rankedCategories.map((catMetric, index) => {
                const category = CATEGORIES.find(
                  (item) => item.id === catMetric.categoryId
                )
                const barColor =
                  catMetric.accuracy >= 80
                    ? theme.success
                    : catMetric.accuracy >= 65
                      ? theme.primary
                      : theme.destructive

                return (
                  <View
                    key={catMetric.categoryId}
                    className="gap-2 rounded-2xl px-3.5 py-3"
                    style={{ backgroundColor: theme.card }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-2.5">
                        <View
                          className="h-7 w-7 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: withOpacity(barColor, 0.12),
                          }}
                        >
                          <Text
                            className="text-[11px] font-black"
                            style={{ color: barColor }}
                          >
                            {index + 1}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-[13px] font-bold text-foreground"
                            numberOfLines={1}
                          >
                            {category?.title ?? catMetric.categoryId}
                          </Text>
                          <Text className="text-[11px] text-muted-foreground">
                            {catMetric.answered} answered
                          </Text>
                        </View>
                      </View>
                      <Text
                        className="text-[15px] font-black"
                        style={{ color: barColor }}
                      >
                        {catMetric.accuracy}%
                      </Text>
                    </View>
                    <View className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${catMetric.accuracy}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
