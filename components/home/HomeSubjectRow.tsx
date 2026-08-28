import { memo } from "react"
import { ChevronRight, FolderOpen, LockKeyhole } from "lucide-react-native"
import { View } from "react-native"

import type { ThemePalette } from "@/lib/home-types"
import type { LearningSubject } from "@/lib/learning-content"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MotionPressable } from "@/components/ui/motion"
import { Text } from "@/components/ui/text"

/**
 * A subject, as a full-width row.
 *
 * This replaces a 300×236 card in a horizontal carousel: on a 360dp phone
 * that card ran off the right edge, and its two side-by-side buttons were
 * narrow enough to truncate their own labels ("Board exa…"). One row, one
 * tap target, one destination.
 */
export const HomeSubjectRow = memo(function HomeSubjectRow({
  subject,
  theme,
  onPress,
}: {
  subject: LearningSubject
  theme: ThemePalette
  onPress: (subject: LearningSubject) => void
}) {
  const isLocked = subject.isLocked
  const StatusIcon = isLocked ? LockKeyhole : FolderOpen

  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`${subject.name}, ${subject.topicCount} topics, ${subject.materialCount} materials${isLocked ? ", premium" : ""}`}
      onPress={() => onPress(subject)}
    >
      <Card>
        <CardContent size="compact" className="flex-row items-center gap-3">
          <View
            className={
              isLocked
                ? "h-11 w-11 items-center justify-center rounded-lg bg-accent/15"
                : "h-11 w-11 items-center justify-center rounded-lg bg-primary/10"
            }
          >
            <StatusIcon
              size={18}
              color={isLocked ? theme.accentText : theme.primary}
            />
          </View>

          <View className="flex-1 gap-0.5">
            <Text variant="subheading" numberOfLines={1}>
              {subject.name}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {subject.topicCount} topics · {subject.materialCount} materials
            </Text>
          </View>

          {isLocked ? (
            <Badge tone="accent" size="sm">
              Premium
            </Badge>
          ) : (
            <ChevronRight size={18} color={theme.mutedForeground} />
          )}
        </CardContent>
      </Card>
    </MotionPressable>
  )
})
