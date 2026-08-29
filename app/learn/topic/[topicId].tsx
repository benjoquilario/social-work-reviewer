import { useCallback, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  getLearningTopicDetail,
  type LearningMaterial,
} from "@/lib/learning-content"
import { describeMaterialType } from "@/lib/learning-content"
import { listLearningMaterialStatusesByTopic } from "@/lib/progress"
import { useThemePalette } from "@/hooks/use-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { MaterialRow } from "@/components/learn"
import { ScreenHeader } from "@/components/screen-header"
import { useIsPremium } from "@/hooks/use-membership"

export default function TopicDetailScreen() {
  const router = useRouter()
  const theme = useThemePalette()
  const user = useAuth((state) => state.user)
  const isAuthenticated = useAuth((state) => state.isAuthenticated)
  const profile = useAuth((state) => state.profile)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  const params = useLocalSearchParams<{ topicId?: string }>()

  const topicId = params.topicId ?? ""
  // Flag *and* date — the cached flag alone keeps a lapsed member premium
  // until a server sweep catches up (section 6).
  const isPremiumUser = useIsPremium()

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
      listLearningMaterialStatusesByTopic({ userId: user?.$id ?? "", topicId }),
  })

  const topicDetail = topicQuery.data ?? null
  const materialStatusById = useMemo(
    () => materialStatusesQuery.data ?? {},
    [materialStatusesQuery.data]
  )
  const showStatus = Boolean(user) && !materialStatusesQuery.isLoading

  const materials = useMemo(
    () => topicDetail?.materials ?? [],
    [topicDetail?.materials]
  )
  const completedCount = useMemo(
    () =>
      materials.filter(
        (material) => materialStatusById[material.id]?.status === "completed"
      ).length,
    [materialStatusById, materials]
  )
  const completionPercent =
    materials.length > 0
      ? Math.round((completedCount / materials.length) * 100)
      : 0

  const handleMaterialPress = useCallback(
    (material: LearningMaterial) => {
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
    },
    [router, topicId]
  )

  if (topicQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 gap-4 bg-background px-4 pt-3">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </SafeAreaView>
    )
  }

  if (topicQuery.error || !topicDetail) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center gap-4 px-4">
          <EmptyState
            tone="destructive"
            title={topicQuery.error ? "Topic unavailable" : "Topic not found"}
            description={
              topicQuery.error instanceof Error
                ? topicQuery.error.message
                : "This topic could not be loaded. It may have been removed."
            }
            action={
              <Button onPress={() => router.replace("/learn")}>
                <Text>Back to library</Text>
              </Button>
            }
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-4 pb-10"
      >
        {/* The header used to read "Topic" and carry three decorative icons
            with no press handlers. It names the topic now. */}
        <ScreenHeader title={topicDetail.topic.title} />

        <View className="gap-1">
          <Text variant="eyebrow">{topicDetail.subject.name}</Text>
          {topicDetail.topic.description ? (
            <Text variant="callout" className="text-muted-foreground">
              {topicDetail.topic.description}
            </Text>
          ) : null}
        </View>

        {materials.length > 0 && showStatus ? (
          <Card>
            <CardContent size="compact" className="gap-2.5">
              <View className="flex-row items-end justify-between gap-3">
                <View className="gap-0.5">
                  <Text variant="label">Topic progress</Text>
                  <Text variant="callout" className="font-bold">
                    {completedCount} of {materials.length} completed
                  </Text>
                </View>
                <Text className="text-xl font-black text-primary">
                  {completionPercent}%
                </Text>
              </View>

              <View
                className="h-2 overflow-hidden rounded-full bg-muted"
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: materials.length,
                  now: completedCount,
                }}
              >
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(2, completionPercent)}%` }}
                />
              </View>
            </CardContent>
          </Card>
        ) : null}

        {materials.length === 0 ? (
          <EmptyState
            title="No materials yet"
            description="This topic has no learning materials added in Appwrite yet."
          />
        ) : (
          <Card>
            <CardContent size="none">
              {materials.map((material, index) => (
                <MaterialRow
                  key={material.id}
                  material={material}
                  position={index + 1}
                  // Not a body preview any more. A list read no longer asks
                  // the server for `content`, so a premium lesson's text never
                  // reaches a device that has not paid for it.
                  preview={describeMaterialType(material)}
                  status={materialStatusById[material.id]}
                  showStatus={showStatus}
                  isFirst={index === 0}
                  theme={theme}
                  onPress={handleMaterialPress}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
