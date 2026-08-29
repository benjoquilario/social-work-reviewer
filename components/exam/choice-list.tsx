import { memo, useCallback } from "react"
import { View } from "react-native"

import type { PresentedChoice, PresentedQuestion } from "@/lib/session/question-pool"
import {
  AnswerOption,
  getAnswerOptionState,
} from "@/components/ui/answer-option"

/**
 * The answer options for one question.
 *
 * Two things this component is careful about, both from section 8:
 *
 *   • It renders `question.choices.length` rows, never four. The real bank has
 *     items with 3, 5 and 6 choices, and true/false items are two.
 *   • It reports the choice's **original** index, not the row it was drawn on.
 *     Under `shuffleChoices` those differ, and handing back the tapped position
 *     records the wrong answer and corrupts item statistics that are keyed by
 *     SKU and shared across every member.
 */

type ChoiceListProps = {
  presented: PresentedQuestion
  /** The original index the member picked, or undefined. */
  selectedIndex: number | undefined
  /** True once the answer has been revealed. */
  isGraded: boolean
  disabled?: boolean
  onSelect: (choice: PresentedChoice) => void
}

type ChoiceRowProps = {
  choice: PresentedChoice
  answerIndex: number
  selectedIndex: number | undefined
  isGraded: boolean
  disabled: boolean
  onSelect: (choice: PresentedChoice) => void
}

const ChoiceRow = memo(function ChoiceRow({
  choice,
  answerIndex,
  selectedIndex,
  isGraded,
  disabled,
  onSelect,
}: ChoiceRowProps) {
  const handlePress = useCallback(() => onSelect(choice), [choice, onSelect])

  return (
    <AnswerOption
      // The label is the row it sits on, so a shuffled list still reads
      // A, B, C down the screen. What gets *stored* is derived from
      // `choice.index` instead — see `lib/session/answers.ts`.
      label={choice.displayLabel}
      state={getAnswerOptionState({
        choiceIndex: choice.index,
        answerIndex,
        selectedIndex,
        isGraded,
      })}
      disabled={disabled || isGraded}
      onPress={handlePress}
    >
      {choice.text}
    </AnswerOption>
  )
})

export const ChoiceList = memo(function ChoiceList({
  presented,
  selectedIndex,
  isGraded,
  disabled = false,
  onSelect,
}: ChoiceListProps) {
  return (
    <View className="gap-2.5" accessibilityRole="radiogroup">
      {presented.choices.map((choice) => (
        <ChoiceRow
          key={`${presented.question.id}-${choice.index}`}
          choice={choice}
          answerIndex={presented.question.answerIndex}
          selectedIndex={selectedIndex}
          isGraded={isGraded}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </View>
  )
})
