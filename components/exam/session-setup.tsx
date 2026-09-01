import { memo, useCallback } from "react"
import Check from "lucide-react-native/icons/check"
import { Pressable, View } from "react-native"

import {
  FEEDBACK_TIMING_LABELS,
  QUESTION_SOURCE_LABELS,
  type FeedbackTiming,
  type MemberSettings,
  type QuestionSource,
} from "@/lib/member/settings"
import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

/**
 * The pre-flight screen: how long, what kind, which items.
 *
 * Seeded from the member's saved `user_settings` so the common case is one
 * tap — the choices here are per-sitting overrides, not a second copy of the
 * preferences screen.
 */

export type SessionLengthOption = {
  id: string
  label: string
  description: string
  questionCount: number
  minutes: number
}

/**
 * Presets, capped to what the paper actually holds.
 *
 * Offering "120 items" over an 80-item set is how a run silently becomes
 * shorter than it claims, so anything that does not fit is dropped rather than
 * quietly truncated.
 */
export function buildLengthOptions(
  availableCount: number
): SessionLengthOption[] {
  const presets: SessionLengthOption[] = [
    {
      id: "quick",
      label: "Quick drill",
      description: "20 items · 10 minutes",
      questionCount: 20,
      minutes: 10,
    },
    {
      id: "practice",
      label: "Practice",
      description: "50 items · 30 minutes",
      questionCount: 50,
      minutes: 30,
    },
    {
      id: "extended",
      label: "Extended",
      description: "80 items · 45 minutes",
      questionCount: 80,
      minutes: 45,
    },
  ]

  const fitting = presets.filter(
    (preset) => preset.questionCount <= availableCount
  )

  return [
    ...fitting,
    {
      id: "full",
      label: "Whole paper",
      description: `${availableCount} items · ${Math.max(
        Math.round(availableCount * 0.6),
        5
      )} minutes`,
      questionCount: availableCount,
      minutes: Math.max(Math.round(availableCount * 0.6), 5),
    },
  ]
}

type OptionRowProps = {
  title: string
  description: string
  isSelected: boolean
  onPress: () => void
}

const OptionRow = memo(function OptionRow({
  title,
  description,
  isSelected,
  onPress,
}: OptionRowProps) {
  const theme = useThemePalette()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${title}. ${description}`}
      className="flex-row items-center gap-3 rounded-md border px-3.5 py-3 active:opacity-90"
      style={{
        borderColor: isSelected ? theme.primary : theme.border,
        borderWidth: isSelected ? 1.5 : 1,
        backgroundColor: isSelected
          ? withOpacity(theme.primary, 0.08)
          : theme.card,
      }}
    >
      <View className="flex-1 gap-0.5">
        <Text variant="subheading">{title}</Text>
        <Text variant="caption">{description}</Text>
      </View>

      {isSelected ? (
        <Check size={17} color={theme.primary} strokeWidth={3} />
      ) : null}
    </Pressable>
  )
})

type SessionLengthPickerProps = {
  options: SessionLengthOption[]
  selectedId: string
  onSelect: (option: SessionLengthOption) => void
}

export const SessionLengthPicker = memo(function SessionLengthPicker({
  options,
  selectedId,
  onSelect,
}: SessionLengthPickerProps) {
  return (
    <Card>
      <CardContent className="gap-2.5">
        <Text variant="label">How long</Text>

        {options.map((option) => (
          <OptionRow
            key={option.id}
            title={option.label}
            description={option.description}
            isSelected={option.id === selectedId}
            onPress={() => onSelect(option)}
          />
        ))}
      </CardContent>
    </Card>
  )
})

type FeedbackTimingPickerProps = {
  value: FeedbackTiming
  onChange: (value: FeedbackTiming) => void
}

const FEEDBACK_ORDER: FeedbackTiming[] = ["instant", "on_next", "at_end"]

export const FeedbackTimingPicker = memo(function FeedbackTimingPicker({
  value,
  onChange,
}: FeedbackTimingPickerProps) {
  const handleChange = useCallback(
    (next: FeedbackTiming) => () => onChange(next),
    [onChange]
  )

  return (
    <Card>
      <CardContent className="gap-2.5">
        <Text variant="label">When to reveal the answer</Text>

        {FEEDBACK_ORDER.map((timing) => (
          <OptionRow
            key={timing}
            title={FEEDBACK_TIMING_LABELS[timing].title}
            description={FEEDBACK_TIMING_LABELS[timing].description}
            isSelected={timing === value}
            onPress={handleChange(timing)}
          />
        ))}
      </CardContent>
    </Card>
  )
})

type QuestionSourcePickerProps = {
  value: QuestionSource
  onChange: (value: QuestionSource) => void
  /** How many items each source would actually serve. */
  availability?: Partial<Record<QuestionSource, number>>
}

const SOURCE_ORDER: QuestionSource[] = ["all", "unanswered", "incorrect"]

export const QuestionSourcePicker = memo(function QuestionSourcePicker({
  value,
  onChange,
  availability,
}: QuestionSourcePickerProps) {
  const handleChange = useCallback(
    (next: QuestionSource) => () => onChange(next),
    [onChange]
  )

  return (
    <Card>
      <CardContent className="gap-2.5">
        <Text variant="label">Which questions</Text>

        {SOURCE_ORDER.map((source) => {
          const count = availability?.[source]

          return (
            <OptionRow
              key={source}
              title={QUESTION_SOURCE_LABELS[source].title}
              description={
                typeof count === "number"
                  ? `${count} available · ${QUESTION_SOURCE_LABELS[source].description}`
                  : QUESTION_SOURCE_LABELS[source].description
              }
              isSelected={source === value}
              onPress={handleChange(source)}
            />
          )
        })}
      </CardContent>
    </Card>
  )
})

/** The one-line summary above the start button. */
export function describeSession(
  settings: Pick<MemberSettings, "feedbackTiming" | "shuffleQuestions">,
  questionCount: number,
  minutes: number
) {
  const parts = [
    `${questionCount} items`,
    minutes > 0 ? `${minutes} minutes` : null,
    FEEDBACK_TIMING_LABELS[settings.feedbackTiming].title.toLowerCase() +
      " feedback",
    settings.shuffleQuestions ? "shuffled" : null,
  ]

  return parts.filter(Boolean).join(" · ")
}
