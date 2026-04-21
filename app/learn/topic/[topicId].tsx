import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowLeft,
  ChevronRight,
  EllipsisVertical,
  LockKeyhole,
  Search,
  UserCircle2,
} from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getLearningTopicDetail } from "@/lib/learning-content"
import { listLearningMaterialStatusesByTopic } from "@/lib/progress"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"

import { getMaterialContentPreview } from "../../../lib/learning-material-content"

export default function TopicDetailScreen() {
  const router = useRouter()
  const user = useAuth((state) => state.user)
  const isAuthenticated = useAuth((state) => state.isAuthenticated)
  const profile = useAuth((state) => state.profile)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  const params = useLocalSearchParams<{ topicId?: string }>()
  const colorScheme = useColorScheme()
  const activeTheme = colorScheme === "dark" ? THEME.dark : THEME.light
  const primaryColor = activeTheme.primary

  const topicId = params.topicId ?? ""
  const isPremiumUser = profile?.isPremium === true

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const topicQuery = useQuery({
    queryKey: ["learning-topic-detail", topicId, isPremiumUser],
    enabled: Boolean(topicId),
    queryFn: () =>
      getLearningTopicDetail(topicId, { viewerIsPremium: isPremiumUser }),
  })

  const materialStatusesQuery = useQuery({
    queryKey: ["topic-learning-material-statuses", user?.$id, topicId],
    enabled: Boolean(user?.$id) && Boolean(topicId),
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: () =>
      listLearningMaterialStatusesByTopic(user?.$id ?? "", topicId),
  })

  const topicDetail = topicQuery.data ?? null
  const materialStatusById = materialStatusesQuery.data ?? {}
  const shouldShowStatusChips =
    Boolean(user) && !materialStatusesQuery.isLoading

  if (topicQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-4 px-4 pb-7 pt-3"
        >
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (topicQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-center text-2xl font-black text-foreground">
            Topic unavailable
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            {topicQuery.error instanceof Error
              ? topicQuery.error.message
              : "Unable to load topic materials from Appwrite."}
          </Text>
          <Button
            className="h-11 w-full"
            onPress={() => router.replace("/learn")}
          >
            <Text className="font-bold text-primary-foreground">
              Back to Learning Guide
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  if (!topicDetail) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-center text-2xl font-black text-foreground">
            Topic not found
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            This topic ID does not exist in Appwrite.
          </Text>
          <Button
            className="h-11 w-full"
            onPress={() => router.replace("/learn")}
          >
            <Text className="font-bold text-primary-foreground">
              Back to Learning Guide
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-4 pb-7 pt-3"
      >
        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-2xl"
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={primaryColor} strokeWidth={2.5} />
          </Pressable>

          <View className="flex-row items-center gap-4">
            <Search size={20} color={primaryColor} strokeWidth={2.2} />
            <UserCircle2 size={22} color={primaryColor} strokeWidth={2.1} />
            <EllipsisVertical
              size={20}
              color={primaryColor}
              strokeWidth={2.2}
            />
          </View>
        </View>

        <View className="gap-2 px-1">
          <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-primary">
            {topicDetail.subject.name}
          </Text>
          <Text className="text-[21px] font-black leading-7 text-foreground">
            {topicDetail.topic.title}
          </Text>
        </View>

        <View className="overflow-hidden rounded-[20px] border border-border bg-card">
          {topicDetail.materials.length === 0 ? (
            <View className="px-3.5 py-4">
              <Text className="text-[13px] leading-5 text-muted-foreground">
                No learning materials found for this topic yet.
              </Text>
            </View>
          ) : null}

          {topicDetail.materials.map((material, index) => {
            const materialPreview = material.isLocked
              ? "Premium content is locked for free users."
              : getMaterialContentPreview(material.content) ||
                "No content preview added yet."
            const status = materialStatusById[material.id]
            const statusChip = !material.isLocked
              ? status?.status === "completed"
                ? {
                    label: "Completed",
                    textColor: activeTheme.success,
                    backgroundColor: withOpacity(activeTheme.success, 0.16),
                  }
                : status?.status === "paused"
                  ? {
                      label: `Paused ${Math.round(status.progressPercent)}%`,
                      textColor: activeTheme.warning,
                      backgroundColor: withOpacity(activeTheme.warning, 0.18),
                    }
                  : status
                    ? {
                        label: `In progress ${Math.round(status.progressPercent)}%`,
                        textColor: activeTheme.primary,
                        backgroundColor: withOpacity(activeTheme.primary, 0.14),
                      }
                    : {
                        label: "Not started",
                        textColor: activeTheme.mutedForeground,
                        backgroundColor: withOpacity(
                          activeTheme.mutedForeground,
                          0.16
                        ),
                      }
              : null

            return (
              <Pressable
                key={material.id}
                className="border-b border-border/80 px-3.5 py-3.5"
                onPress={() => {
                  if (material.isLocked) {
                    router.push({
                      pathname: "/premium",
                      params: {
                        source: "material",
                        title: material.title,
                        topicId,
                      },
                    })
                    return
                  }

                  router.push({
                    pathname: "/learn/[lessonId]",
                    params: { lessonId: material.id },
                  })
                }}
                style={{
                  borderBottomWidth:
                    index === topicDetail.materials.length - 1 ? 0 : 1,
                  opacity: material.isLocked ? 0.7 : 1,
                }}
              >
                <View className="flex-row items-start gap-3">
                  <View className="flex-1 gap-1.5">
                    <Text className="text-sm font-semibold leading-6 text-card-foreground">
                      {material.title}
                    </Text>

                    {shouldShowStatusChips && statusChip ? (
                      <View
                        className="self-start rounded-full px-2.5 py-1"
                        style={{ backgroundColor: statusChip.backgroundColor }}
                      >
                        <Text
                          className="text-[10px] font-black uppercase tracking-[0.8px]"
                          style={{ color: statusChip.textColor }}
                        >
                          {statusChip.label}
                        </Text>
                      </View>
                    ) : null}

                    <Text
                      className="text-[12px] leading-5 text-muted-foreground"
                      numberOfLines={2}
                    >
                      {materialPreview}
                    </Text>
                  </View>

                  <View className="pt-0.5">
                    {material.isLocked ? (
                      <LockKeyhole
                        size={20}
                        color={primaryColor}
                        strokeWidth={2.1}
                      />
                    ) : (
                      <ChevronRight
                        size={20}
                        color={primaryColor}
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
