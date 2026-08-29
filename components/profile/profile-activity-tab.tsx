import { memo } from "react"
import { Award, Clock3, Flame, TrendingUp } from "lucide-react-native"
import { View } from "react-native"

import type { UserActivityFeed } from "@/lib/progress"
import type { ThemePalette } from "@/lib/theme"
import { getToneColor, TONE_TEXT_CLASS } from "@/lib/tone"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { StatTile } from "@/components/ui/stat-tile"
import { Text } from "@/components/ui/text"

import {
  AchievementBadgeIcon,
  getAchievementBadgeMeta,
} from "./profile-achievements"
import type { ProfileRecentActivityItem } from "./types"

/** Card title used inside the activity cards — icon, then a heading. */
function CardHeading({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: string
}) {
  return (
    <View className="flex-row items-center gap-2">
      {icon}
      <Text variant="subheading">{children}</Text>
    </View>
  )
}

/** Hairline between list rows; the first row never gets one. */
const rowDivider = (index: number) =>
  cn("py-3", index > 0 && "border-t border-border/70")

export const ProfileActivityTab = memo(function ProfileActivityTab({
  theme,
  activityFeed,
  recentActivityItems,
  isLoading,
  errorMessage,
  onLoadMoreAchievements,
  onLoadMoreQuizData,
  onLoadMoreLearningData,
  onViewDashboard,
  formatActivityDate,
}: {
  theme: ThemePalette
  activityFeed: UserActivityFeed | null
  recentActivityItems: ProfileRecentActivityItem[]
  isLoading: boolean
  errorMessage: string | null
  onLoadMoreAchievements: () => void
  onLoadMoreQuizData: () => void
  onLoadMoreLearningData: () => void
  onViewDashboard: () => void
  formatActivityDate: (value: string | null | undefined) => string
}) {
  if (isLoading) {
    return (
      <View className="gap-3">
        <Skeleton className="h-[84px] rounded-xl" />
        <Skeleton className="h-[150px] rounded-xl" />
        <Skeleton className="h-[190px] rounded-xl" />
      </View>
    )
  }

  if (errorMessage) {
    return (
      <EmptyState
        tone="destructive"
        title="Activity unavailable"
        description={errorMessage}
      />
    )
  }

  if (!activityFeed) {
    return (
      <EmptyState
        title="No activity yet"
        description="Finish a quiz or open a lesson and it will show up here."
      />
    )
  }

  const hasMoreSources =
    activityFeed.sessionsHasMore || activityFeed.learningHistoryHasMore

  return (
    <View className="gap-3">
      {/* Headline numbers */}
      <View className="flex-row gap-2.5">
        <StatTile
          className="flex-1"
          icon={<Flame size={14} color={theme.accentText} />}
          label="Streak"
          value={`${activityFeed.dayStreak}`}
          caption="days active"
        />
        <StatTile
          className="flex-1"
          icon={<TrendingUp size={14} color={theme.success} />}
          label="Weekly avg"
          value={`${activityFeed.weeklyAverageScore}%`}
          caption="score this week"
          tone="success"
        />
      </View>

      <Card>
        <CardContent size="compact" className="gap-0.5">
          <Text variant="label">Completed</Text>
          <Text variant="callout" className="font-semibold">
            {activityFeed.completedSessions} sittings ·{" "}
            {activityFeed.completedMaterials} materials
          </Text>
          <Text variant="caption">
            Last active {formatActivityDate(activityFeed.lastActiveAt)}
          </Text>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardContent className="gap-1">
          <CardHeading icon={<Award size={16} color={theme.primary} />}>
            Achievements
          </CardHeading>

          {activityFeed.achievements.length === 0 ? (
            <Text variant="caption" className="pt-1">
              No achievements yet. Keep practicing to unlock badges.
            </Text>
          ) : (
            activityFeed.achievements.map((achievement, index) => {
              const badge = getAchievementBadgeMeta(achievement)

              return (
                <View key={achievement.id} className={rowDivider(index)}>
                  <Badge tone={badge.tone} size="sm">
                    <AchievementBadgeIcon
                      icon={badge.icon}
                      color={getToneColor(theme, badge.tone)}
                      size={11}
                    />
                    <Text>{badge.badgeName}</Text>
                  </Badge>

                  <Text variant="callout" className="mt-1.5 font-bold">
                    {achievement.title}
                  </Text>
                  <Text variant="caption">
                    {achievement.description ?? "Milestone unlocked"}
                  </Text>
                  <Text variant="caption" className="mt-0.5">
                    {achievement.metricValue} ·{" "}
                    {formatActivityDate(achievement.earnedAt)}
                  </Text>
                </View>
              )
            })
          )}

          {activityFeed.achievementsHasMore ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onPress={onLoadMoreAchievements}
            >
              <Text>Load more achievements</Text>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="gap-1">
          <CardHeading icon={<Clock3 size={16} color={theme.primary} />}>
            Recent activity
          </CardHeading>

          {recentActivityItems.length === 0 ? (
            <Text variant="caption" className="pt-1">
              No recent quiz or learning activity yet.
            </Text>
          ) : (
            recentActivityItems.map((item, index) => (
              <View
                key={item.id}
                className={cn(rowDivider(index), "flex-row gap-3")}
              >
                <View
                  className="mt-1.5 h-2 w-2 rounded-full"
                  style={{ backgroundColor: getToneColor(theme, item.tone) }}
                />

                <View className="flex-1 gap-0.5">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text
                      variant="callout"
                      className="flex-1 font-semibold"
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text
                      variant="label"
                      className={TONE_TEXT_CLASS[item.tone]}
                    >
                      {item.kindLabel}
                    </Text>
                  </View>
                  <Text variant="caption">{item.metric}</Text>
                  <Text variant="caption">{item.statusText}</Text>
                </View>
              </View>
            ))
          )}
        </CardContent>
      </Card>

      {hasMoreSources ? (
        <View className="flex-row gap-2.5">
          {activityFeed.sessionsHasMore ? (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onPress={onLoadMoreQuizData}
            >
              <Text numberOfLines={1}>More sittings</Text>
            </Button>
          ) : null}

          {activityFeed.learningHistoryHasMore ? (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onPress={onLoadMoreLearningData}
            >
              <Text numberOfLines={1}>More learning data</Text>
            </Button>
          ) : null}
        </View>
      ) : null}

      <Button onPress={onViewDashboard}>
        <Text>View dashboard</Text>
      </Button>
    </View>
  )
})
