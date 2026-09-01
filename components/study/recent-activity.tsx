import { memo } from "react"
import ChevronRight from "lucide-react-native/icons/chevron-right"
import type { LucideIcon } from "lucide-react-native"
import { Pressable, View } from "react-native"

import { withOpacity, type ThemePalette } from "@/lib/theme"
import { getToneColor, TONE_TEXT_CLASS, type Tone } from "@/lib/tone"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

import { SectionLink } from "./section-link"

type RecentActivityRowProps = {
  theme: ThemePalette
  Icon: LucideIcon
  title: string
  timeLabel: string
  /** Optional trailing score pill, e.g. "84%". */
  scoreLabel?: string | null
  tone: Tone
  isLast: boolean
  onPress?: () => void
}

/**
 * One row in the Recent Activity list.
 *
 * The tinted circle carries the activity type, so the row needs no second
 * label to say "Quiz" or "Learning" — colour plus glyph does it in a fraction
 * of the width. Rows are separated by a hairline rather than gaps so the list
 * reads as one block; the last row drops it so the card doesn't end on a rule.
 */
export const RecentActivityRow = memo(function RecentActivityRow({
  theme,
  Icon,
  title,
  timeLabel,
  scoreLabel,
  tone,
  isLast,
  onPress,
}: RecentActivityRowProps) {
  const toneColor = getToneColor(theme, tone)

  const content = (
    <View
      className={cn(
        "flex-row items-center gap-3 px-4 py-3",
        !isLast && "border-b border-border/70"
      )}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: withOpacity(toneColor, 0.12) }}
      >
        <Icon size={17} color={toneColor} strokeWidth={2.4} />
      </View>

      <View className="flex-1 gap-0.5">
        <Text
          variant="callout"
          numberOfLines={2}
          className="font-semibold text-card-foreground"
        >
          {title}
        </Text>
        <Text variant="caption">{timeLabel}</Text>
      </View>

      {scoreLabel ? (
        <View
          className="rounded-xs px-2 py-1"
          style={{ backgroundColor: withOpacity(toneColor, 0.12) }}
        >
          <Text className={cn("text-xs font-bold", TONE_TEXT_CLASS[tone])}>
            {scoreLabel}
          </Text>
        </View>
      ) : onPress ? (
        <ChevronRight
          size={18}
          color={theme.mutedForeground}
          strokeWidth={2.2}
        />
      ) : null}
    </View>
  )

  if (!onPress) {
    return content
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${timeLabel}`}
      onPress={onPress}
      className="active:bg-muted/50"
    >
      {content}
    </Pressable>
  )
})

export type RecentActivityItem = {
  id: string
  Icon: LucideIcon
  title: string
  timeLabel: string
  scoreLabel?: string | null
  tone: Tone
  onPress?: () => void
}

type RecentActivitySectionProps = {
  theme: ThemePalette
  /** Home and Profile use the same list under the same heading. */
  title?: string
  items: RecentActivityItem[]
  isLoading: boolean
  errorMessage: string | null
  onPressSeeAll: () => void
}

export const RecentActivitySection = memo(function RecentActivitySection({
  theme,
  title = "Recent Activity",
  items,
  isLoading,
  errorMessage,
  onPressSeeAll,
}: RecentActivitySectionProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">{title}</Text>
        <SectionLink
          theme={theme}
          label="See all"
          accessibilityLabel="See all recent activity"
          onPress={onPressSeeAll}
        />
      </View>

      {isLoading ? (
        <Skeleton className="h-[168px] rounded-xl" />
      ) : errorMessage ? (
        <EmptyState
          tone="destructive"
          title="Activity unavailable"
          description={errorMessage}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Finish a quiz or open a lesson and it will show up here."
        />
      ) : (
        // The card owns no padding: each row pads itself so its divider can
        // run the full width instead of stopping short of the card edge.
        <Card className="overflow-hidden">
          {items.map((item, index) => (
            <RecentActivityRow
              key={item.id}
              theme={theme}
              Icon={item.Icon}
              title={item.title}
              timeLabel={item.timeLabel}
              scoreLabel={item.scoreLabel}
              tone={item.tone}
              isLast={index === items.length - 1}
              onPress={item.onPress}
            />
          ))}
        </Card>
      )}
    </View>
  )
})
