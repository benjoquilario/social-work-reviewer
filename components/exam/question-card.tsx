import { memo } from "react"
import { View } from "react-native"

import type { FeedbackTiming } from "@/lib/member/settings"
import type {
  PresentedChoice,
  PresentedQuestion,
} from "@/lib/session/question-pool"
import { Card, CardContent } from "@/components/ui/card"
import { ChoiceList } from "./choice-list"
import { QuestionActions } from "./question-actions"
import { ExplanationPanel } from "./explanation-panel"
import { QuestionPrompt } from "./question-prompt"

/**
 * One question, mid-sitting.
 *
 * The whole behaviour of the screen turns on `feedbackTiming` (section 8), and
 * the branch lives here so no caller has to remember it:
 *
 *   instant  graded the moment a choice is tapped
 *   on_next  changeable until they confirm, then graded
 *   at_end   never graded here — the results screen is the only reveal
 */

type ExamQuestionCardProps = {
  presented: PresentedQuestion
  total: number
  selectedIndex: number | undefined
  feedbackTiming: FeedbackTiming
  /** True once this specific question has been revealed. */
  isRevealed: boolean
  showExplanations: boolean
  onSelect: (choice: PresentedChoice) => void
  /**
   * Saving and reporting. Both optional: a review screen renders the same card
   * with nothing to act on, and an absent handler draws no control rather than
   * a dead one.
   */
  isSaved?: boolean
  onToggleSave?: () => void
  onReport?: () => void
}

export const ExamQuestionCard = memo(function ExamQuestionCard({
  presented,
  total,
  selectedIndex,
  feedbackTiming,
  isRevealed,
  showExplanations,
  onSelect,
  isSaved = false,
  onToggleSave,
  onReport,
}: ExamQuestionCardProps) {
  const { question } = presented
  const isGraded = feedbackTiming !== "at_end" && isRevealed
  const isCorrect = selectedIndex === question.answerIndex
  const correctChoice = presented.choices.find(
    (choice) => choice.index === question.answerIndex
  )

  return (
    <Card>
      <CardContent className="gap-4">
        <QuestionPrompt
          question={question}
          position={presented.position}
          total={total}
        />

        <ChoiceList
          presented={presented}
          selectedIndex={selectedIndex}
          isGraded={isGraded}
          onSelect={onSelect}
        />

        {isGraded ? (
          <ExplanationPanel
            isCorrect={isCorrect}
            correctAnswerLabel={correctChoice?.displayLabel}
            correctAnswerText={correctChoice?.text}
            explanation={question.explanation}
            showExplanation={showExplanations}
          />
        ) : (
          // Reserved space would be nice here, but the panel's height depends
          // on the explanation's length — so nothing is drawn instead of a
          // placeholder that jumps to a different size when it resolves.
          <View />
        )}

        {onToggleSave && onReport ? (
          <QuestionActions
            isSaved={isSaved}
            onToggleSave={onToggleSave}
            onReport={onReport}
          />
        ) : null}
      </CardContent>
    </Card>
  )
})
