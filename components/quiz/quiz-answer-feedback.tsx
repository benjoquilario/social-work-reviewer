import { useEffect } from "react"
import * as Haptics from "expo-haptics"
import { Check, Lightbulb, X } from "lucide-react-native"
import { View } from "react-native"

import { useAppPreferences } from "@/lib/app-preferences"
import { withOpacity, type ThemePalette } from "@/lib/theme"
import { FadeInView } from "@/components/ui/motion"
import { Text } from "@/components/ui/text"

type QuizAnswerFeedbackProps = {
  theme: ThemePalette
  isCorrect: boolean
  /** "B" — only shown when the learner got it wrong. */
  correctLetter: string
  correctChoice: string
  explanation: string
}

/**
 * The verdict and rationale for the question just answered.
 *
 * Sits *below the choices*, not on a screen of its own. The previous design
 * pushed a full-screen panel over the question, so at the exact moment a
 * learner is told they were wrong, the stem and the option they picked are
 * gone. Reviewing for a board exam is largely about building the link between
 * a stem and its answer, and that link cannot form when the two are never on
 * screen together. Keeping the graded choices visible behind this panel is the
 * whole point of the change.
 */
export function QuizAnswerFeedback({
  theme,
  isCorrect,
  correctLetter,
  correctChoice,
  explanation,
}: QuizAnswerFeedbackProps) {
  const hapticsEnabled = useAppPreferences(
    (state) => state.preferences.hapticsEnabled
  )

  const accent = isCorrect ? theme.success : theme.destructive

  // One pulse at the moment of the verdict. Notification-style rather than
  // impact-style so "right" and "wrong" feel different in the hand — on a
  // timed set the learner often knows the result before reading it.
  useEffect(() => {
    if (!hapticsEnabled) {
      return
    }

    void Haptics.notificationAsync(
      isCorrect
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    ).catch(() => undefined)
  }, [hapticsEnabled, isCorrect])

  const body = (
    <View
      accessibilityRole="alert"
      className="gap-3 rounded-xl border p-4"
      style={{
        backgroundColor: withOpacity(accent, 0.08),
        borderColor: withOpacity(accent, 0.28),
      }}
    >
      <View className="flex-row items-center gap-2.5">
        <View
          className="h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: accent }}
        >
          {isCorrect ? (
            <Check size={16} color={theme.successForeground} strokeWidth={3.4} />
          ) : (
            <X size={16} color={theme.destructiveForeground} strokeWidth={3.4} />
          )}
        </View>

        <View className="flex-1">
          <Text
            className="text-base font-extrabold"
            style={{ color: accent }}
          >
            {isCorrect ? "Correct" : "Not quite"}
          </Text>

          {/* Restating the answer here saves a glance back up the list. The
              options above already mark it, so this stays one quiet line. */}
          {!isCorrect ? (
            <Text variant="caption" numberOfLines={2}>
              Correct answer: {correctLetter}. {correctChoice}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="gap-1.5 border-t border-border/60 pt-3">
        <View className="flex-row items-center gap-1.5">
          <Lightbulb size={13} color={theme.mutedForeground} strokeWidth={2.4} />
          <Text variant="label">Why</Text>
        </View>
        <Text variant="callout" className="leading-6 text-card-foreground">
          {explanation}
        </Text>
      </View>
    </View>
  )

  // FadeInView already honours both the app's animations preference and the
  // OS reduce-motion setting, so the reveal degrades to a plain mount rather
  // than needing its own check here.
  return <FadeInView>{body}</FadeInView>
}
