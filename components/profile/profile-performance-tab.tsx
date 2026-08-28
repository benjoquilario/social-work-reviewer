import { memo } from "react"
import { View } from "react-native"

import type { OverallPerformanceStats } from "@/lib/performance-stats"
import type { ThemePalette } from "@/lib/theme"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { OverallPerformanceSection } from "@/components/dashboard/overall-performance"

export const ProfilePerformanceTab = memo(function ProfilePerformanceTab({
  theme,
  stats,
  isLoading,
  errorMessage,
  onViewDashboard,
}: {
  theme: ThemePalette
  stats: OverallPerformanceStats | null | undefined
  isLoading: boolean
  errorMessage: string | null
  onViewDashboard: () => void
}) {
  return (
    <View className="gap-3">
      {isLoading ? (
        <>
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[150px] rounded-xl" />
        </>
      ) : errorMessage ? (
        <EmptyState
          tone="destructive"
          title="Performance unavailable"
          description={errorMessage}
        />
      ) : stats ? (
        <OverallPerformanceSection stats={stats} theme={theme} />
      ) : (
        <EmptyState
          title="No scored attempts yet"
          description="Finish a board-exam set and your accuracy breakdown lands here."
        />
      )}

      <Button onPress={onViewDashboard}>
        <Text>Full dashboard</Text>
      </Button>
    </View>
  )
})
