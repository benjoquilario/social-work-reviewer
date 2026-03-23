import { useMemo } from "react"
import {
  CATEGORIES,
  DAILY_TRACKER,
  PERFORMANCE_METRICS,
} from "@/data/reviewer-data"
import {
  Activity,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react-native"
import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { AppShellHeader } from "@/components/app-shell-header"

const WINDOW_LABELS = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
} as const

export default function DashboardScreen() {
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary
  const weeklyMetric = PERFORMANCE_METRICS.find(
    (metric) => metric.window === "week"
  )
  const rankedMetrics = useMemo(
    () =>
      PERFORMANCE_METRICS.map((metric) => ({
        ...metric,
        rankedCategories: [...metric.categories].sort(
          (left, right) => right.accuracy - left.accuracy
        ),
      })),
    []
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-4 py-4">
        <AppShellHeader
          eyebrow="Dashboard"
          title="Performance Metrics"
          subtitle="Read your performance like a scorecard instead of a loading bar. Each section shows ranking, strongest area, and the next topic that needs attention."
          stats={[
            { label: "Streak", value: `${DAILY_TRACKER.streakDays} days` },
            {
              label: "Weekly Avg",
              value: `${weeklyMetric?.averageScore ?? 0}%`,
            },
            {
              label: "Exam Runs",
              value: String(weeklyMetric?.examSimulations ?? 0),
            },
          ]}
        />

        <View className="flex-row gap-2.5">
          <Card className="flex-1">
            <CardContent className="gap-1.5 px-3.5 py-3.5">
              <View className="flex-row items-center gap-2">
                <Flame size={16} color={primaryColor} />
                <Text className="text-xs font-black uppercase tracking-[1.6px] text-primary">
                  Streak
                </Text>
              </View>
              <Text className="text-xl font-black text-card-foreground">
                {DAILY_TRACKER.streakDays} days
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                {DAILY_TRACKER.completedSessions}/{DAILY_TRACKER.targetSessions}{" "}
                sessions completed today.
              </Text>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardContent className="gap-1.5 px-3.5 py-3.5">
              <View className="flex-row items-center gap-2">
                <Target size={16} color={primaryColor} />
                <Text className="text-xs font-black uppercase tracking-[1.6px] text-primary">
                  Focus
                </Text>
              </View>
              <Text className="text-[13px] font-black text-card-foreground">
                {DAILY_TRACKER.focusLabel}
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                Recommended next block for today.
              </Text>
            </CardContent>
          </Card>
        </View>

        {rankedMetrics.map((metric) => {
          const strongest = CATEGORIES.find(
            (category) => category.id === metric.strongestCategoryId
          )
          const weakest = CATEGORIES.find(
            (category) => category.id === metric.weakestCategoryId
          )

          return (
            <Card key={metric.window}>
              <CardContent className="gap-3 px-3.5 py-3.5">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="gap-1">
                    <Text className="text-base font-extrabold text-card-foreground">
                      {WINDOW_LABELS[metric.window]}
                    </Text>
                    <Text className="text-[13px] text-muted-foreground">
                      {metric.questionsAnswered} questions answered •{" "}
                      {metric.examSimulations} exam runs
                    </Text>
                  </View>
                  <View className="rounded-2xl border border-primary/20 bg-primary/10 px-2.5 py-1.5">
                    <Text className="text-base font-black text-primary">
                      {metric.averageScore}%
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 rounded-2xl border border-border p-2.5">
                    <View className="flex-row items-center gap-2">
                      <TrendingUp size={14} color={primaryColor} />
                      <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                        Strongest
                      </Text>
                    </View>
                    <Text className="mt-1.5 text-[13px] font-bold text-card-foreground">
                      {strongest?.title ?? "Not available"}
                    </Text>
                  </View>

                  <View className="flex-1 rounded-2xl border border-border p-2.5">
                    <View className="flex-row items-center gap-2">
                      <Activity size={14} color={primaryColor} />
                      <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                        Needs Work
                      </Text>
                    </View>
                    <Text className="mt-1.5 text-[13px] font-bold text-card-foreground">
                      {weakest?.title ?? "Not available"}
                    </Text>
                  </View>
                </View>

                <View className="rounded-[24px] border border-border bg-background/80 p-2.5">
                  <View className="flex-row items-center gap-2">
                    <Sparkles size={14} color={primaryColor} />
                    <Text className="text-xs font-bold uppercase tracking-[1.4px] text-primary">
                      Category ranking
                    </Text>
                  </View>

                  <View className="mt-2.5 gap-2.5">
                    {metric.rankedCategories.map((categoryMetric, index) => {
                      const category = CATEGORIES.find(
                        (item) => item.id === categoryMetric.categoryId
                      )

                      return (
                        <View
                          key={`${metric.window}-${categoryMetric.categoryId}`}
                          className="flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-card px-2.5 py-2.5"
                        >
                          <View className="flex-1 flex-row items-center gap-3">
                            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                              <Text className="text-[13px] font-black text-primary">
                                {String(index + 1).padStart(2, "0")}
                              </Text>
                            </View>
                            <View className="flex-1 gap-1">
                              <Text className="text-[13px] font-bold text-card-foreground">
                                {category?.title ?? categoryMetric.categoryId}
                              </Text>
                              <Text className="text-xs leading-5 text-muted-foreground">
                                {category?.groupLabel ?? "Review category"}
                              </Text>
                            </View>
                          </View>

                          <View className="items-end gap-1">
                            <View className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
                              <Text className="text-xs font-black uppercase tracking-[1.4px] text-primary">
                                {categoryMetric.accuracy}%
                              </Text>
                            </View>
                            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {categoryMetric.answered} answered
                            </Text>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                </View>
              </CardContent>
            </Card>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}
