import { Pressable, View, type PressableProps } from "react-native"

import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"]

interface AnswerOptionProps extends Omit<PressableProps, "onPress"> {
  isSelected: boolean
  isCorrect?: boolean
  isWrong?: boolean
  index?: number
  onPress: () => void
  children: string
}

export function AnswerOption({
  isSelected,
  isCorrect,
  isWrong,
  index,
  onPress,
  children,
  className,
  ...props
}: AnswerOptionProps) {
  const letter = typeof index === "number" ? (CHOICE_LETTERS[index] ?? "") : ""

  const stateClass = isWrong
    ? "border-destructive bg-destructive/10"
    : isCorrect || isSelected
      ? "border-primary bg-primary/10"
      : "border-border bg-card"

  const letterBg = isWrong
    ? "bg-destructive"
    : isCorrect || isSelected
      ? "bg-primary"
      : "bg-muted"

  const letterText =
    isWrong || isCorrect || isSelected ? "text-white" : "text-muted-foreground"

  const textClass = isWrong
    ? "text-destructive"
    : isCorrect || isSelected
      ? "text-foreground"
      : "text-card-foreground"

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "rounded-2xl border-2 px-3.5 py-3.5",
        stateClass,
        className
      )}
      {...props}
    >
      <View className="flex-row items-start gap-3">
        {letter ? (
          <View
            className={cn(
              "mt-0.5 h-7 w-7 items-center justify-center rounded-xl",
              letterBg
            )}
          >
            <Text className={cn("text-xs font-black", letterText)}>
              {letter}
            </Text>
          </View>
        ) : null}
        <Text
          className={cn(
            "flex-1 text-[14px] leading-5",
            isCorrect || isSelected || isWrong
              ? "font-semibold"
              : "font-medium",
            textClass
          )}
        >
          {children}
        </Text>
      </View>
    </Pressable>
  )
}
