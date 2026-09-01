import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser"
import ArrowRight from "lucide-react-native/icons/arrow-right"
import ArrowUpRight from "lucide-react-native/icons/arrow-up-right"
import Check from "lucide-react-native/icons/check"
import CheckCircle2 from "lucide-react-native/icons/circle-check"
import Info from "lucide-react-native/icons/info"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  getLearningMaterialDetail,
  listLearningMaterialsByTopicId,
} from "@/lib/learning-content"
import { normalizeMaterialContentToMarkdown } from "@/lib/learning-material-content"
import {
  getLearningMaterialStatus,
  trackLearningMaterialCompleted,
  trackLearningMaterialOpened,
  trackLearningMaterialResourceOpened,
  trackLearningMaterialSession,
  type LearningMaterialStatusSnapshot,
} from "@/lib/progress"
import { useThemePalette } from "@/hooks/use-theme"
import { Badge } from "@/components/ui/badge"
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
import { EmptyState } from "@/components/ui/empty-state"
import { IconButton } from "@/components/ui/icon-button"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { MotionPressable } from "@/components/ui/motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import {
  getMaterialStatusPresentation,
  getMaterialTypeMeta,
  MaterialTypeIcon,
} from "@/components/learn"
import { ScreenHeader } from "@/components/screen-header"
import { toAchievementSnapshot } from "@/lib/member/profile"
import { useIsPremium } from "@/hooks/use-membership"

const SHORT_DATETIME_FMT = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatCreatedAt(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value || "Not provided"
  }

  return SHORT_DATETIME_FMT.format(parsed)
}

function getResourceActionLabel(type: string) {
  if (type === "video") return "Watch video"
  if (type === "pdf") return "Open PDF"
  return "Open attachment"
}

/** One metadata line in the details dialog. */
function DetailRow({
  label,
  value,
  isFirst,
}: {
  label: string
  value: string
  isFirst: boolean
}) {
  return (
    <View
      className={
        isFirst
          ? "flex-row items-start justify-between gap-4 py-2.5"
          : "flex-row items-start justify-between gap-4 border-t border-border/70 py-2.5"
      }
    >
      <Text variant="label">{label}</Text>
      <Text
        variant="callout"
        className="flex-1 text-right font-semibold"
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  )
}

