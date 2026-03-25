import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  LockKeyhole,
  Search,
} from "lucide-react-native"
import { Pressable, ScrollView, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  getLearningSubjectById,
  listLearningTopicsBySubjectId,
} from "@/lib/learning-content"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

export default function ReviewCategoryScreen() {
  const router = useRouter()
  const { isAuthenticated, profile, refreshProfile } = useAuth()
  const colorScheme = useColorScheme()
  const iconColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary
  const mutedIconColor =
    colorScheme === "dark"
      ? THEME.dark.mutedForeground
      : THEME.light.mutedForeground
  const params = useLocalSearchParams<{ categoryId?: string }>()
  const categoryId = params.categoryId ?? ""
  const [query, setQuery] = useState("")
  const isPremiumUser = profile?.isPremium === true

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const subjectQuery = useQuery({
    queryKey: ["learning-subject", categoryId, isPremiumUser],
    enabled: Boolean(categoryId),
    queryFn: async () => {
      const [category, topics] = await Promise.all([
        getLearningSubjectById(categoryId, { viewerIsPremium: isPremiumUser }),
        listLearningTopicsBySubjectId(categoryId, {
          viewerIsPremium: isPremiumUser,
        }),
      ])

      return { category, topics }
    },
  })

  const category = subjectQuery.data?.category ?? null
  const topics = subjectQuery.data?.topics ?? []

  const visibleTopics = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return topics
    }

    return topics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(normalizedQuery) ||
        topic.description.toLowerCase().includes(normalizedQuery)
    )
  }, [query, topics])

  if (subjectQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-3.5 px-4 pb-7 pt-3">
          <Skeleton className="h-11 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (subjectQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-2 px-6">
          <Text className="text-center text-2xl font-black text-foreground">
            Review content unavailable
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            {subjectQuery.error instanceof Error
              ? subjectQuery.error.message
              : "Unable to load topics from Appwrite."}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!category) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-2 px-6">
          <Text className="text-center text-2xl font-black text-foreground">
            Subject not found
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            This subject ID does not exist in Appwrite.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

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
              placeholder={`Search ${category.name}...`}
              placeholderTextColor={mutedIconColor}
              className="flex-1 text-sm text-foreground"
            />
          </View>
        </View>

        <View className="border-chart2/30 bg-chart2/15 overflow-hidden rounded-2xl border px-4 py-3">
          <Text className="text-center text-[13px] font-semibold text-card-foreground">
            Topics from Appwrite CMS
          </Text>
        </View>

        <View className="gap-1 px-1">
          <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-primary">
            Subject
          </Text>
          <Text className="text-[21px] font-black leading-7 text-foreground">
            {category.name}
          </Text>
          <Text className="text-[13px] leading-5 text-muted-foreground">
            {category.description}
          </Text>
        </View>

        <View className="px-1">
          <Text className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            {visibleTopics.length} of {topics.length} topics
          </Text>
        </View>

        <View className="overflow-hidden rounded-[20px] border border-border bg-card">
          {visibleTopics.length === 0 ? (
            <View className="px-3.5 py-4">
              <Text className="text-[13px] leading-5 text-muted-foreground">
                No topics found for this subject yet.
              </Text>
            </View>
          ) : null}

          {visibleTopics.map((topic, index) => {
            const isUnavailable = topic.materialCount === 0
            const isTopicBlocked = topic.isLocked || isUnavailable

            return (
              <Pressable
                key={topic.id}
                className="border-b border-border/80 px-3.5 py-3.5"
                disabled={isTopicBlocked}
                onPress={() =>
                  router.push({
                    pathname: "/learn/topic/[topicId]",
                    params: { topicId: topic.id },
                  })
                }
                style={{
                  borderBottomWidth: index === visibleTopics.length - 1 ? 0 : 1,
                  opacity: isTopicBlocked ? 0.65 : 1,
                }}
              >
                <View className="flex-row items-start gap-3">
                  <View className="pt-0.5">
                    {topic.isLocked ? (
                      <LockKeyhole
                        size={20}
                        color={mutedIconColor}
                        strokeWidth={2.1}
                      />
                    ) : (
                      <Bookmark
                        size={20}
                        color={mutedIconColor}
                        strokeWidth={2.1}
                      />
                    )}
                  </View>

                  <View className="flex-1 gap-1.5">
                    <Text className="text-sm font-semibold leading-6 text-card-foreground">
                      {topic.title}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {topic.isLocked ? (
                        <View className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1">
                          <Text className="text-[10px] font-bold uppercase tracking-wide text-destructive">
                            Premium locked
                          </Text>
                        </View>
                      ) : null}
                      {!topic.isLocked &&
                      !isPremiumUser &&
                      topic.hasPremiumContent ? (
                        <View className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1">
                          <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
                            {topic.freeMaterialCount} free ·{" "}
                            {topic.premiumMaterialCount} premium
                          </Text>
                        </View>
                      ) : null}
                      {isUnavailable ? (
                        <View className="rounded-full border border-border bg-background px-2.5 py-1">
                          <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            No materials yet
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-[12px] leading-5 text-muted-foreground">
                      {isUnavailable
                        ? "This topic exists in Appwrite, but no learning materials are attached yet."
                        : topic.isLocked
                          ? "This topic is premium-only for free users."
                          : topic.description}
                    </Text>
                    <Text className="text-[11px] font-bold uppercase tracking-[1px] text-primary">
                      {topic.freeMaterialCount}/{topic.materialCount} visible
                      materials
                    </Text>
                  </View>

                  <View className="pt-0.5">
                    {topic.isLocked ? (
                      <LockKeyhole
                        size={20}
                        color={mutedIconColor}
                        strokeWidth={2.1}
                      />
                    ) : (
                      <ChevronRight
                        size={20}
                        color={mutedIconColor}
                        strokeWidth={2.1}
                      />
                    )}
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
