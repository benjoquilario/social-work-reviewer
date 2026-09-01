import { memo } from "react"
import ChevronRight from "lucide-react-native/icons/chevron-right"
import LockKeyhole from "lucide-react-native/icons/lock-keyhole"
import { View } from "react-native"

import type { LearningTopicSummary } from "@/lib/learning-content"
import type { ThemePalette } from "@/lib/theme"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MotionPressable } from "@/components/ui/motion"
import { Text } from "@/components/ui/text"

/**
 * A topic in a subject, numbered so the sequence is visible.
 *
 * The previous row rendered a lock icon on the left AND a second lock on the
 * right for the same locked topic, then set `borderBottomWidth` inline while
 * also carrying a `border-b` class — two rules fighting over one hairline.
 */
export const TopicCard = memo(function TopicCard({
  topic,
  position,
  theme,
  onPress,
}: {
  topic: LearningTopicSummary
  /** 1-based order shown in the leading tile. */
  position: number
  theme: ThemePalette
  onPress: (topic: LearningTopicSummary) => void
}) {
  const isEmpty = topic.materialCount === 0
  const isLocked = topic.isLocked

  const subtitle = isEmpty
    ? "No materials added yet"
    : `${topic.materialCount} ${topic.materialCount === 1 ? "material" : "materials"}`

  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isEmpty }}
      accessibilityLabel={`Topic ${position}. ${topic.title}. ${subtitle}.${isLocked ? " Premium." : ""}`}
      disabled={isEmpty}
      disableMotion={isEmpty}
      onPress={() => onPress(topic)}
    >
      <Card>
        <CardContent size="compact" className="gap-2">
          <View className="flex-row items-center gap-3">
            <View
              className={
                isEmpty
                  ? "h-9 w-9 items-center justify-center rounded-lg bg-muted"
                  : "h-9 w-9 items-center justify-center rounded-lg bg-primary/10"
              }
            >
              {isLocked ? (
                <LockKeyhole size={15} color={theme.accentText} />
              ) : (
                <Text
                  className={
                    isEmpty
                      ? "text-xs font-black text-muted-foreground"
                      : "text-xs font-black text-primary"
                  }
                >
                  {position}
                </Text>
              )}
            </View>

            <View className="flex-1 gap-0.5">
              <Text variant="callout" className="font-bold" numberOfLines={2}>
                {topic.title}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {subtitle}
              </Text>
            </View>

            {isLocked ? (
              <Badge tone="accent" size="sm">
                Premium
              </Badge>
            ) : isEmpty ? null : (
              <ChevronRight size={18} color={theme.mutedForeground} />
            )}
          </View>

          {topic.description ? (
            <Text variant="caption" numberOfLines={2}>
              {topic.description}
            </Text>
          ) : null}
        </CardContent>
      </Card>
    </MotionPressable>
  )
})