export default function LessonDetailScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const theme = useThemePalette()
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

  const lessonId = params.lessonId ?? ""
  // Flag *and* date — the cached flag alone keeps a lapsed member premium
  // until a server sweep catches up (section 6).
  const isPremiumUser = useIsPremium()

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
    queryFn: () =>
      getLearningMaterialStatus({
        userId: user?.$id ?? "",
        learningMaterialId: lessonId,
      }),
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

  const orderedMaterials = useMemo(
    () => topicMaterialsQuery.data ?? [],
    [topicMaterialsQuery.data]
  )
  const currentIndex = useMemo(
    () =>
      materialDetail
        ? orderedMaterials.findIndex(
            (material) => material.id === materialDetail.material.id
          )
        : -1,
    [materialDetail, orderedMaterials]
  )
  const nextMaterial =
    currentIndex >= 0 ? (orderedMaterials[currentIndex + 1] ?? null) : null

  const statusPresentation = useMemo(
    () =>
      isCompleted
        ? getMaterialStatusPresentation({
            learningMaterialId: lessonId,
            status: "completed",
            progressPercent: 100,
            lastAccessedAt: "",
            completedAt: null,
          })
        : persistedMaterialStatus
          ? getMaterialStatusPresentation(persistedMaterialStatus)
          : null,
    [isCompleted, lessonId, persistedMaterialStatus]
  )

  const materialMarkdown = useMemo(
    () =>
      normalizeMaterialContentToMarkdown(
        materialDetail?.material.content ?? ""
      ),
    [materialDetail?.material.content]
  )

  const hasRenderableNote = Boolean(materialMarkdown)
  const hasExternalResource = Boolean(materialDetail?.material.fileUrl)
  const typeMeta = getMaterialTypeMeta(materialDetail?.material.type ?? "")

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
      profileSnapshot: toAchievementSnapshot(profile),
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
        profileSnapshot: toAchievementSnapshot(profile),
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
        profileSnapshot: toAchievementSnapshot(profile),
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
        profileSnapshot: toAchievementSnapshot(profile),
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

  // ─── Loading / error ────────────────────────────────────────────

  if (materialQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 gap-4 bg-background px-4 pt-3">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <Skeleton className="h-8 w-3/4 rounded-xs" />
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-56 rounded-xl" />
      </SafeAreaView>
    )
  }

  if (materialQuery.error || !materialDetail) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-4">
          <EmptyState
            tone="destructive"
            title={
              materialQuery.error
                ? "Material unavailable"
                : "Material not found"
            }
            description={
              materialQuery.error instanceof Error
                ? materialQuery.error.message
                : "This learning material could not be loaded."
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

  if (materialDetail.material.isLocked) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-4 px-4 pb-10">
          <ScreenHeader title={materialDetail.topic.title} />
          <EmptyState
            tone="accent"
            title="Premium content"
            description={`${materialDetail.material.title} is available to premium subscribers only.`}
            action={
              <View className="w-full gap-2.5">
                <Button
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
                  <Text>View premium plans</Text>
                </Button>
                <Button variant="outline" onPress={() => router.back()}>
                  <Text>Back to topic</Text>
                </Button>
              </View>
            }
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ─── Reader ─────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-4 pb-10"
      >
        {/* The header names the topic — the lesson title belongs in the
            document, at document size, not squeezed into a nav bar. */}
        <ScreenHeader
          title={materialDetail.topic.title}
          trailing={
            <IconButton
              label="Material details"
              size="sm"
              variant="outline"
              onPress={() => setIsDetailsOpen(true)}
            >
              <Info size={18} color={theme.primary} />
            </IconButton>
          }
        />

        <View className="gap-2.5">
          <Text variant="eyebrow" numberOfLines={1}>
            {materialDetail.subject.name}
          </Text>

          {/* Was `text-base` under a 14px all-caps breadcrumb — the title
              read smaller than its own kicker. */}
          <Text className="text-2xl font-black leading-8">
            {materialDetail.material.title}
          </Text>

          <View className="flex-row flex-wrap items-center gap-2">
            <Badge tone="muted" size="sm">
              <MaterialTypeIcon
                size={11}
                type={materialDetail.material.type}
                color={theme.mutedForeground}
              />
              <Text>{typeMeta.label}</Text>
            </Badge>

            {statusPresentation ? (
              <Badge tone={statusPresentation.tone} size="sm">
                {statusPresentation.label}
              </Badge>
            ) : null}

            {currentIndex >= 0 && orderedMaterials.length > 0 ? (
              <Text variant="label">
                {currentIndex + 1} of {orderedMaterials.length}
              </Text>
            ) : null}
          </View>
        </View>

        {hasExternalResource ? (
          <Card className="border-primary/25">
            <CardContent size="compact" className="gap-3">
              <View className="flex-row items-center gap-2">
                <MaterialTypeIcon
                  size={16}
                  type={materialDetail.material.type}
                  color={theme.primary}
                />
                <Text variant="subheading">Attached resource</Text>
              </View>
              <Text variant="caption">
                Hosted outside the app. Opening it counts toward your progress.
              </Text>
              <Button onPress={() => void handleOpenResource()}>
                <ArrowUpRight size={16} color={theme.primaryForeground} />
                <Text>
                  {getResourceActionLabel(materialDetail.material.type)}
                </Text>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Plain view. This was a Card with `rounded-none border-0
            bg-background py-0 shadow-none` wrapped around a CardContent with
            `size="none" border-none bg-background` — a card configured to
            stop being a card. */}
        <View>
          {hasRenderableNote ? (
            <MarkdownContent markdown={materialMarkdown} />
          ) : (
            <Text variant="callout" className="text-muted-foreground">
              {hasExternalResource
                ? "No inline notes for this material — use the resource above."
                : "No readable note content has been added to this material yet."}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View className="gap-2.5 pt-1">
          {user ? (
            isCompleted ? (
              <View className="flex-row items-center justify-center gap-2 rounded-md border border-success/25 bg-success/10 py-3">
                <CheckCircle2 size={16} color={theme.success} />
                <Text className="text-sm font-bold text-success">
                  Completed
                </Text>
              </View>
            ) : (
              <Button
                size="lg"
                disabled={isMarkingComplete || isStatusLoading}
                onPress={() => void handleMarkCompleted()}
              >
                <Check size={16} color={theme.primaryForeground} />
                <Text>
                  {isStatusLoading
                    ? "Checking status…"
                    : isMarkingComplete
                      ? "Saving…"
                      : "Mark as complete"}
                </Text>
              </Button>
            )
          ) : null}

          {/* Was an unlabelled circular arrow floating at the bottom right —
              no way to tell whether it advanced, submitted, or exited. */}
          {nextMaterial ? (
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel={`Next material: ${nextMaterial.title}`}
              onPress={handleNextLearningContent}
            >
              <Card>
                <CardContent
                  size="compact"
                  className="flex-row items-center gap-3"
                >
                  <View className="flex-1 gap-0.5">
                    <Text variant="label">Next in this topic</Text>
                    <Text
                      variant="callout"
                      className="font-bold"
                      numberOfLines={1}
                    >
                      {nextMaterial.title}
                    </Text>
                  </View>
                  <ArrowRight size={18} color={theme.primary} />
                </CardContent>
              </Card>
            </MotionPressable>
          ) : (
            <Button variant="outline" onPress={() => router.back()}>
              <Text>Back to topic</Text>
            </Button>
          )}
        </View>
      </ScrollView>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Material details</DialogTitle>
            <DialogDescription>
              Where this material sits and where it came from.
            </DialogDescription>
          </DialogHeader>

          <View>
            {[
              { label: "Subject", value: materialDetail.subject.name },
              { label: "Topic", value: materialDetail.topic.title },
              { label: "Type", value: typeMeta.label },
              {
                label: "Premium",
                value: materialDetail.material.isPremium ? "Yes" : "No",
              },
              {
                label: "Created",
                value: formatCreatedAt(materialDetail.material.createdAt),
              },
              {
                label: "Source file",
                value: hasExternalResource ? "Attached" : "None",
              },
            ].map((row, index) => (
              <DetailRow
                key={row.label}
                label={row.label}
                value={row.value}
                isFirst={index === 0}
              />
            ))}
          </View>

          <DialogFooter className="flex-row">
            {hasExternalResource ? (
              <Button
                className="flex-1"
                onPress={() => void handleOpenResource()}
              >
                <ArrowUpRight size={16} color={theme.primaryForeground} />
                <Text numberOfLines={1}>Open</Text>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setIsDetailsOpen(false)}
            >
              <Text>Close</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  )
}
