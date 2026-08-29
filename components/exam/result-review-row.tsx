import { memo } from "react"
import { View } from "react-native"

import type { PresentedQuestion } from "@/lib/session/question-pool"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { ChoiceList } from "./choice-list"
import { ExplanationPanel } from "./explanation-panel"

/**
 * One question as it appears in the post-sitting review.
 *
 * Everything is graded and locked here — including under `at_end`, where this
 * screen is the *only* place the answers are ever shown.
 */

type ResultReviewRowProps = {
  presented: PresentedQuestion
  selectedIndex: number | undefined
  showExplanations: boolean
}

const noop = () => {}

export const ResultReviewRow = memo(function ResultReviewRow({
  presented,
  selectedIndex,
  showExplanations,
}: ResultReviewRowProps) {
  const { question } = presented
  const isCorrect = selectedIndex === question.answerIndex
  const isUnanswered = selectedIndex === undefined
  const correctChoice = presented.choices.find(
    (choice) => choice.index === question.answerIndex
  )

  return (
    <Card>
      <CardContent className="gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="label">Question {presented.position}</Text>
          <Text variant="label">
            {isUnanswered ? "Skipped" : isCorrect ? "Correct" : "Incorrect"}
          </Text>
        </View>

        <Text className="text-[15px] font-semibold leading-[22px] text-card-foreground">
          {question.prompt}
        </Text>

        <ChoiceList
          presented={presented}
          selectedIndex={selectedIndex}
          isGraded
          disabled
          onSelect={noop}
        />

        {!isCorrect ? (
          <ExplanationPanel
            isCorrect={false}
            correctAnswerLabel={correctChoice?.displayLabel}
            correctAnswerText={correctChoice?.text}
            explanation={question.explanation}
            showExplanation={showExplanations}
          />
        ) : showExplanations && question.explanation ? (
          <ExplanationPanel
            isCorrect
            explanation={question.explanation}
            showExplanation
          />
        ) : null}
      </CardContent>
    </Card>
  )
})
