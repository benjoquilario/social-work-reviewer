import { useCallback, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { ChevronRight, LockKeyhole } from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

import { listLearningSubjects } from "../../lib/learning-content"

export default function LearningCenterScreen() {
  const router = useRouter()
  const { isAuthenticated, profile, refreshProfile } = useAuth()
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary
  const isPremiumUser = profile?.isPremium === true

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const subjectsQuery = useQuery({
    queryKey: ["learning-subjects", isPremiumUser],
    queryFn: () => listLearningSubjects({ viewerIsPremium: isPremiumUser }),
  })

  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data])

  const totals = useMemo(
    () => ({
      totalTopics: subjects.reduce(
        (sum, subject) => sum + subject.topicCount,
        0
      ),
      totalMaterials: subjects.reduce(
        (sum, subject) => sum + subject.materialCount,
        0
      ),
    }),
    [subjects]
  )

  const renderSubjectItem = useCallback(
    ({ item: subject }: ListRenderItemInfo<(typeof subjects)[number]>) => (
      <Pressable
        className="rounded-2xl border border-border bg-card"
        disabled={subject.isLocked}
        onPress={() =>
          router.push({
            pathname: "/review/[categoryId]",
            params: { categoryId: subject.id },
          })
        }
        style={{ opacity: subject.isLocked ? 0.7 : 1 }}
      >
        <View className="gap-2 px-3.5 py-3.5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-2">
              <Text className="text-[16px] font-semibold leading-6 text-card-foreground">
                {subject.name}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {subject.isLocked ? (
                  <View className="flex-row items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1">
                    <LockKeyhole size={12} color="#dc2626" />
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-destructive">
                      Premium locked
                    </Text>
                  </View>
                ) : null}
                {!subject.isLocked && subject.hasPremiumContent && !isPremiumUser ? (
                  <View className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
                      {subject.freeMaterialCount} free · {subject.premiumMaterialCount} premium
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              {subject.isLocked ? (
                <LockKeyhole size={14} color={primaryColor} />
              ) : (
                <ChevronRight size={14} color={primaryColor} />
              )}
            </View>
          </View>

          <Text className="text-[12px] leading-5 text-muted-foreground">
            {subject.isLocked
              ? "This subject currently contains premium-only materials."
              : subject.description || "No subject description added yet."}
          </Text>

          <View className="flex-row gap-2">
            <View className="rounded-full border border-border bg-background px-2.5 py-1.5">
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                {subject.topicCount} topics
              </Text>
            </View>
            <View className="rounded-full border border-border bg-background px-2.5 py-1.5">
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                {subject.freeMaterialCount}/{subject.materialCount} visible
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    ),
    [isPremiumUser, primaryColor, router, subjects]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlashList
        data={subjectsQuery.isLoading || subjectsQuery.error ? [] : subjects}
        keyExtractor={(item) => item.id}
        renderItem={renderSubjectItem}
        ListHeaderComponent={
          <View className="gap-4 px-4 pt-4">
            <View className="gap-2">
              <Text className="text-[11px] font-black uppercase tracking-[1.6px] text-primary">
                Review Content
              </Text>
              <Text className="text-[23px] font-black leading-7 text-foreground">
                Learning Material Library
              </Text>
              <Text className="text-[13px] leading-5 text-muted-foreground">
                Browse subjects, open a topic cluster, then move into the linked
                learning materials.
              </Text>
              <View className="mt-1.5 flex-row gap-2">
                <View className="rounded-full border border-border bg-card px-3 py-2">
                  <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                    {subjects.length} subjects
                  </Text>
                </View>
                <View className="rounded-full border border-border bg-card px-3 py-2">
                  <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                    {totals.totalTopics} topics
                  </Text>
                </View>
                <View className="rounded-full border border-border bg-card px-3 py-2">
                  <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                    {totals.totalMaterials} materials
                  </Text>
                </View>
              </View>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <View className="px-4 pb-7 pt-4">
            {subjectsQuery.isLoading ? (
              <Card>
                <CardContent className="gap-3 px-3.5 py-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ) : null}

            {!subjectsQuery.isLoading && subjectsQuery.error ? (
              <Card>
                <CardContent className="gap-2 px-3.5 py-4">
                  <Text className="text-sm font-black text-destructive">
                    Content unavailable
                  </Text>
                  <Text className="text-[13px] leading-5 text-muted-foreground">
                    {subjectsQuery.error instanceof Error
                      ? subjectsQuery.error.message
                      : "Unable to load learning subjects from Appwrite."}
                  </Text>
                </CardContent>
              </Card>
            ) : null}

            {!subjectsQuery.isLoading && !subjectsQuery.error ? (
              <Card>
                <CardContent className="gap-2 px-3.5 py-4">
                  <Text className="text-sm font-black text-card-foreground">
                    No subjects yet
                  </Text>
                  <Text className="text-[13px] leading-5 text-muted-foreground">
                    Add subject records in your Appwrite CMS before opening the
                    learning library.
                  </Text>
                </CardContent>
              </Card>
            ) : null}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}
