import { memo } from "react"
import { ChevronRight, Layers, LockKeyhole } from "lucide-react-native"
import { View } from "react-native"

import type { LearningSubject } from "@/lib/learning-content"
import type { ThemePalette } from "@/lib/theme"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MotionPressable } from "@/components/ui/motion"
import { Text } from "@/components/ui/text"

/**
 * A subject in the library.
 *
 * The old card said the same thing three times — a "13 topics" pill, a
 * "0/13 visible" pill, and a "0 free · 13 premium" pill — and used a
 * ChevronRight glyph as the subject's icon while a second chevron pointed
 * right. One count line, one icon, one badge.
 *
 * Locked subjects keep full contrast. Dimming the whole card to 0.75 opacity,
 * as this did, drags body copy under the AA threshold to communicate
 * something the badge already says.
 */
export const SubjectCard = memo(function SubjectCard({
  subject,
  theme,
  showPremiumMix,
  onPress,
}: {
  subject: LearningSubject
  theme: ThemePalette
  /** Free/premium split is only news to a viewer who cannot see it all. */
  showPremiumMix: boolean
  onPress: (subject: LearningSubject) => void
}) {
  const isLocked = subject.isLocked
  const StatusIcon = isLocked ? LockKeyhole : Layers

  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`${subject.name}. ${subject.topicCount} topics, ${subject.materialCount} materials.${isLocked ? " Premium." : ""}`}
      onPress={() => onPress(subject)}
    >
      <Card>
        <CardContent className="gap-3">
          <View className="flex-row items-start gap-3">
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
              <Text variant="subheading" numberOfLines={2}>
                {subject.name}
              </Text>
              <Text variant="caption">
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
          </View>

          <Text
            variant="callout"
            className="text-muted-foreground"
            numberOfLines={2}
          >
            {isLocked
              ? "Every material in this subject is premium-only."
              : subject.description || "No description added yet."}
          </Text>

          {showPremiumMix ? (
            <View className="flex-row gap-2 border-t border-border/70 pt-3">
              <Badge tone="muted" size="sm">
                {`${subject.freeMaterialCount} free`}
              </Badge>
              <Badge tone="accent" size="sm">
                {`${subject.premiumMaterialCount} premium`}
              </Badge>
            </View>
          ) : null}
        </CardContent>
      </Card>
    </MotionPressable>
  )
})
