import { memo } from "react"
import BadgeCheck from "lucide-react-native/icons/badge-check"
import CalendarDays from "lucide-react-native/icons/calendar-days"
import CheckCircle2 from "lucide-react-native/icons/circle-check"
import Flame from "lucide-react-native/icons/flame"
import ShieldCheck from "lucide-react-native/icons/shield-check"
import Trophy from "lucide-react-native/icons/trophy"
import { Pressable, View } from "react-native"

import { withOpacity, type ThemePalette } from "@/lib/theme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { CommunityAvatar } from "@/components/community/avatar"
import { MetricRow } from "@/components/study/metric-row"

const NUMBER_FMT = new Intl.NumberFormat("en-PH")

type ProfileIdentityCardProps = {
  theme: ThemePalette
  displayName: string
  initials: string
  avatarUrl: string | null
  /** Study track, shown as the pill under the name. */
  roleLabel: string
  /** School or review centre; the quiet line under the pill. */
  subtitle: string
  isSubtitlePlaceholder: boolean
  isVerified: boolean
  daysLeftLabel: string
  questionsSolved: number
  averageScore: number
  dayStreak: number
  onPressEdit: () => void
}

/**
 * Who the learner is, and the four numbers that describe where they stand.
 *
 * Identity and progress share one card on purpose. A board-exam reviewer's
 * profile is not a social page — the useful answer to "who am I here" is the
 * countdown and the streak, so the stats sit inside the identity block rather
 * than in a separate panel below it.
 */
export const ProfileIdentityCard = memo(function ProfileIdentityCard({
  theme,
  displayName,
  initials,
  avatarUrl,
  roleLabel,
  subtitle,
  isSubtitlePlaceholder,
  isVerified,
  daysLeftLabel,
  questionsSolved,
  averageScore,
  dayStreak,
  onPressEdit,
}: ProfileIdentityCardProps) {
  return (
    <Card>
      <CardContent className="gap-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${displayName}. ${roleLabel}. Edit your profile.`}
          onPress={onPressEdit}
          className="flex-row items-center gap-4 active:opacity-80"
        >
          <View>
            <CommunityAvatar
              label={initials}
              theme={theme}
              size="xl"
              sourceUri={avatarUrl}
              className="rounded-full"
            />

            {/* Verified mark reads as "email confirmed", not a social tick. */}
            {isVerified ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="absolute bottom-0 right-0 h-6 w-6 items-center justify-center rounded-full border-2"
                style={{
                  backgroundColor: theme.primary,
                  borderColor: theme.card,
                }}
              >
                <BadgeCheck
                  size={13}
                  color={theme.primaryForeground}
                  strokeWidth={3}
                />
              </View>
            ) : null}
          </View>

          <View className="flex-1 gap-1.5">
            <Text variant="title" numberOfLines={1}>
              {displayName}
            </Text>

            <View
              className="flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1"
              style={{ backgroundColor: withOpacity(theme.primary, 0.12) }}
            >
              <ShieldCheck size={12} color={theme.primary} strokeWidth={2.6} />
              <Text className="text-2xs font-bold text-primary">
                {roleLabel}
              </Text>
            </View>

            <Text
              variant="caption"
              numberOfLines={2}
              className={isSubtitlePlaceholder ? "italic" : undefined}
            >
              {subtitle}
            </Text>
          </View>
        </Pressable>

        <MetricRow
          className="border-t border-border/70 pt-3.5"
          items={[
            {
              key: "days-left",
              Icon: CalendarDays,
              color: theme.primary,
              value: daysLeftLabel,
              label: "Days Left",
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
