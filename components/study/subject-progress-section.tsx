import { memo } from "react"
import { ScrollView, View } from "react-native"

import type { ThemePalette } from "@/lib/theme"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

import type { LucideIcon } from "lucide-react-native"
import { SectionLink } from "./section-link"
import { SubjectProgressCard } from "./subject-progress-card"

export type SubjectRailItem = {
  id: string
  title: string
  Icon: LucideIcon
  color: string
  completed: number
  total: number
  percent: number
  unitLabel: string
  isLocked: boolean
}

type SubjectProgressSectionProps = {
  theme: ThemePalette
  title: string
  seeAllLabel?: string
  items: SubjectRailItem[]
  isLoading: boolean
  errorMessage: string | null
  onPressItem: (item: SubjectRailItem) => void
  onPressSeeAll: () => void
}

function SubjectRailSkeleton() {
  return (
    <View className="flex-row gap-3">
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="h-[150px] w-[148px] rounded-xl" />
      ))}
    </View>
  )
}

export const SubjectProgressSection = memo(function SubjectProgressSection({
  theme,
  title,
  seeAllLabel = "See all",
  items,
  isLoading,
  errorMessage,
  onPressItem,
  onPressSeeAll,
}: SubjectProgressSectionProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">{title}</Text>
        <SectionLink
          theme={theme}
          label={seeAllLabel}
          accessibilityLabel="See all subjects"
          onPress={onPressSeeAll}
        />
      </View>

      {isLoading ? (
        <SubjectRailSkeleton />
      ) : errorMessage ? (
        <EmptyState
          tone="destructive"
          title="Subjects unavailable"
          description={errorMessage}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Once subjects are published they will show up here with your progress."
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-4"
          contentContainerClassName="gap-3 px-4"
        >
          {items.map((item) => (
            <SubjectProgressCard
              key={item.id}
              theme={theme}
              Icon={item.Icon}
              title={item.title}
              completed={item.completed}
              total={item.total}
              percent={item.percent}
              unitLabel={item.unitLabel}
              color={item.color}
              isLocked={item.isLocked}
              onPress={() => onPressItem(item)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
})
