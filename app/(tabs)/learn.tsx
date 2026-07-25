import { useCallback, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { ChevronRight, LockKeyhole } from "lucide-react-native"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getStaggerDelay } from "@/lib/motion"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { FadeInView, MotionPressable } from "@/components/ui/motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { AppShellHeader } from "@/components/app-shell-header"

import { listLearningSubjects } from "../../lib/learning-content"

export default function LearningCenterScreen() {
  const router = useRouter()
  const isAuthenticated = useAuth((state) => state.isAuthenticated)
  const profile = useAuth((state) => state.profile)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light
  const primaryColor = theme.primary
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

  const renderSubjectItem = useCallback(
    ({ item: subject }: ListRenderItemInfo<(typeof subjects)[number]>) => (
      <MotionPressable
        className="rounded-[28px]"
        onPress={() => {
          if (subject.isLocked) {
            router.push({
              pathname: "/premium",
              params: {
                source: "subject",
                title: subject.name,
                categoryId: subject.id,
              },
            })
            return
          }

          router.push({
            pathname: "/review/[categoryId]",
            params: { categoryId: subject.id },
          })
        }}
        style={{ opacity: subject.isLocked ? 0.75 : 1 }}
      >
        <Card>
          <CardContent className="gap-2.5 px-4 py-3.5">
            <View className="flex-row items-start gap-3">
              <View
                className="h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: withOpacity(
                    subject.isLocked ? theme.accent : theme.primary,
                    0.1
                  ),
                }}
              >
                {subject.isLocked ? (
                  <LockKeyhole size={18} color={theme.accent} />
                ) : (
                  <ChevronRight size={18} color={primaryColor} />
                )}
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-[15px] font-bold leading-5 text-foreground">
                  {subject.name}
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {subject.isLocked ? (
                    <View
                      className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: withOpacity(theme.accent, 0.1),
                      }}
                    >
                      <LockKeyhole size={11} color={theme.accent} />
                      <Text
                        className="text-[10px] font-semibold"
                        style={{ color: theme.accent }}
                      >
                        Premium
                      </Text>
                    </View>
                  ) : null}
                  {!subject.isLocked &&
                  subject.hasPremiumContent &&
                  !isPremiumUser ? (
                    <View className="rounded-full bg-primary/10 px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-primary">
                        {subject.freeMaterialCount} free ·{" "}
                        {subject.premiumMaterialCount} premium
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <Text className="text-[12px] leading-[18px] text-muted-foreground">
              {subject.isLocked
                ? "This subject currently contains premium-only materials."
                : subject.description || "No subject description added yet."}
            </Text>

            <View className="flex-row gap-2">
              <View className="rounded-full bg-muted px-2.5 py-1">
                <Text className="text-[11px] font-semibold text-muted-foreground">
                  {subject.topicCount} topics
                </Text>
              </View>
              <View className="rounded-full bg-muted px-2.5 py-1">
                <Text className="text-[11px] font-semibold text-muted-foreground">
                  {subject.freeMaterialCount}/{subject.materialCount} visible
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </MotionPressable>
    ),
    [isPremiumUser, primaryColor, router, theme]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlashList
        data={subjectsQuery.isLoading || subjectsQuery.error ? [] : subjects}
        extraData={theme}
        keyExtractor={(item) => item.id}
        renderItem={renderSubjectItem}
        ListHeaderComponent={
          <FadeInView delay={getStaggerDelay(0)}>
            <View className="px-4 pt-4">
              <AppShellHeader
                eyebrow="Review Content"
                title="Learning Material Library"
                subtitle="Browse a cleaner, subject-first library, open topic clusters, and move directly into the linked learning materials."
              />
            </View>
          </FadeInView>
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
              <EmptyState
                tone="destructive"
                title="Content unavailable"
                description={
                  subjectsQuery.error instanceof Error
                    ? subjectsQuery.error.message
                    : "Unable to load learning subjects from Appwrite."
                }
              />
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
        contentContainerStyle={{ paddingBottom: 128, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}
