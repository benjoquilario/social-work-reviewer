import { memo } from "react"
import { ScrollView, View } from "react-native"

import type { ThemePalette } from "@/lib/theme"
import type { Tone } from "@/lib/tone"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { SectionLink } from "@/components/study/section-link"

import { AchievementBadgeCard } from "./achievement-badge-card"
import type { AchievementBadgeMeta } from "./profile-achievements"

export type AchievementCardItem = {
  id: string
  badge: AchievementBadgeMeta
  title: string
  caption: string
  tone: Tone
}

type AchievementsSectionProps = {
  theme: ThemePalette
  items: AchievementCardItem[]
  isLoading: boolean
  onPressSeeAll: () => void
}

export const AchievementsSection = memo(function AchievementsSection({
  theme,
  items,
  isLoading,
  onPressSeeAll,
}: AchievementsSectionProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">Achievements</Text>
        {items.length > 0 ? (
          <SectionLink
            theme={theme}
            label="See all"
            accessibilityLabel="See all achievements"
            onPress={onPressSeeAll}
          />
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-row gap-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-[132px] w-[124px] rounded-xl" />
          ))}
        </View>
      ) : items.length === 0 ? (
        // An empty achievements shelf is a prompt, not a dead end — it says
        // what earns the first badge rather than just reporting nothing.
        <EmptyState
          title="No badges yet"
          description="Finish a quiz or keep a study streak going and your first badge lands here."
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-4"
          contentContainerClassName="gap-3 px-4"
        >
          {items.map((item) => (
            <AchievementBadgeCard
              key={item.id}
              theme={theme}
              badge={item.badge}
              title={item.title}
              caption={item.caption}
              tone={item.tone}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
})
