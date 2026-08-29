import { memo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react-native"
import { View } from "react-native"

import type { FeedbackTiming } from "@/lib/member/settings"
import { useThemePalette } from "@/hooks/use-theme"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"

/**
 * The action bar at the bottom of a sitting.
 *
 * It lives in the thumb zone and its primary action changes with
 * `feedbackTiming`:
 *
 *   on_next  "Check answer" while a choice is pending, then "Next"
 *   instant  "Next", because tapping the choice already graded it
 *   at_end   "Next", and "Submit" on the last item
 *
 * `allowSkip` decides whether Next is available with nothing chosen. When it is
 * off, the button is disabled rather than hidden — a control that vanishes
 * reads as a bug, one that is dimmed reads as a requirement.
 */

type SessionFooterProps = {
  feedbackTiming: FeedbackTiming
  isFirst: boolean
  isLast: boolean
  hasSelection: boolean
  isRevealed: boolean
  allowSkip: boolean
  isSubmitting: boolean
  onPrevious: () => void
  onNext: () => void
  onConfirm: () => void
  onSubmit: () => void
}

export const SessionFooter = memo(function SessionFooter({
  feedbackTiming,
  isFirst,
  isLast,
  hasSelection,
  isRevealed,
  allowSkip,
  isSubmitting,
  onPrevious,
  onNext,
  onConfirm,
  onSubmit,
}: SessionFooterProps) {
  const theme = useThemePalette()

  const needsConfirm =
    feedbackTiming === "on_next" && hasSelection && !isRevealed

  const canAdvance = allowSkip || hasSelection

  return (
    <View className="flex-row items-center gap-2 border-t border-border/70 bg-background px-4 pb-4 pt-3">
      <Button
        variant="outline"
        size="lg"
        disabled={isFirst}
        onPress={onPrevious}
        accessibilityLabel="Previous question"
      >
        <ChevronLeft size={17} color={theme.foreground} />
      </Button>

      {needsConfirm ? (
        <Button size="lg" className="flex-1" onPress={onConfirm}>
          <Text>Check answer</Text>
        </Button>
      ) : isLast ? (
        <Button
          size="lg"
          className="flex-1"
          disabled={isSubmitting}
          onPress={onSubmit}
        >
          <Text>{isSubmitting ? "Submitting…" : "Submit"}</Text>
        </Button>
      ) : (
        <Button
          size="lg"
          className="flex-1"
          disabled={!canAdvance}
          onPress={onNext}
        >
          <Text>Next</Text>
          <ChevronRight size={17} color={theme.primaryForeground} />
        </Button>
      )}
    </View>
  )
})
