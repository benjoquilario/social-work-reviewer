import { memo } from "react"
import { ChevronRight, FileQuestion } from "lucide-react-native"
import { Pressable, View } from "react-native"

import type { QuestionSet } from "@/lib/content/question-sets"
import { useThemePalette } from "@/hooks/use-theme"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

/**
 * One lettered set.
 *
 * `setCode` is rendered, never validated — codes run A…Z then AA, AB and on
 * without a ceiling, so an app that checks for five letters breaks on the
 * sixth set.
 */

type QuestionSetCardProps = {
  set: QuestionSet
  /** Rendered when the member has an unfinished sitting on this set. */
  resumeLabel?: string | null
  onPress: () => void
}

export const QuestionSetCard = memo(function QuestionSetCard({
  set,
  resumeLabel,
  onPress,
}: QuestionSetCardProps) {
  const theme = useThemePalette()
  const isEmpty = set.questionCount === 0

  return (
    <Pressable
      onPress={onPress}
      disabled={isEmpty}
      accessibilityRole="button"
      accessibilityLabel={`${set.title}, ${set.questionCount} questions`}
      accessibilityState={{ disabled: isEmpty }}
      className="active:opacity-90"
    >
      <Card style={{ opacity: isEmpty ? 0.6 : 1 }}>
        <CardContent size="compact" className="gap-2.5">
          <View className="flex-row items-center gap-3">
            <View
              className="h-11 w-11 items-center justify-center rounded-md"
              style={{ backgroundColor: theme.secondary }}
            >
              <Text
                className="text-sm font-black"
                style={{ color: theme.secondaryForeground }}
              >
                {set.setCode || "—"}
              </Text>
            </View>

            <View className="flex-1 gap-0.5">
              <Text variant="subheading">{set.title}</Text>
              {set.description ? (
                <Text variant="caption" numberOfLines={1}>
                  {set.description}
                </Text>
              ) : null}
            </View>

            <ChevronRight size={18} color={theme.mutedForeground} />
          </View>

          <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
            <View className="flex-row items-center gap-1.5">
              <FileQuestion size={13} color={theme.mutedForeground} />
              <Text variant="label">
                {isEmpty ? "No questions yet" : `${set.questionCount} questions`}
              </Text>
            </View>

            {resumeLabel ? <Badge tone="warning" size="sm">{resumeLabel}</Badge> : null}
          </View>
        </CardContent>
      </Card>
    </Pressable>
  )
})
