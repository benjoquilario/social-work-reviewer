import { memo } from "react"
import { View } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

/**
 * The end of a sitting.
 *
 * This is the moment the member remembers — the peak of the whole flow — so it
 * leads with the number, names it in words, and then gets out of the way. The
 * three tiles below are the "what now" the score alone cannot answer.
 */

/** The board's own bar. Shown as a line, not a pass/fail verdict. */
export const PASSING_SCORE = 75

type ResultSummaryProps = {
  correctCount: number
  questionCount: number
  answeredCount: number
  durationSeconds: number
  label: string
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(Math.max(totalSeconds, 0) / 60)
  const seconds = Math.max(totalSeconds, 0) % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`
}

function getVerdict(percent: number) {
  if (percent >= 90) {
    return { title: "Outstanding", tone: "success" as const }
  }

  if (percent >= PASSING_SCORE) {
    return { title: "Above the line", tone: "success" as const }
  }

  if (percent >= 60) {
    return { title: "Close", tone: "warning" as const }
  }

  return { title: "Keep drilling", tone: "destructive" as const }
}

const MetricTile = memo(function MetricTile({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View className="flex-1 items-center gap-0.5 py-1">
      <Text className="text-lg font-extrabold text-card-foreground">
        {value}
      </Text>
      <Text variant="label">{label}</Text>
    </View>
  )
})

export const ResultSummary = memo(function ResultSummary({
  correctCount,
  questionCount,
  answeredCount,
  durationSeconds,
  label,
}: ResultSummaryProps) {
  const theme = useThemePalette()
  const percent = Math.round((correctCount / Math.max(questionCount, 1)) * 100)
  const verdict = getVerdict(percent)

  const accent =
    verdict.tone === "success"
      ? theme.success
      : verdict.tone === "warning"
        ? theme.accentText
        : theme.destructive

  return (
    <Card>
      <CardContent className="gap-4">
        <View className="items-center gap-1">
          <Text variant="label">{label}</Text>

          <Text
            className="text-5xl font-extrabold leading-[56px]"
            style={{ color: accent }}
          >
            {percent}%
          </Text>

          {/* The word matters as much as the number: a percentage alone does
              not say whether it was good. */}
          <Text className="text-sm font-bold" style={{ color: accent }}>
            {verdict.title}
          </Text>

          <Text variant="caption">
            {correctCount} of {questionCount} correct
            {percent >= PASSING_SCORE
              ? ` · ${PASSING_SCORE}% is the board's line`
              : ` · ${PASSING_SCORE}% is the board's line`}
          </Text>
        </View>

        <View
          className="flex-row rounded-lg py-2"
          style={{ backgroundColor: withOpacity(theme.muted, 0.7) }}
        >
          <MetricTile label="Answered" value={`${answeredCount}`} />
          <View
            className="w-px self-stretch"
            style={{ backgroundColor: theme.border }}
          />
          <MetricTile
            label="Missed"
            value={`${Math.max(answeredCount - correctCount, 0)}`}
          />
          <View
            className="w-px self-stretch"
            style={{ backgroundColor: theme.border }}
          />
          <MetricTile label="Time" value={formatDuration(durationSeconds)} />
        </View>
      </CardContent>
    </Card>
  )
})
