import { useCallback, useEffect, useMemo } from "react"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { Announcement } from "@/lib/announcements"
import { useAnnouncements } from "@/hooks/use-announcements"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { AnnouncementCard } from "@/components/announcement-card"
import { AppShellHeader } from "@/components/app-shell-header"

/**
 * ─── Updates ──────────────────────────────────────────────────────────────
 *
 * Read from `announcements` as of v3. It used to render six items hardcoded in
 * `data/news-data.ts`, permanently dated "Today" and "Mar 19, 2026", which
 * nobody could change without shipping a build.
 *
 * There may well be nothing here: the table is live and empty until somebody
 * writes the first announcement in the dashboard. That case gets a real empty
 * state rather than filler, because inventing news to fill a screen is how a
 * feed stops being worth opening.
 */

const AnnouncementSkeleton = () => (
  <Card>
    <CardContent className="gap-3">
      <Skeleton className="h-3 w-24 rounded-xs" />
      <Skeleton className="h-4 w-52 rounded-xs" />
      <Skeleton className="h-3 w-full rounded-xs" />
      <Skeleton className="h-3 w-2/3 rounded-xs" />
    </CardContent>
  </Card>
)

export default function NewsScreen() {
  const { announcements, isLoading, error, unreadIds, markAllSeen } =
    useAnnouncements()

  // Captured on entry, before `markAllSeen` clears it — so the dots stay
  // visible while they read instead of vanishing under them on mount.
  const unreadOnEntry = useMemo(
    () => new Set(unreadIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [announcements]
  )

  // Opening this screen is what clears the Home bell badge. Without it the dot
  // would be permanent, and a badge that never turns off stops being read.
  useEffect(() => {
    if (announcements.length > 0) {
      markAllSeen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements.length])

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Announcement>) => (
      <AnnouncementCard announcement={item} isUnread={unreadOnEntry.has(item.id)} />
    ),
    [unreadOnEntry]
  )

  const header = (
    <View className="px-4 pb-4 pt-4">
      <AppShellHeader
        compact
        eyebrow="What is new"
        title="Updates"
        subtitle="New question sets, learning material and changes to the app."
      />
    </View>
  )

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {header}
        <View className="gap-4 px-4">
          <AnnouncementSkeleton />
          <AnnouncementSkeleton />
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {header}
        <View className="px-4">
          <EmptyState
            title="Could not load updates"
            description={
              error instanceof Error
                ? error.message
                : "Check your connection and try again."
            }
          />
        </View>
      </SafeAreaView>
    )
  }

  if (announcements.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {header}
        <View className="px-4">
          <EmptyState
            title="Nothing new yet"
            description="Announcements about new question sets and learning material will show up here."
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlashList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View className="h-4" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 128 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}
