import { useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowLeft,
  ArrowRight,
  EllipsisVertical,
  NotebookPen,
  Search,
  UserCircle2,
} from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getLearningMaterialDetail } from "@/lib/learning-content"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

export default function LessonDetailScreen() {
  const router = useRouter()
  const { isAuthenticated, profile, refreshProfile } = useAuth()
  const params = useLocalSearchParams<{ lessonId?: string }>()
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary

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

  const materialDetail = materialQuery.data ?? null

  const contentParagraphs = useMemo<string[]>(() => {
    const content = materialDetail?.material.content ?? ""

    return content
      .split(/\n\s*\n/g)
      .map((paragraph: string) => paragraph.trim())
      .filter(Boolean)
  }, [materialDetail?.material.content])

  if (materialQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-4 px-4 pb-7 pt-3">
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
              : "Unable to load learning material from Appwrite."}
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
        <ScrollView contentContainerClassName="gap-4 px-4 pb-7 pt-3">
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
              <Button className="h-11" onPress={() => router.back()}>
                <Text className="font-bold text-primary-foreground">
                  Back to Topic Materials
                </Text>
              </Button>
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-4 pb-7 pt-3">
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

        <View className="gap-3 px-1">
          <Text className="text-[13px] font-black uppercase tracking-[1.4px] text-primary">
            {materialDetail.subject.name} · {materialDetail.topic.title} ·{" "}
            {materialDetail.material.type}
          </Text>

          <Text className="text-[17px] font-black leading-7 text-foreground">
            {materialDetail.material.title}
          </Text>
          <Text className="text-[14px] leading-7 text-card-foreground">
            {contentParagraphs[0] ??
              "No review content has been added for this material yet."}
          </Text>
        </View>

        <Card>
          <CardContent className="gap-2.5 px-3.5 py-3.5">
            <View className="flex-row items-center gap-2">
              <NotebookPen size={15} color={primaryColor} />
              <Text className="text-sm font-black text-card-foreground">
                Material Details
              </Text>
            </View>

            <Text className="text-[12px] leading-5 text-muted-foreground">
              Subject:{" "}
              <Text className="font-bold text-card-foreground">
                {materialDetail.subject.name}
              </Text>
            </Text>
            <Text className="text-[12px] leading-5 text-muted-foreground">
              Topic:{" "}
              <Text className="font-bold text-card-foreground">
                {materialDetail.topic.title}
              </Text>
            </Text>
            <Text className="text-[12px] leading-5 text-muted-foreground">
              Premium:{" "}
              <Text className="font-bold text-card-foreground">
                {materialDetail.material.isPremium ? "Yes" : "No"}
              </Text>
            </Text>
            <Text className="text-[12px] leading-5 text-muted-foreground">
              Created At:{" "}
              <Text className="font-bold text-card-foreground">
                {materialDetail.material.createdAt || "Not provided"}
              </Text>
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-2.5 px-3.5 py-3.5">
            <Text className="text-sm font-black text-card-foreground">
              Review Content
            </Text>
            {(contentParagraphs.length > 0
              ? contentParagraphs
              : ["No review content has been added for this material yet."]
            ).map((paragraph: string, index: number) => (
              <View
                key={`${materialDetail.material.id}-${index}`}
                className="rounded-2xl border border-border bg-background p-2.5"
              >
                <View className="flex-row items-center gap-2">
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <Text className="text-[11px] font-black text-primary">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="text-[13px] font-bold text-card-foreground">
                    Section {index + 1}
                  </Text>
                </View>
                <Text className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                  {paragraph}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-2.5 px-3.5 py-3.5">
            <Text className="text-sm font-black text-card-foreground">
              Content Source
            </Text>
            {materialDetail.material.fileUrl ? (
              <Text className="text-[12px] leading-5 text-muted-foreground">
                File URL:{" "}
                <Text className="font-bold text-card-foreground">
                  {materialDetail.material.fileUrl}
                </Text>
              </Text>
            ) : (
              <Text className="text-[12px] leading-5 text-muted-foreground">
                No file URL is attached to this Appwrite learning material.
              </Text>
            )}
          </CardContent>
        </Card>

        <Pressable
          className="mt-1 self-end rounded-full border border-border bg-card p-3.5"
          onPress={() => router.back()}
        >
          <ArrowRight size={22} color={primaryColor} strokeWidth={2.2} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
