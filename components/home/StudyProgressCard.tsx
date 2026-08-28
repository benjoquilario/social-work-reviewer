import { memo } from "react"
import { BookOpen, CheckCircle2, Flame, Trophy } from "lucide-react-native"
import { View } from "react-native"

import type { ThemePalette } from "@/lib/theme"
import { Card, CardContent } from "@/components/ui/card"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

import { MetricRow } from "@/components/study/metric-row"
import { SectionLink } from "@/components/study/section-link"

const NUMBER_FMT = new Intl.NumberFormat("en-PH")

type StudyProgressCardProps = {
  theme: ThemePalette
  isLoading: boolean
  /** 0–100 overall completion across the learner's subjects. */
  progressPercent: number
  topicsStudied: number
  questionsSolved: number
  averageScore: number
  dayStreak: number
  onPressViewDetails: () => void
}

export const StudyProgressCard = memo(function StudyProgressCard({
  theme,
  isLoading,
  progressPercent,
  topicsStudied,
  questionsSolved,
  averageScore,
  dayStreak,
  onPressViewDetails,
}: StudyProgressCardProps) {
  if (isLoading) {
    return <Skeleton className="h-[152px] rounded-xl" />
  }

  const safePercent = Math.min(Math.max(Math.round(progressPercent), 0), 100)

  return (
    <Card>
      <CardContent className="gap-3.5">
        <View className="flex-row items-center justify-between">
          <Text variant="subheading">Your Study Progress</Text>

          <SectionLink
            theme={theme}
            label="View Details"
            accessibilityLabel="View progress details"
            onPress={onPressViewDetails}
          />
        </View>

        <View className="flex-row items-center gap-3">
          <ProgressBar
            className="flex-1"
            value={safePercent}
            label="Overall study progress"
          />
          <Text className="text-xs font-bold text-muted-foreground">
            {safePercent}%
          </Text>
        </View>

        <MetricRow
          className="border-t border-border/70 pt-3.5"
          items={[
            {
              key: "topics",
              Icon: BookOpen,
              color: theme.primary,
              value: NUMBER_FMT.format(topicsStudied),
              label: "Topics Studied",
            },
            {
              key: "questions",
              Icon: CheckCircle2,
              color: theme.success,
              value: NUMBER_FMT.format(questionsSolved),
              label: "Questions Solved",
            },
            {
              key: "average",
              Icon: Trophy,
              color: theme.accentText,
              value: `${Math.round(averageScore)}%`,
              label: "Average Score",
            },
            {
              key: "streak",
              Icon: Flame,
              color: theme.destructive,
              value: NUMBER_FMT.format(dayStreak),
              label: "Day Streak",
            },
          ]}
        />
      </CardContent>
    </Card>
  )
})
