import { memo } from "react"
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react-native"
import { View } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

/**
 * The verdict and the rationale, shown once an answer is revealed.
 *
 * Whether it appears at all is `feedbackTiming` plus `showExplanations`
 * (section 8): under `at_end` nothing is revealed during the run, and this
 * component is simply not rendered.
 */

type ExplanationPanelProps = {
  isCorrect: boolean
  /** The right answer, spelled out — shown when they got it wrong. */
  correctAnswerLabel?: string
  correctAnswerText?: string
  explanation?: string
  showExplanation?: boolean
}

export const ExplanationPanel = memo(function ExplanationPanel({
  isCorrect,
  correctAnswerLabel,
  correctAnswerText,
  explanation,
  showExplanation = true,
}: ExplanationPanelProps) {
  const theme = useThemePalette()
  const accent = isCorrect ? theme.success : theme.destructive
  const Icon = isCorrect ? CheckCircle2 : XCircle

  return (
    <View
      className="gap-2.5 rounded-lg border px-4 py-3.5"
      style={{
        borderColor: withOpacity(accent, 0.3),
        backgroundColor: withOpacity(accent, 0.08),
      }}
      accessibilityLiveRegion="polite"
    >
      <View className="flex-row items-center gap-2">
        <Icon size={16} color={accent} strokeWidth={2.5} />
        <Text
          className="text-sm font-extrabold"
          style={{ color: accent }}
        >
          {isCorrect ? "Correct" : "Not quite"}
        </Text>
      </View>

      {!isCorrect && correctAnswerText ? (
        <Text variant="callout">
          <Text className="text-sm font-bold">
            {correctAnswerLabel ? `${correctAnswerLabel}. ` : ""}
          </Text>
          {correctAnswerText}
        </Text>
      ) : null}

      {showExplanation && explanation ? (
        <View className="flex-row gap-2 pt-0.5">
          <Lightbulb size={14} color={theme.mutedForeground} />
          <Text variant="caption" className="flex-1">
            {explanation}
          </Text>
        </View>
      ) : null}
    </View>
  )
})
