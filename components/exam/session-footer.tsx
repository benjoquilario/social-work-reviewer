import { memo } from "react"
import ChevronLeft from "lucide-react-native/icons/chevron-left"
import ChevronRight from "lucide-react-native/icons/chevron-right"

import type { FeedbackTiming } from "@/lib/member/settings"
import { useThemePalette } from "@/hooks/use-theme"
import { BottomBar } from "@/components/ui/bottom-bar"
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
    // `minInset` is generous here because this is the one bar a person taps
    // dozens of times in a row: the primary action should never sit within a
    // thumb's width of the system gesture pill.
    <BottomBar minInset={16} className="flex-row items-center gap-3">
      {/* Square rather than a text-sized button: an icon-only control in a
          `lg` slot is mostly padding, and a 56dp target is comfortably above
          the 44/48dp floor both platforms recommend. */}
      <Button
        variant="outline"
        size="icon"
        className="h-14 w-14 shrink-0"
        disabled={isFirst}
        onPress={onPrevious}
        accessibilityLabel="Previous question"
      >
        <ChevronLeft size={20} color={theme.foreground} />
      </Button>

      {needsConfirm ? (
        <Button size="xl" className="flex-1" onPress={onConfirm}>
          <Text>Check answer</Text>
        </Button>
      ) : isLast ? (
        <Button
          size="xl"
          className="flex-1"
          disabled={isSubmitting}
          onPress={onSubmit}
        >
          <Text>{isSubmitting ? "Submitting…" : "Submit"}</Text>
        </Button>
      ) : (
        <Button
          size="xl"
          className="flex-1"
          disabled={!canAdvance}
          onPress={onNext}
        >
          <Text>Next</Text>
          <ChevronRight size={19} color={theme.primaryForeground} />
        </Button>
      )}
    </BottomBar>
  )
})
