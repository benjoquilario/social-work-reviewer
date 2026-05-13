import { Pressable, View, type PressableProps } from "react-native"
import { Check } from "lucide-react-native"

import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"]
const QUIZ_OPTION_COLORS = {
  baseBorder: "rgba(255,255,255,0.08)",
  baseBackground: "#111827",
  baseText: "rgba(255,255,255,0.92)",
  mutedText: "rgba(255,255,255,0.72)",
  selectedBorder: "#7c3aed",
  selectedBackground: "rgba(124,58,237,0.24)",
  correctBorder: "#22c55e",
  correctBackground: "rgba(34,197,94,0.22)",
  wrongBorder: "#ef4444",
  wrongBackground: "rgba(239,68,68,0.22)",
  ringBorder: "rgba(255,255,255,0.35)",
}

type AnswerOptionColors = typeof QUIZ_OPTION_COLORS

interface AnswerOptionProps extends Omit<PressableProps, "onPress"> {
  isSelected: boolean
  isCorrect?: boolean
  isWrong?: boolean
  index?: number
  showPrefix?: boolean
  colors?: Partial<AnswerOptionColors>
  onPress: () => void
  children: string
}

export function AnswerOption({
  isSelected,
  isCorrect,
  isWrong,
  index,
  showPrefix = true,
  colors,
  onPress,
  children,
  className,
  ...props
}: AnswerOptionProps) {
  const palette = { ...QUIZ_OPTION_COLORS, ...colors }
  const isHighlighted = Boolean(isWrong || isCorrect || isSelected)
  const letter =
    showPrefix && typeof index === "number" ? (CHOICE_LETTERS[index] ?? "") : ""

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

  const borderColor = isWrong
    ? palette.wrongBorder
    : isCorrect
      ? palette.correctBorder
      : isSelected
        ? palette.selectedBorder
        : "transparent"

  const backgroundColor = isWrong
    ? palette.wrongBackground
    : isCorrect
      ? palette.correctBackground
      : isSelected
        ? palette.selectedBackground
        : palette.baseBackground

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "rounded-[14px] border px-4 py-4",
        className
      )}
      style={{
        borderColor,
        backgroundColor,
        borderWidth: isHighlighted ? 1.5 : 0,
      }}
      {...props}
    >
      <View className="flex-row items-center gap-3.5">
        {isHighlighted ? (
          <View
            className="absolute bottom-0 left-0 top-0 w-1 rounded-l-[14px]"
            style={{ backgroundColor: borderColor }}
          />
        ) : null}
        <View
          className="h-5 w-5 items-center justify-center rounded-full border"
          style={{
            borderColor: isHighlighted
              ? borderColor
              : palette.ringBorder,
          }}
        >
          {isHighlighted ? (
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: borderColor }}
            />
          ) : null}
        </View>
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
              ? "font-medium"
              : "font-medium",
          )}
          style={{
            color: isWrong || isCorrect || isSelected
              ? palette.baseText
              : palette.baseText,
          }}
        >
          {children}
        </Text>
        {isSelected || isCorrect ? (
          <View
            className="h-6 w-6 items-center justify-center rounded-full"
            style={{
              backgroundColor: isCorrect ? palette.correctBorder : palette.selectedBorder,
            }}
          >
            <Check size={14} color="#ffffff" strokeWidth={3} />
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}
