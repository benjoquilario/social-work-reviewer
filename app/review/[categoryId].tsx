import { useMemo, useState } from "react"
import { LEARNING_LESSONS } from "@/data/learning-center-data"
import { getReviewLibraryByCategoryId } from "@/data/review-content-data"
import { getCategoryById } from "@/data/reviewer-data"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ArrowLeft, Bookmark, Lock, Search } from "lucide-react-native"
import { Pressable, ScrollView, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Text } from "@/components/ui/text"

export default function ReviewCategoryScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const iconColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary
  const mutedIconColor =
    colorScheme === "dark"
      ? THEME.dark.mutedForeground
      : THEME.light.mutedForeground
  const params = useLocalSearchParams<{ categoryId?: string }>()
  const categoryId = params.categoryId ?? ""
  const category = getCategoryById(categoryId)
  const library = getReviewLibraryByCategoryId(categoryId)
  const [query, setQuery] = useState("")

  if (!category || !library) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-2xl font-black text-foreground">
            Review content unavailable
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">
            This category does not have a mapped review library yet.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const visibleTopics = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return library.topics
    }

    return library.topics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(normalizedQuery) ||
        topic.summary.toLowerCase().includes(normalizedQuery)
    )
  }, [library.topics, query])

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-3.5 px-4 pb-7 pt-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-2xl"
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={iconColor} strokeWidth={2.5} />
          </Pressable>

          <View className="flex-1 flex-row items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-2.5">
            <Search size={18} color={mutedIconColor} strokeWidth={2.4} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${category.title}...`}
              placeholderTextColor={mutedIconColor}
              className="flex-1 text-sm text-foreground"
            />
          </View>
        </View>

        <View className="border-chart2/30 bg-chart2/15 overflow-hidden rounded-2xl border px-4 py-3">
          <Text className="text-center text-[13px] font-semibold text-card-foreground">
            Upgrade now to access all topics.
          </Text>
        </View>

        <View className="gap-1 px-1">
          <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-primary">
            {category.groupLabel}
          </Text>
          <Text className="text-[21px] font-black leading-7 text-foreground">
            {category.title}
          </Text>
          <Text className="text-[13px] leading-5 text-muted-foreground">
            {library.overview}
          </Text>
        </View>

        <View className="px-1">
          <Text className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            {visibleTopics.length} of {library.topics.length} topics
          </Text>
        </View>

        <View className="overflow-hidden rounded-[20px] border border-border bg-card">
          {visibleTopics.map((topic, index) => {
            const primaryLesson = LEARNING_LESSONS.find((lesson) =>
              topic.lessonIds.includes(lesson.id)
            )

            return (
              <Pressable
                key={topic.id}
                className="border-b border-border/80 px-3.5 py-3.5"
                onPress={() => {
                  if (!primaryLesson) {
                    return
                  }

                  router.push({
                    pathname: "/learn/[lessonId]",
                    params: { lessonId: primaryLesson.id },
                  })
                }}
                style={{
                  borderBottomWidth: index === visibleTopics.length - 1 ? 0 : 1,
                }}
              >
                <View className="flex-row items-start gap-3">
                  <View className="pt-0.5">
                    <Bookmark
                      size={20}
                      color={mutedIconColor}
                      strokeWidth={2.1}
                    />
                  </View>

                  <View className="flex-1 gap-1.5">
                    <Text className="text-sm font-semibold leading-6 text-card-foreground">
                      {topic.title}
                    </Text>
                    <Text className="text-[12px] leading-5 text-muted-foreground">
                      {topic.summary}
                    </Text>
                  </View>

                  <View className="pt-0.5">
                    <Lock size={20} color={mutedIconColor} strokeWidth={2.1} />
                  </View>
                </View>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
