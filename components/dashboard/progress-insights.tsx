import { memo } from "react"
import { View } from "react-native"
import {
  Award,
  Flame,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native"

import type {
  AchievementHighlight,
  DashboardInsights,
  DashboardTrendSnapshot,
} from "@/lib/performance-stats"
import { THEME, withOpacity } from "@/lib/theme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

function formatAchievementDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value))
  } catch {
    return value
  }
}

const TrendCard = memo(function TrendCard({
  snapshot,
  theme,
}: {
  snapshot: DashboardTrendSnapshot
  theme: ThemePalette
}) {
  const isPositive = snapshot.trend === "up"
  const isNegative = snapshot.trend === "down"
  const tone = isPositive
    ? theme.success
    : isNegative
      ? theme.warning
      : theme.primary
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Flame

  return (
    <Card className="flex-1" style={{ borderWidth: 1, borderColor: theme.border }}>
      <CardContent className="gap-2 px-3.5 py-3.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-[10px] font-black uppercase tracking-[1.1px] text-primary">
            {snapshot.label}
          </Text>
          <View
            className="h-7 w-7 items-center justify-center rounded-xl"
            style={{ backgroundColor: withOpacity(tone, 0.14) }}
          >
            <TrendIcon size={14} color={tone} />
          </View>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "900", color: theme.foreground }}>
          {snapshot.currentAnsweredCount}
        </Text>
        <Text className="text-[11px] text-muted-foreground">
          {snapshot.currentLabel} answered
        </Text>
        <Text className="text-[11px] text-muted-foreground">
          {snapshot.answeredDelta >= 0 ? "+" : ""}
          {snapshot.answeredDelta} vs {snapshot.previousLabel}
        </Text>
        <Text className="text-[11px] text-muted-foreground">
          {snapshot.accuracyDelta >= 0 ? "+" : ""}
          {snapshot.accuracyDelta}% accuracy, {snapshot.studyMinutesDelta >= 0 ? "+" : ""}
          {snapshot.studyMinutesDelta} min
        </Text>
      </CardContent>
    </Card>
  )
})

const SubjectFocusRow = memo(function SubjectFocusRow({
  label,
  subjectName,
  percent,
  answered,
  tone,
}: {
  label: string
  subjectName: string
  percent: number
  answered: number
  tone: string
}) {
  return (
    <View
      className="rounded-2xl px-3.5 py-3"
      style={{ backgroundColor: withOpacity(tone, 0.1) }}
    >
      <Text
        className="text-[10px] font-black uppercase tracking-[1px]"
        style={{ color: tone }}
      >
        {label}
      </Text>
      <Text className="mt-1 text-[14px] font-bold text-foreground">
        {subjectName}
      </Text>
      <Text className="text-[11px] text-muted-foreground">
        {percent}% accuracy across {answered} answers
      </Text>
    </View>
  )
})

const AchievementRow = memo(function AchievementRow({
  achievement,
  theme,
  isLast,
}: {
  achievement: AchievementHighlight
  theme: ThemePalette
  isLast: boolean
}) {
  return (
    <View
      className="py-2.5"
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: withOpacity(theme.border, 0.5),
      }}
    >
      <Text className="text-[12px] font-bold text-foreground">
        {achievement.title}
      </Text>
      <Text className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
        {achievement.description ?? "Milestone unlocked"}
      </Text>
      <Text className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
        {achievement.achievementType.replaceAll("_", " ")} -{" "}
        {formatAchievementDate(achievement.earnedAt)}
      </Text>
    </View>
  )
})

