import { memo } from "react"
import { Image } from "expo-image"
import { View } from "react-native"

import type { ExamQuestion } from "@/lib/content/questions"
import { Badge } from "@/components/ui/badge"
import { Text } from "@/components/ui/text"

/**
 * The stem: number, difficulty, prompt, and the illustration when there is one.
 *
 * `imageUrl` has already been resolved to an absolute URL by
 * `lib/content/questions.ts` — a CMS upload stores a path and a pasted link
 * stores a full URL, and an `<Image>` handed the former renders nothing and
 * says nothing about it (gotcha 8).
 */

const DIFFICULTY_TONE = {
  easy: "success",
  medium: "primary",
  hard: "destructive",
} as const

type QuestionPromptProps = {
  question: ExamQuestion
  /** Position in this run, 1-based — not the stored `order`. */
  position: number
  total: number
  showDifficulty?: boolean
}

export const QuestionPrompt = memo(function QuestionPrompt({
  question,
  position,
  total,
  showDifficulty = true,
}: QuestionPromptProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <Text variant="eyebrow">
          Question {position} of {total}
        </Text>

        {showDifficulty ? (
          <Badge tone={DIFFICULTY_TONE[question.difficulty]} size="sm">
            {question.difficulty}
          </Badge>
        ) : null}

        {question.isFree ? (
          <Badge tone="success" size="sm">
            Free sample
          </Badge>
        ) : null}
      </View>

      {/* 17px on a 24px line: this is the thing being read under time
          pressure, so it outranks every label around it. */}
      <Text className="text-[17px] font-semibold leading-6 text-foreground">
        {question.prompt}
      </Text>

      {question.imageUrl ? (
        <Image
          source={{ uri: question.imageUrl }}
          style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 12 }}
          contentFit="contain"
          transition={150}
          accessibilityLabel="Illustration for this question"
        />
      ) : null}
    </View>
  )
})
