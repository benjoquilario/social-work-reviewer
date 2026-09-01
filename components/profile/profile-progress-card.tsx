import { memo } from "react"
import BookOpen from "lucide-react-native/icons/book-open"
import CheckCircle2 from "lucide-react-native/icons/circle-check"
import Clock3 from "lucide-react-native/icons/clock-3"
import Target from "lucide-react-native/icons/target"
import { View } from "react-native"

import type { ThemePalette } from "@/lib/theme"
import { Card, CardContent } from "@/components/ui/card"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { MetricRow } from "@/components/study/metric-row"
import { SectionLink } from "@/components/study/section-link"

const NUMBER_FMT = new Intl.NumberFormat("en-PH")

type ProfileProgressCardProps = {
  theme: ThemePalette
  isLoading: boolean
  progressPercent: number
  topicsStudied: number
  topicsTotal: number
  hoursStudied: number
  accuracyRate: number
  onPressViewDetails: () => void
}

/** "1.5h" under an hour, whole hours above — never "0.03 hours". */
function formatHours(hours: number) {
  if (hours <= 0) {
    return "0h"
  }

  if (hours < 1) {
    return `${Math.max(Math.round(hours * 60), 1)}m`
  }

  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)}h`
}

export const ProfileProgressCard = memo(function ProfileProgressCard({
  theme,
  isLoading,
  progressPercent,
  topicsStudied,
  topicsTotal,
  hoursStudied,
  accuracyRate,
  onPressViewDetails,
}: ProfileProgressCardProps) {
  if (isLoading) {
    return <Skeleton className="h-[170px] rounded-xl" />
  }

  const safePercent = Math.min(Math.max(Math.round(progressPercent), 0), 100)

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">Study Progress</Text>
        <SectionLink
          theme={theme}
          label="View Details"
          accessibilityLabel="View performance details"
          onPress={onPressViewDetails}
        />
      </View>

      <Card>
        <CardContent className="gap-3.5">
          <View className="flex-row items-center justify-between">
            <Text variant="callout" className="font-semibold">
              Overall Progress
            </Text>
            <Text className="text-sm font-extrabold text-foreground">
              {safePercent}%
            </Text>
          </View>

          <ProgressBar
            size="lg"
            value={safePercent}
            label="Overall study progress"
          />

          <MetricRow
            className="border-t border-border/70 pt-3.5"
            items={[
              {
                key: "studied",
                Icon: BookOpen,
                color: theme.primary,
                value: NUMBER_FMT.format(topicsStudied),
                label: "Topics Studied",
              },
              {
                key: "completed",
                Icon: CheckCircle2,
                color: theme.success,
                value: `${topicsStudied}/${topicsTotal}`,
                label: "Topics Completed",
              },
              {
                key: "hours",
                Icon: Clock3,
                color: theme.chart4,
                value: formatHours(hoursStudied),
                label: "Hours Studied",
              },
              {
                key: "accuracy",
                Icon: Target,
                color: theme.chart5,
                value: `${Math.round(accuracyRate)}%`,
                label: "Accuracy Rate",
              },
            ]}
          />
        </CardContent>
      </Card>
    </View>
  )
})
