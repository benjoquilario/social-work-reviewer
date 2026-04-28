import { Plus, Search } from "lucide-react-native"
import { Pressable, View } from "react-native"

import { THEME, withOpacity } from "@/lib/theme"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { CommunityAvatar } from "@/components/community/avatar"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

type CommunityFeedHeaderProps = {
  activeFeedFilter: string
  featuredSubjects: { id: string; name: string }[]
  filters: readonly string[]
  onChangeFeedFilter: (filter: string) => void
  onOpenComposer: () => void
  onRefresh: () => void
  totalPosts: number
  stats?: {
    activeLearners: number
    openTopics: number
    answeredToday: number
  }
  theme: ThemePalette
  currentUserAvatarLabel?: string
  currentUserAvatarUrl?: string | null
}

export function CommunityFeedHeader({
  activeFeedFilter,
  filters,
  onChangeFeedFilter,
  onOpenComposer,
  totalPosts,
  stats,
  theme,
  currentUserAvatarLabel,
  currentUserAvatarUrl,
}: CommunityFeedHeaderProps) {
  return (
    <View className="gap-3 pb-2">
      {/* Top bar title */}
      <View className="flex-row items-center justify-between">
        <Text className="text-[22px] font-black text-foreground">
          Community
        </Text>
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor: withOpacity(theme.muted, 0.8),
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Search size={16} color={theme.mutedForeground} />
        </View>
      </View>

      {/* Composer prompt */}
      <View
        className="flex-row items-center gap-3 rounded-2xl bg-card px-3.5 py-3"
        style={{ borderWidth: 1, borderColor: theme.border }}
      >
        <CommunityAvatar
          label={currentUserAvatarLabel ?? "RV"}
          sourceUri={currentUserAvatarUrl}
          theme={theme}
          size="md"
        />
        <Pressable className="flex-1" onPress={onOpenComposer}>
          <Text className="text-[14px] text-muted-foreground">
            What's on your mind?
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpenComposer}
          className="h-9 w-9 items-center justify-center rounded-full bg-primary"
        >
          <Plus size={16} color={theme.primaryForeground} />
        </Pressable>
      </View>

      {/* Stats row */}
      <View className="flex-row gap-2">
        <View
          className="flex-1 items-center rounded-2xl py-2.5"
          style={{
            backgroundColor: withOpacity(theme.primary, 0.08),
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text className="text-[15px] font-black text-primary">
            {totalPosts}
          </Text>
          <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Threads
          </Text>
        </View>
        <View
          className="flex-1 items-center rounded-2xl py-2.5"
          style={{
            backgroundColor: withOpacity(theme.primary, 0.08),
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text className="text-[15px] font-black text-primary">
            {stats?.activeLearners ?? 0}
          </Text>
          <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Active
          </Text>
        </View>
        <View
          className="flex-1 items-center rounded-2xl py-2.5"
          style={{
            backgroundColor: withOpacity(theme.primary, 0.08),
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text className="text-[15px] font-black text-primary">
            {stats?.answeredToday ?? 0}
          </Text>
          <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Answered
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2 pr-2">
          {filters.map((filter) => {
            const isActive = activeFeedFilter === filter
            return (
              <Pressable
                key={filter}
                onPress={() => onChangeFeedFilter(filter)}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: isActive
                    ? theme.primary
                    : withOpacity(theme.muted, 0.8),
                }}
              >
                <Text
                  className="text-[12px] font-bold capitalize"
                  style={{
                    color: isActive
                      ? theme.primaryForeground
                      : theme.mutedForeground,
                  }}
                >
                  {filter}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
