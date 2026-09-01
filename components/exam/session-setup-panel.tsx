import { memo, useMemo, useState } from "react"
import Play from "lucide-react-native/icons/play"
import { View } from "react-native"

import type { ExamCategory } from "@/lib/content/exam-categories"
import type { QuestionSet } from "@/lib/content/question-sets"
import type {
  FeedbackTiming,
  MemberSettings,
  QuestionSource,
} from "@/lib/member/settings"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { PaywallNotice } from "./paywall-notice"
import {
  buildLengthOptions,
  describeSession,
  FeedbackTimingPicker,
  QuestionSourcePicker,
  SessionLengthPicker,
  type SessionLengthOption,
} from "./session-setup"

/**
 * Everything between "I picked a paper" and "start".
 *
 * Seeded from the member's stored settings, so the default is always one tap
 * away — the pickers are overrides for this sitting, not a second settings
 * screen. What they choose here is passed to the runner rather than saved,
 * because "I want a short one today" is not a preference change.
 */

export type SessionSetupChoice = {
  questionCount: number
  minutes: number
  feedbackTiming: FeedbackTiming
  questionSource: QuestionSource
}

type SessionSetupPanelProps = {
  category: ExamCategory
  set: QuestionSet | null
  /** Items this viewer can actually open. */
  availableCount: number
  /** Items withheld behind the paywall. */
  hiddenCount: number
  settings: MemberSettings
  sourceAvailability?: Partial<Record<QuestionSource, number>>
  resumeLabel?: string | null
  onStart: (choice: SessionSetupChoice) => void
  onUpgrade: () => void
}

export const SessionSetupPanel = memo(function SessionSetupPanel({
  category,
  set,
  availableCount,
  hiddenCount,
  settings,
  sourceAvailability,
  resumeLabel,
  onStart,
  onUpgrade,
}: SessionSetupPanelProps) {
  const lengthOptions = useMemo(
    () => buildLengthOptions(availableCount),
    [availableCount]
  )

  const [lengthId, setLengthId] = useState(
    () => lengthOptions[0]?.id ?? "full"
  )
  const [feedbackTiming, setFeedbackTiming] = useState<FeedbackTiming>(
    settings.feedbackTiming
  )
  const [questionSource, setQuestionSource] = useState<QuestionSource>(
    settings.questionSource
  )

  const selectedLength: SessionLengthOption =
    lengthOptions.find((option) => option.id === lengthId) ??
    lengthOptions[lengthOptions.length - 1]

  const summary = describeSession(
    { feedbackTiming, shuffleQuestions: settings.shuffleQuestions },
    selectedLength?.questionCount ?? availableCount,
    selectedLength?.minutes ?? 0
  )

  const isEmpty = availableCount === 0

  return (
    <View className="gap-4">
      <Card>
        <CardContent className="gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="heading">{set ? set.title : category.title}</Text>
            {set?.setCode ? (
              <Badge tone="primary" size="sm">
                Set {set.setCode}
              </Badge>
            ) : null}
            {resumeLabel ? (
              <Badge tone="warning" size="sm">
                {resumeLabel}
              </Badge>
            ) : null}
          </View>

          <Text variant="caption">
            {set?.description || category.description || "Board exam review."}
          </Text>

          <Text variant="label">
            {availableCount} {availableCount === 1 ? "item" : "items"} available
          </Text>
        </CardContent>
      </Card>

      {hiddenCount > 0 ? (
        <PaywallNotice
          hiddenCount={hiddenCount}
          contextLabel={set ? set.title : category.title}
          onUpgrade={onUpgrade}
        />
      ) : null}

      {isEmpty ? null : (
        <>
          <SessionLengthPicker
            options={lengthOptions}
            selectedId={selectedLength?.id ?? lengthId}
            onSelect={(option) => setLengthId(option.id)}
          />

          <FeedbackTimingPicker
            value={feedbackTiming}
            onChange={setFeedbackTiming}
          />

          <QuestionSourcePicker
            value={questionSource}
            onChange={setQuestionSource}
            availability={sourceAvailability}
          />

          <View className="gap-2 pt-1">
            <Text variant="caption" className="text-center">
              {summary}
            </Text>

            {/* Full width, at the bottom of the scroll: the primary action of
                this screen belongs in the thumb zone. */}
            <Button
              size="xl"
              onPress={() =>
                onStart({
                  questionCount: selectedLength?.questionCount ?? availableCount,
                  minutes: selectedLength?.minutes ?? 0,
                  feedbackTiming,
                  questionSource,
                })
              }
            >
              <Play size={16} color="white" fill="white" />
              <Text>{resumeLabel ? "Continue" : "Start"}</Text>
            </Button>
          </View>
        </>
      )}
    </View>
  )
})
