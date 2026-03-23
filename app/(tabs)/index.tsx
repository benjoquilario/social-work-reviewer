import {
  CATEGORIES,
  DAILY_TRACKER,
  FULL_EXAM_PRESETS,
  PERFORMANCE_METRICS,
} from "@/data/reviewer-data"
import { useRouter } from "expo-router"
import {
  ArrowRight,
  BookOpenText,
  ChartColumn,
  Clock3,
  FolderOpen,
  MessagesSquare,
  Newspaper,
  Rocket,
  Target,
} from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { AppShellHeader } from "@/components/app-shell-header"

export default function ReviewerHomeScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary
  const weeklyMetric = PERFORMANCE_METRICS.find(
    (metric) => metric.window === "week"
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-4 pb-7 pt-4">
        <AppShellHeader
          eyebrow="Daily Review System"
          title="Professional Reviewer"
          subtitle="Build exam confidence with timed reviews, full simulations, topic drills, and a cleaner performance dashboard."
          stats={[
            {
              label: "Today",
              value: `${DAILY_TRACKER.completedSessions}/${DAILY_TRACKER.targetSessions}`,
            },
            {
              label: "Streak",
              value: `${DAILY_TRACKER.streakDays} days`,
            },
            {
              label: "Weekly Avg",
              value: `${weeklyMetric?.averageScore ?? 0}%`,
            },
          ]}
        />

        <View className="flex-row gap-2.5">
          <Card className="flex-1">
            <CardContent className="gap-1.5 px-3.5 py-3.5">
              <View className="flex-row items-center gap-2">
                <Clock3 size={14} color={primaryColor} />
                <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                  Pacing
                </Text>
              </View>
              <Text className="text-[13px] font-black text-card-foreground">
                {DAILY_TRACKER.completedSessions}/{DAILY_TRACKER.targetSessions}{" "}
                today
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                {DAILY_TRACKER.streakDays}-day streak. Focus:{" "}
                {DAILY_TRACKER.focusLabel}.
              </Text>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardContent className="gap-1.5 px-3.5 py-3.5">
              <View className="flex-row items-center gap-2">
                <Target size={14} color={primaryColor} />
                <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                  Focus
                </Text>
              </View>
              <Text className="text-[13px] font-black text-card-foreground">
                {weeklyMetric?.averageScore ?? 0}% average
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                {weeklyMetric?.questionsAnswered ?? 0} items answered this week.
              </Text>
            </CardContent>
          </Card>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-[17px] font-extrabold text-foreground">
              Dashboard Snapshot
            </Text>
            <Pressable onPress={() => router.push("/dashboard")}>
              <Text className="text-xs font-black uppercase tracking-[1.6px] text-primary">
                Open Dashboard
              </Text>
            </Pressable>
          </View>

          <Card>
            <CardContent className="gap-2.5 px-3.5 py-3.5">
              <View className="flex-row items-center gap-2">
                <ChartColumn size={18} color={primaryColor} />
                <Text className="text-sm font-bold text-card-foreground">
                  Weekly performance
                </Text>
              </View>
              <Text className="text-[13px] leading-5 text-muted-foreground">
                Strongest area this week:{" "}
                {CATEGORIES.find(
                  (category) =>
                    category.id === weeklyMetric?.strongestCategoryId
                )?.title ?? "Not available"}
              </Text>
              <Text className="text-[13px] leading-5 text-muted-foreground">
                Weakest area this week:{" "}
                {CATEGORIES.find(
                  (category) => category.id === weeklyMetric?.weakestCategoryId
                )?.title ?? "Not available"}
              </Text>
            </CardContent>
          </Card>
        </View>

        <View className="gap-3">
          <Text className="text-[17px] font-extrabold text-foreground">
            Quick Access
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2.5 pr-4"
          >
            <Pressable
              className="w-[208px] rounded-2xl"
              onPress={() => router.push("/learn")}
            >
              <Card>
                <CardContent className="gap-1.5 px-3.5 py-3.5">
                  <BookOpenText size={18} color={primaryColor} />
                  <Text className="text-sm font-bold text-card-foreground">
                    Review Content
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    Open numbered review sections fast.
                  </Text>
                </CardContent>
              </Card>
            </Pressable>

            <Pressable
              className="w-[208px] rounded-2xl"
              onPress={() => router.push("/community")}
            >
              <Card>
                <CardContent className="gap-1.5 px-3.5 py-3.5">
                  <MessagesSquare size={18} color={primaryColor} />
                  <Text className="text-sm font-bold text-card-foreground">
                    Community
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    Ask questions and learn from peers.
                  </Text>
                </CardContent>
              </Card>
            </Pressable>

            <Pressable
              className="w-[208px] rounded-2xl"
              onPress={() => router.push("/news")}
            >
              <Card>
                <CardContent className="gap-1.5 px-3.5 py-3.5">
                  <Newspaper size={18} color={primaryColor} />
                  <Text className="text-sm font-bold text-card-foreground">
                    Latest News
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    See new materials and releases.
                  </Text>
                </CardContent>
              </Card>
            </Pressable>

            <Pressable
              className="w-[208px] rounded-2xl"
              onPress={() => router.push("/dashboard")}
            >
              <Card>
                <CardContent className="gap-1.5 px-3.5 py-3.5">
                  <ChartColumn size={18} color={primaryColor} />
                  <Text className="text-sm font-bold text-card-foreground">
                    Dashboard
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    Review progress, trends, and weak areas.
                  </Text>
                </CardContent>
              </Card>
            </Pressable>
          </ScrollView>
        </View>

        <View className="gap-3">
          <Text className="text-[17px] font-extrabold text-foreground">
            Full Exam Simulation
          </Text>

          {FULL_EXAM_PRESETS.map((exam) => (
            <Pressable
              key={exam.id}
              className="rounded-2xl"
              onPress={() =>
                router.push({
                  pathname: "/quiz",
                  params: {
                    categoryId: "all-categories",
                    totalQuestions: String(exam.totalQuestions),
                    minutes: String(exam.minutes),
                    examId: exam.id,
                  },
                })
              }
            >
              <Card>
                <CardContent className="gap-2 px-3.5 py-3.5">
                  <View className="flex-row items-start gap-2">
                    <Rocket size={18} color={primaryColor} />
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-extrabold leading-6 text-card-foreground">
                        {exam.title}
                      </Text>
                      <Text className="text-[13px] leading-5 text-muted-foreground">
                        {exam.description}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[13px] font-bold uppercase tracking-wide text-primary">
                    {exam.totalQuestions} items • {exam.minutes} minutes
                  </Text>
                </CardContent>
              </Card>
            </Pressable>
          ))}
        </View>

        <View className="gap-3">
          <Text className="text-[17px] font-extrabold text-foreground">
            Quiz Categories
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pr-4"
          >
            {CATEGORIES.map((category) => (
              <View key={category.id} className="w-[274px] rounded-2xl">
                <Card>
                  <CardContent className="gap-2 px-3.5 py-3.5">
                    <View className="flex-row items-start gap-2">
                      <FolderOpen size={18} color={primaryColor} />
                      <View className="flex-1 gap-1">
                        <Text className="text-base font-extrabold leading-6 text-card-foreground">
                          {category.title}
                        </Text>
                        <Text className="text-[12px] font-bold uppercase tracking-wide text-primary">
                          {category.itemCount} items • {category.topicCount}{" "}
                          topics
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[13px] leading-5 text-muted-foreground">
                      {category.description}
                    </Text>
                    <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {category.groupLabel}
                    </Text>
                    <View className="mt-2 flex-row gap-2.5">
                      <Pressable
                        className="flex-1 flex-row items-center justify-center gap-1 rounded-2xl border border-primary/20 bg-primary/10 px-2.5 py-2.5"
                        onPress={() =>
                          router.push({
                            pathname: "/mode",
                            params: { categoryId: category.id },
                          })
                        }
                      >
                        <Text className="text-[12px] font-bold uppercase tracking-wide text-primary">
                          Timed
                        </Text>
                        <ArrowRight size={13} color={primaryColor} />
                      </Pressable>
                      <Pressable
                        className="flex-1 items-center justify-center rounded-2xl border border-border px-2.5 py-2.5"
                        onPress={() =>
                          router.push({
                            pathname: "/review/[categoryId]",
                            params: { categoryId: category.id },
                          })
                        }
                      >
                        <Text className="text-[12px] font-bold uppercase tracking-wide text-card-foreground">
                          Topics
                        </Text>
                      </Pressable>
                    </View>
                  </CardContent>
                </Card>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
