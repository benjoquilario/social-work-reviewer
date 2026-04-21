import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CirclePlay,
  FileText,
  Info,
} from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  getLearningMaterialDetail,
  listLearningMaterialsByTopicId,
} from "@/lib/learning-content"
import {
  getLearningMaterialStatus,
  trackLearningMaterialCompleted,
  trackLearningMaterialOpened,
  trackLearningMaterialResourceOpened,
  trackLearningMaterialSession,
  type LearningMaterialStatusSnapshot,
} from "@/lib/progress"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"

import { normalizeMaterialContentToMarkdown } from "../../lib/learning-material-content"

function formatCreatedAt(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value || "Not provided"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function getMaterialActionLabel(type: string) {
  if (type === "video") {
    return "Watch video"
  }

  if (type === "pdf") {
    return "Open PDF"
  }

  return "Open attachment"
}

function getMaterialActionIcon(type: string, color: string) {
  if (type === "video") {
    return <CirclePlay size={16} color={color} strokeWidth={2.2} />
  }

  return <FileText size={16} color={color} strokeWidth={2.2} />
}

export default function LessonDetailScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuth((state) => state.user)
  const isAuthenticated = useAuth((state) => state.isAuthenticated)
  const profile = useAuth((state) => state.profile)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  const params = useLocalSearchParams<{ lessonId?: string }>()
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isMarkingComplete, setIsMarkingComplete] = useState(false)
  const [isMarkedCompleted, setIsMarkedCompleted] = useState(false)
  const sessionStartedAtRef = useRef(Date.now())
  const openedMaterialIdRef = useRef<string | null>(null)
  const colorScheme = useColorScheme()
  const activeTheme = colorScheme === "dark" ? THEME.dark : THEME.light
  const primaryColor = activeTheme.primary

  const lessonId = params.lessonId ?? ""
  const isPremiumUser = profile?.isPremium === true

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const materialQuery = useQuery({
    queryKey: ["learning-material-detail", lessonId, isPremiumUser],
    enabled: Boolean(lessonId),
    queryFn: () =>
      getLearningMaterialDetail(lessonId, { viewerIsPremium: isPremiumUser }),
  })

  const materialStatusQuery = useQuery({
    queryKey: ["learning-material-status", user?.$id, lessonId],
    enabled: Boolean(user?.$id) && Boolean(lessonId),
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: () => getLearningMaterialStatus(user?.$id ?? "", lessonId),
  })

  const materialDetail = materialQuery.data ?? null
  const topicMaterialsQuery = useQuery({
    queryKey: [
      "topic-learning-material-sequence",
      materialDetail?.topic.id,
      isPremiumUser,
    ],
    enabled: Boolean(materialDetail?.topic.id),
    queryFn: () =>
      listLearningMaterialsByTopicId(materialDetail?.topic.id ?? "", {
        viewerIsPremium: isPremiumUser,
      }),
  })

  const persistedMaterialStatus = materialStatusQuery.data ?? null
  const isPersistedCompleted = persistedMaterialStatus?.status === "completed"
  const isCompleted = isMarkedCompleted || isPersistedCompleted
  const isStatusLoading = Boolean(user) && materialStatusQuery.isLoading
  const isResolvingNextMaterial =
    Boolean(materialDetail?.topic.id) && topicMaterialsQuery.isLoading
  const nextMaterial = useMemo(() => {
    if (!materialDetail) {
      return null
    }

    const orderedMaterials = topicMaterialsQuery.data ?? []
    const currentIndex = orderedMaterials.findIndex(
      (material) => material.id === materialDetail.material.id
    )

    if (currentIndex < 0) {
      return null
    }

    return orderedMaterials[currentIndex + 1] ?? null
  }, [materialDetail, topicMaterialsQuery.data])

  const statusChip = useMemo(() => {
    if (isCompleted) {
      return {
        label: "Completed",
        textColor: activeTheme.success,
        backgroundColor: withOpacity(activeTheme.success, 0.16),
      }
    }

    if (!persistedMaterialStatus) {
      return null
    }

    if (persistedMaterialStatus.status === "paused") {
      return {
        label: `Paused ${Math.round(persistedMaterialStatus.progressPercent)}%`,
        textColor: activeTheme.warning,
        backgroundColor: withOpacity(activeTheme.warning, 0.16),
      }
    }

    return {
      label: `In progress ${Math.round(persistedMaterialStatus.progressPercent)}%`,
      textColor: activeTheme.primary,
      backgroundColor: withOpacity(activeTheme.primary, 0.14),
    }
  }, [activeTheme, isCompleted, persistedMaterialStatus])

  const materialMarkdown = useMemo(() => {
    return normalizeMaterialContentToMarkdown(
      materialDetail?.material.content ?? ""
    )
  }, [materialDetail?.material.content])

  const hasRenderableNote = Boolean(materialMarkdown)
  const hasExternalResource = Boolean(materialDetail?.material.fileUrl)

  useEffect(() => {
    setIsMarkedCompleted(false)
    sessionStartedAtRef.current = Date.now()
    openedMaterialIdRef.current = null
  }, [lessonId])

  useEffect(() => {
    if (!user || !materialDetail || materialDetail.material.isLocked) {
      return
    }

    if (openedMaterialIdRef.current === materialDetail.material.id) {
      return
    }

    openedMaterialIdRef.current = materialDetail.material.id

    void trackLearningMaterialOpened({
      userId: user.$id,
      subjectId: materialDetail.subject.id,
      topicId: materialDetail.topic.id,
      learningMaterialId: materialDetail.material.id,
      profileSnapshot: {
        fullName: profile?.fullName,
        schoolName: profile?.schoolName,
        reviewType: profile?.reviewType,
        avatarUrl: profile?.avatarUrl,
      },
    })
  }, [materialDetail, profile, user])

  useEffect(() => {
    return () => {
      if (!user || !materialDetail || materialDetail.material.isLocked) {
        return
      }

      const secondsSpent = Math.round(
        (Date.now() - sessionStartedAtRef.current) / 1000
      )
      if (secondsSpent < 8) {
        return
      }

      void trackLearningMaterialSession({
        userId: user.$id,
        subjectId: materialDetail.subject.id,
        topicId: materialDetail.topic.id,
        learningMaterialId: materialDetail.material.id,
        secondsSpent,
        profileSnapshot: {
          fullName: profile?.fullName,
          schoolName: profile?.schoolName,
          reviewType: profile?.reviewType,
          avatarUrl: profile?.avatarUrl,
        },
      })
    }
  }, [materialDetail, profile, user])

  async function handleOpenResource() {
    const resourceUrl = materialDetail?.material.fileUrl

    if (!resourceUrl) {
      return
    }

    await openBrowserAsync(resourceUrl, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    })

    if (user && materialDetail && !materialDetail.material.isLocked) {
      void trackLearningMaterialResourceOpened({
        userId: user.$id,
        subjectId: materialDetail.subject.id,
        topicId: materialDetail.topic.id,
        learningMaterialId: materialDetail.material.id,
        profileSnapshot: {
          fullName: profile?.fullName,
          schoolName: profile?.schoolName,
          reviewType: profile?.reviewType,
          avatarUrl: profile?.avatarUrl,
        },
      })
    }
  }

  async function handleMarkCompleted() {
    if (
      !user ||
      !materialDetail ||
      materialDetail.material.isLocked ||
      isCompleted
    ) {
      return
    }

    setIsMarkingComplete(true)
    try {
      const completionTimestamp = new Date().toISOString()

      await trackLearningMaterialCompleted({
        userId: user.$id,
        subjectId: materialDetail.subject.id,
        topicId: materialDetail.topic.id,
        learningMaterialId: materialDetail.material.id,
        profileSnapshot: {
          fullName: profile?.fullName,
          schoolName: profile?.schoolName,
          reviewType: profile?.reviewType,
          avatarUrl: profile?.avatarUrl,
        },
      })

      const completedStatus: LearningMaterialStatusSnapshot = {
        learningMaterialId: materialDetail.material.id,
        status: "completed",
        progressPercent: 100,
        lastAccessedAt: completionTimestamp,
        completedAt: completionTimestamp,
      }

      queryClient.setQueryData(
        ["learning-material-status", user.$id, lessonId],
        completedStatus
      )
      queryClient.setQueryData<Record<string, LearningMaterialStatusSnapshot>>(
        ["topic-learning-material-statuses", user.$id, materialDetail.topic.id],
        (previous) => ({
          ...(previous ?? {}),
          [materialDetail.material.id]: completedStatus,
        })
      )

      setIsMarkedCompleted(true)
    } finally {
      setIsMarkingComplete(false)
    }
  }

  function handleNextLearningContent() {
    if (isResolvingNextMaterial) {
      return
    }

    if (nextMaterial) {
      router.push({
        pathname: "/learn/[lessonId]",
        params: { lessonId: nextMaterial.id },
      })
      return
    }

    router.back()
  }

  if (materialQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-4 px-4 pb-7 pt-3"
        >
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (materialQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-2xl font-black text-foreground">
            Material unavailable
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            {materialQuery.error instanceof Error
              ? materialQuery.error.message
              : "Unable to load learning material."}
          </Text>
          <Button
            className="h-11 w-full"
            onPress={() => router.replace("/learn")}
          >
            <Text className="font-bold text-primary-foreground">
              Back to Learning Center
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  if (!materialDetail) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-2xl font-black text-foreground">
            Material not found
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            This learning material ID does not exist in Appwrite.
          </Text>
          <Button
            className="h-11 w-full"
            onPress={() => router.replace("/learn")}
          >
            <Text className="font-bold text-primary-foreground">
              Back to Learning Center
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  if (materialDetail.material.isLocked) {
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

            <Pressable
              className="h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
              onPress={() => setIsDetailsOpen(true)}
            >
              <Info size={18} color={primaryColor} strokeWidth={2.3} />
            </Pressable>
          </View>

          <Card>
            <CardContent className="gap-3 px-3.5 py-4">
              <Text className="text-base font-black text-card-foreground">
                Premium Content Locked
              </Text>
              <Text className="text-[13px] leading-5 text-muted-foreground">
                {materialDetail.material.title} is available only to premium
                subscribers.
              </Text>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                Subject: {materialDetail.subject.name}
              </Text>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                Topic: {materialDetail.topic.title}
              </Text>
              <Button
                className="h-11"
                onPress={() =>
                  router.push({
                    pathname: "/premium",
                    params: {
                      source: "material",
                      title: materialDetail.material.title,
                      categoryId: materialDetail.subject.id,
                      topicId: materialDetail.topic.id,
                    },
                  })
                }
              >
                <Text className="font-bold text-primary-foreground">
                  View Premium Plans
                </Text>
              </Button>
              <Button
                variant="outline"
                className="h-11"
                onPress={() => router.back()}
              >
                <Text className="font-bold">Back to Topic Materials</Text>
              </Button>
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-3 pb-7 pt-3"
      >
        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-2xl"
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={primaryColor} strokeWidth={2.5} />
          </Pressable>

          <View className="flex-row items-center gap-2">
            {hasExternalResource ? (
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-2xl px-3"
                onPress={() => void handleOpenResource()}
              >
                {getMaterialActionIcon(
                  materialDetail.material.type,
                  primaryColor
                )}
                <Text className="text-xs font-bold">
                  {getMaterialActionLabel(materialDetail.material.type)}
                </Text>
              </Button>
            ) : null}
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
              onPress={() => setIsDetailsOpen(true)}
            >
              <Info size={18} color={primaryColor} strokeWidth={2.3} />
            </Pressable>
          </View>
        </View>

        <View className="gap-3 px-1">
          <Text className="text-[13px] font-black uppercase tracking-[1.4px] text-primary">
            {materialDetail.subject.name} · {materialDetail.topic.title} ·{" "}
            {materialDetail.material.type}
          </Text>

          <Text className="text-[17px] font-black leading-7 text-foreground">
            {materialDetail.material.title}
          </Text>
          {statusChip ? (
            <View
              className="self-start rounded-full px-3 py-1"
              style={{ backgroundColor: statusChip.backgroundColor }}
            >
              <Text
                className="text-[11px] font-black uppercase tracking-[0.8px]"
                style={{ color: statusChip.textColor }}
              >
                {statusChip.label}
              </Text>
            </View>
          ) : null}
          {materialDetail.material.type !== "note" ? (
            <Text className="text-[13px] leading-6 text-muted-foreground">
              This material is linked to an external learning resource.
            </Text>
          ) : null}
        </View>

        {hasExternalResource ? (
          <Card>
            <CardContent className="gap-3 px-3.5 py-3.5">
              <View className="flex-row items-center gap-2">
                {getMaterialActionIcon(
                  materialDetail.material.type,
                  primaryColor
                )}
                <Text className="text-sm font-black text-card-foreground">
                  External Resource
                </Text>
              </View>
              <Text className="text-[13px] leading-6 text-muted-foreground">
                This {materialDetail.material.type} is hosted from the attached
                file URL. Open it in-app to view the original resource.
              </Text>
              <Button
                className="h-11 rounded-2xl"
                onPress={() => void handleOpenResource()}
              >
                <ArrowUpRight
                  size={16}
                  color={THEME.light.primaryForeground}
                  strokeWidth={2.2}
                />
                <Text className="font-bold text-primary-foreground">
                  {getMaterialActionLabel(materialDetail.material.type)}
                </Text>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-none border-0 bg-background py-0 shadow-none">
          <CardContent className="gap-2 border-none bg-background px-1 py-2">
            {hasRenderableNote ? (
              <MarkdownContent markdown={materialMarkdown} />
            ) : (
              <Text className="text-[13px] leading-6 text-muted-foreground">
                {hasExternalResource
                  ? "No inline note body was provided for this material. Use the resource action above to view the original file."
                  : "No readable note content was provided for this material yet."}
              </Text>
            )}
          </CardContent>
        </Card>

        {user ? (
          <Button
            className="h-11 rounded-2xl"
            onPress={() => void handleMarkCompleted()}
            disabled={isMarkingComplete || isCompleted || isStatusLoading}
          >
            <Text className="font-bold text-primary-foreground">
              {isCompleted
                ? "Completed"
                : isStatusLoading
                  ? "Checking status..."
                  : isMarkingComplete
                    ? "Saving..."
                    : "Mark as Completed"}
            </Text>
          </Button>
        ) : null}

        <Pressable
          className="mt-1 self-end rounded-full border border-border bg-card p-3.5"
          onPress={handleNextLearningContent}
          disabled={isResolvingNextMaterial}
          style={{ opacity: isResolvingNextMaterial ? 0.5 : 1 }}
        >
          <ArrowRight size={22} color={primaryColor} strokeWidth={2.2} />
        </Pressable>
      </ScrollView>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Material Details</DialogTitle>
            <DialogDescription>
              Metadata for this learning material and its source.
            </DialogDescription>
          </DialogHeader>

          <View className="gap-2.5">
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Subject:{" "}
              <Text className="font-bold text-card-foreground">
                {materialDetail.subject.name}
              </Text>
            </Text>
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Topic:{" "}
              <Text className="font-bold text-card-foreground">
                {materialDetail.topic.title}
              </Text>
            </Text>
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Type:{" "}
              <Text className="font-bold uppercase text-card-foreground">
                {materialDetail.material.type}
              </Text>
            </Text>
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Premium:{" "}
              <Text className="font-bold text-card-foreground">
                {materialDetail.material.isPremium ? "Yes" : "No"}
              </Text>
            </Text>
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Created:{" "}
              <Text className="font-bold text-card-foreground">
                {formatCreatedAt(materialDetail.material.createdAt)}
              </Text>
            </Text>
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Source file:{" "}
              <Text className="font-bold text-card-foreground">
                {hasExternalResource ? "Attached" : "None"}
              </Text>
            </Text>
          </View>

          <DialogFooter>
            {hasExternalResource ? (
              <Button
                className="h-11 rounded-2xl"
                onPress={() => void handleOpenResource()}
              >
                <ArrowUpRight
                  size={16}
                  color={THEME.light.primaryForeground}
                  strokeWidth={2.2}
                />
                <Text className="font-bold text-primary-foreground">
                  {getMaterialActionLabel(materialDetail.material.type)}
                </Text>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={() => setIsDetailsOpen(false)}
            >
              <Text className="font-bold">Close</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  )
}
