import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useAuth } from "@/contexts/auth-context"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import Search from "lucide-react-native/icons/search"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  listLearningSubjects,
  type LearningSubject,
} from "@/lib/learning-content"
import { useThemePalette } from "@/hooks/use-theme"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { AppShellHeader } from "@/components/app-shell-header"
import { SubjectCard } from "@/components/learn"
import { useIsPremium } from "@/hooks/use-membership"

const SubjectSeparator = () => <View className="h-2.5" />

const SubjectSkeleton = () => (
  <Card>
    <CardContent className="gap-3">
      <View className="flex-row items-start gap-3">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <View className="flex-1 gap-1.5">
          <Skeleton className="h-4 w-44 rounded-xs" />
          <Skeleton className="h-3 w-28 rounded-xs" />
        </View>
      </View>
      <Skeleton className="h-4 w-full rounded-xs" />
      <Skeleton className="h-4 w-2/3 rounded-xs" />
    </CardContent>
  </Card>
)

export default function LearningLibraryScreen() {
  const router = useRouter()
  const theme = useThemePalette()
  const isAuthenticated = useAuth((state) => state.isAuthenticated)
  const profile = useAuth((state) => state.profile)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  // Flag *and* date — the cached flag alone keeps a lapsed member premium
  // until a server sweep catches up (section 6).
  const isPremiumUser = useIsPremium()

  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)

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

  const visibleSubjects = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()

    if (!normalized) {
      return subjects
    }

    return subjects.filter(
      (subject) =>
        subject.name.toLowerCase().includes(normalized) ||
        subject.description.toLowerCase().includes(normalized)
    )
  }, [deferredQuery, subjects])

  const handleSubjectPress = useCallback(
    (subject: LearningSubject) => {
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
    },
    [router]
  )

  const renderSubject = useCallback(
    ({ item }: ListRenderItemInfo<LearningSubject>) => (
      <SubjectCard
        subject={item}
        theme={theme}
        showPremiumMix={!isPremiumUser && item.hasPremiumContent}
        onPress={handleSubjectPress}
      />
    ),
    [handleSubjectPress, isPremiumUser, theme]
  )

  const errorMessage =
    subjectsQuery.error instanceof Error
      ? subjectsQuery.error.message
      : subjectsQuery.error
        ? "Unable to load learning subjects from Appwrite."
        : null

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      {/* Search stays pinned rather than scrolling away inside the list
          header — in a library, the filter is the primary control. */}
      <View className="gap-3 px-4 pb-3 pt-3">
        <AppShellHeader
          compact
          eyebrow="Learn"
          title="Material library"
          subtitle="Pick a subject, open a topic, work through its materials."
        />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search subjects"
          accessibilityLabel="Search subjects"
          returnKeyType="search"
          leading={<Search size={16} color={theme.mutedForeground} />}
        />
      </View>

      <FlashList
        data={subjectsQuery.isLoading || errorMessage ? [] : visibleSubjects}
        extraData={theme}
        keyExtractor={(item) => item.id}
        renderItem={renderSubject}
        ItemSeparatorComponent={SubjectSeparator}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          subjectsQuery.isLoading ? (
            <View className="gap-2.5">
              <SubjectSkeleton />
              <SubjectSkeleton />
              <SubjectSkeleton />
            </View>
          ) : errorMessage ? (
            <EmptyState
              tone="destructive"
              title="Library unavailable"
              description={errorMessage}
            />
          ) : query.trim() ? (
            <EmptyState
              title="No matching subjects"
              description={`Nothing in the library matches "${query.trim()}".`}
            />
          ) : (
            <EmptyState
              title="No subjects yet"
              description="Add subject records in Appwrite to populate the library."
            />
          )
        }
        ListFooterComponent={
          visibleSubjects.length > 0 ? (
            <Text variant="label" className="pt-4 text-center">
              {visibleSubjects.length} of {subjects.length} subjects
            </Text>
          ) : null
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          // Clears the tab bar's raised Study button, which overhangs
          // into this screen by 20px. The bar itself sits below the
          // screen rather than over it, so its height needs no allowance.
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}
