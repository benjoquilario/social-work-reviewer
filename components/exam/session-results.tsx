import { memo, useMemo, useState } from "react"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type { PresentedQuestion } from "@/lib/session/question-pool"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { SampleFinishedUpsell } from "./locked-paper"
import { ResultReviewRow } from "./result-review-row"
import { ResultSummary } from "./result-summary"

/**
 * What a member sees after submitting.
 *
 * Under `feedbackTiming: "at_end"` this is the **only** place any answer is
 * ever revealed, so the review list is not an optional extra — it is the whole
 * feedback loop for a mock exam.
 *
 * The list defaults to mistakes. Somebody who scored 84% wants the sixteen they
 * missed, not to scroll a hundred rows to find them.
 */

type SessionResultsProps = {
  label: string
  pool: PresentedQuestion[]
  answers: ReadonlyMap<number, number>
  correctCount: number
  answeredCount: number
  durationSeconds: number
  showExplanations: boolean
  /** Items this member could not open. Drives the upsell below the score. */
  hiddenCount?: number
  onDone: () => void
  onRetry?: () => void
  onUpgrade?: () => void
}

type ReviewFilter = "mistakes" | "all"

/**
 * The screen claims only the top and side edges so the list can scroll
 * through the full height, which leaves the bottom inset for the list's own
 * content padding. Without it the final row sits under the gesture pill.
 */
const LIST_BOTTOM_GAP = 32

export const SessionResults = memo(function SessionResults({
  label,
  pool,
  answers,
  correctCount,
  answeredCount,
  durationSeconds,
  showExplanations,
  hiddenCount = 0,
  onDone,
  onRetry,
  onUpgrade,
}: SessionResultsProps) {
  const mistakes = useMemo(
    () =>
      pool.filter(
        (presented, index) =>
          answers.get(index) !== presented.question.answerIndex
      ),
    [answers, pool]
  )

  const insets = useSafeAreaInsets()
  const listContentStyle = useMemo(
    () => ({
      paddingHorizontal: 16,
      paddingBottom: insets.bottom + LIST_BOTTOM_GAP,
    }),
    [insets.bottom]
  )

  const [filter, setFilter] = useState<ReviewFilter>(
    mistakes.length > 0 ? "mistakes" : "all"
  )

  const visible = filter === "mistakes" ? mistakes : pool

  const renderRow = ({ item }: ListRenderItemInfo<PresentedQuestion>) => {
    const index = pool.indexOf(item)

    return (
      <ResultReviewRow
        presented={item}
        selectedIndex={answers.get(index)}
        showExplanations={showExplanations}
      />
    )
  }

  return (
    <FlashList
      data={visible}
      keyExtractor={(item) => item.question.id}
      renderItem={renderRow}
      contentContainerStyle={listContentStyle}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        <View className="gap-4 py-4">
          <ResultSummary
            label={label}
            correctCount={correctCount}
            questionCount={pool.length}
            answeredCount={answeredCount}
            durationSeconds={durationSeconds}
          />

          {onUpgrade ? (
            <SampleFinishedUpsell
              hiddenCount={hiddenCount}
              onUpgrade={onUpgrade}
            />
          ) : null}

          <View className="flex-row gap-2">
            <Button size="lg" className="flex-1" onPress={onDone}>
              <Text>Done</Text>
            </Button>
            {onRetry ? (
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onPress={onRetry}
              >
                <Text>Try again</Text>
              </Button>
            ) : null}
          </View>

          <View className="flex-row items-center justify-between gap-2">
            <Text variant="label">Review</Text>

            <View className="flex-row gap-2">
              <Button
                size="sm"
                variant={filter === "mistakes" ? "default" : "outline"}
                onPress={() => setFilter("mistakes")}
              >
                <Text>Mistakes ({mistakes.length})</Text>
              </Button>
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onPress={() => setFilter("all")}
              >
                <Text>All ({pool.length})</Text>
              </Button>
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View className="items-center py-6">
          <Text variant="callout">
            Nothing missed. Every item in this run was correct.
          </Text>
        </View>
      }
    />
  )
})

function Separator() {
  return <View className="h-3" />
}
