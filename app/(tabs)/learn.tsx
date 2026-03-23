import { useMemo } from "react"
import { LEARNING_LESSONS } from "@/data/learning-center-data"
import { CATEGORIES } from "@/data/reviewer-data"
import { BookOpenText, Lock } from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

export default function LearningCenterScreen() {
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary
  const sectionNumbers = ["I", "II", "III", "IV", "V", "VI"]
  const groupedSections = useMemo(
    () =>
      Array.from(
        CATEGORIES.reduce((groups, category) => {
          const currentGroup = groups.get(category.groupLabel) ?? []

          currentGroup.push(category)
          groups.set(category.groupLabel, currentGroup)

          return groups
        }, new Map<string, typeof CATEGORIES>())
      ).map(([groupLabel, categories]) => ({
        groupLabel,
        categories,
        totalTopics: categories.reduce(
          (sum, category) => sum + category.topicCount,
          0
        ),
        totalItems: categories.reduce(
          (sum, category) => sum + category.itemCount,
          0
        ),
      })),
    []
  )
  const totalTopics = CATEGORIES.reduce(
    (sum, category) => sum + category.topicCount,
    0
  )
  const linkedLessons = new Set(LEARNING_LESSONS.map((lesson) => lesson.id))
    .size

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-4 pb-7 pt-4">
        <View className="gap-2">
          <Text className="text-[11px] font-black uppercase tracking-[1.6px] text-primary">
            Review Content
          </Text>
          <Text className="text-[23px] font-black leading-7 text-foreground">
            Learning Material Library
          </Text>
          <Text className="text-[13px] leading-5 text-muted-foreground">
            Browse numbered sections, open a topic cluster, then move into the
            lesson material with fewer taps.
          </Text>
          <View className="mt-1.5 flex-row gap-2">
            <View className="rounded-full border border-border bg-card px-3 py-2">
              <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                {groupedSections.length} sections
              </Text>
            </View>
            <View className="rounded-full border border-border bg-card px-3 py-2">
              <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                {totalTopics} topics
              </Text>
            </View>
            <View className="rounded-full border border-border bg-card px-3 py-2">
              <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                {linkedLessons} lessons
              </Text>
            </View>
          </View>
        </View>

        <Card>
          <CardContent className="gap-2.5 px-3.5 py-3.5">
            <View className="flex-row items-center gap-2">
              <BookOpenText size={16} color={primaryColor} />
              <Text className="text-sm font-extrabold text-card-foreground">
                How to use this stack
              </Text>
            </View>
            <Text className="text-[13px] leading-5 text-muted-foreground">
              Open one numbered section, pick a topic card, then move into the
              linked review lessons. Each card keeps the navigation short and
              focused for mobile study sessions.
            </Text>
          </CardContent>
        </Card>

        {groupedSections.map((section, index) => (
          <View key={section.groupLabel} className="gap-3">
            <View className="gap-1">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="flex-1 text-[18px] font-black leading-7 text-foreground">
                  {sectionNumbers[index] ?? String(index + 1)}:{" "}
                  {section.groupLabel}
                </Text>
                <Text className="pt-1 text-[15px] font-black text-primary">
                  Unlock
                </Text>
              </View>
              <Text className="text-[13px] font-semibold text-muted-foreground">
                {section.totalItems} Items
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 pr-4"
            >
              {section.categories.map((category) => {
                return (
                  <Pressable
                    key={category.id}
                    className="w-[236px] rounded-2xl border border-border bg-card"
                    disabled
                  >
                    <View className="min-h-[78px] px-3.5 py-3.5">
                      <Text className="text-[15px] font-semibold leading-6 text-card-foreground">
                        {category.title}
                      </Text>
                    </View>

                    <View className="bg-chart2/15 flex-row items-center justify-between border-t border-border px-3.5 py-2.5">
                      <Text className="text-[12px] font-black uppercase tracking-[1px] text-card-foreground">
                        {category.topicCount} Topics
                      </Text>
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-black/70">
                        <Lock size={13} color="#ffffff" />
                      </View>
                    </View>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