export const ProgressInsightsSection = memo(function ProgressInsightsSection({
  insights,
  theme,
}: {
  insights: DashboardInsights
  theme: ThemePalette
}) {
  const strongest = insights.strongestSubject
  const weakest = insights.weakestSubject

  return (
    <View className="gap-4">
      <View className="gap-0.5">
        <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
          Review Insights
        </Text>
        <Text className="text-[17px] font-extrabold text-foreground">
          Momentum, focus, and achievements
        </Text>
      </View>

      <View className="gap-2.5">
        <TrendCard snapshot={insights.weekOverWeek} theme={theme} />
        <TrendCard snapshot={insights.monthOverMonth} theme={theme} />
      </View>

      <Card style={{ borderWidth: 1, borderColor: theme.border }}>
        <CardContent className="gap-3 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <Flame size={15} color={theme.accent} />
            <Text className="text-[13px] font-bold text-foreground">
              Consistency Target
            </Text>
          </View>
          <View className="flex-row gap-2.5">
            <View
              className="flex-1 rounded-2xl px-3.5 py-3"
              style={{ backgroundColor: withOpacity(theme.primary, 0.08) }}
            >
              <Text className="text-[10px] font-black uppercase tracking-[1px] text-primary">
                Active This Week
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "900", color: theme.foreground }}>
                {insights.consistency.currentWeekActiveDays}/
                {insights.consistency.targetActiveDays}
              </Text>
              <Text className="text-[11px] text-muted-foreground">
                {insights.consistency.remainingDaysToGoal === 0
                  ? "Weekly consistency goal reached"
                  : `${insights.consistency.remainingDaysToGoal} more active day(s) to goal`}
              </Text>
            </View>
            <View
              className="flex-1 rounded-2xl px-3.5 py-3"
              style={{ backgroundColor: withOpacity(theme.accent, 0.1) }}
            >
              <Text
                className="text-[10px] font-black uppercase tracking-[1px]"
                style={{ color: theme.accent }}
              >
                Streak and Score
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "900", color: theme.foreground }}>
                {insights.consistency.currentStreak} days
              </Text>
              <Text className="text-[11px] text-muted-foreground">
                {Math.round(insights.consistency.weeklyAverageScore)}% weekly average
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      <Card style={{ borderWidth: 1, borderColor: theme.border }}>
        <CardContent className="gap-3 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <ShieldAlert size={15} color={theme.warning} />
            <Text className="text-[13px] font-bold text-foreground">
              Subject Focus
            </Text>
          </View>
          <View className="gap-2.5">
            {strongest ? (
              <SubjectFocusRow
                label="Strongest Right Now"
                subjectName={strongest.subjectName}
                percent={strongest.correctPercent}
                answered={strongest.totalAnswered}
                tone={theme.success}
              />
            ) : null}
            {weakest ? (
              <SubjectFocusRow
                label="Needs Review"
                subjectName={weakest.subjectName}
                percent={weakest.correctPercent}
                answered={weakest.totalAnswered}
                tone={theme.warning}
              />
            ) : null}
            {insights.focusSubjects.length > 0 ? (
              <Text className="text-[11px] leading-5 text-muted-foreground">
                Focus next on {insights.focusSubjects.map((subject) => subject.subjectName).join(", ")} to raise your weakest areas faster.
              </Text>
            ) : (
              <Text className="text-[11px] leading-5 text-muted-foreground">
                Keep answering more board exam questions to unlock subject-specific recommendations.
              </Text>
            )}
          </View>
        </CardContent>
      </Card>

      <Card style={{ borderWidth: 1, borderColor: theme.border }}>
        <CardContent className="gap-3 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <Award size={15} color={theme.primary} />
            <Text className="text-[13px] font-bold text-foreground">
              Recent Achievements
            </Text>
          </View>
          {insights.recentAchievements.length === 0 ? (
            <Text className="text-[11px] leading-5 text-muted-foreground">
              No achievements earned yet. Finish quizzes, stay consistent, and complete materials to start building your badge history.
            </Text>
          ) : (
            insights.recentAchievements.map((achievement, index) => (
              <AchievementRow
                key={achievement.id}
                achievement={achievement}
                theme={theme}
                isLast={index === insights.recentAchievements.length - 1}
              />
            ))
          )}
        </CardContent>
      </Card>
    </View>
  )
})
