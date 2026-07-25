import { Check } from "lucide-react-native"
import { Pressable, View, type PressableProps } from "react-native"

import { withOpacity, type ThemePalette } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"]

type AnswerOptionColors = {
  baseBorder: string
  baseBackground: string
  baseText: string
  mutedText: string
  selectedBorder: string
  selectedBackground: string
  correctBorder: string
  correctBackground: string
  wrongBorder: string
  wrongBackground: string
  ringBorder: string
  checkIcon: string
}

/**
 * Default palette derives from the active theme so the option adapts to
 * light/dark mode: selected → primary, correct → success, wrong → destructive.
 * Screens with a custom surface (e.g. the immersive quiz runner) can still
 * override any subset via the `colors` prop.
 */
function getDefaultColors(theme: ThemePalette): AnswerOptionColors {
  return {
    baseBorder: theme.border,
    baseBackground: theme.card,
    baseText: theme.cardForeground,
    mutedText: theme.mutedForeground,
    selectedBorder: theme.primary,
    selectedBackground: withOpacity(theme.primary, 0.12),
    correctBorder: theme.success,
    correctBackground: withOpacity(theme.success, 0.12),
    wrongBorder: theme.destructive,
    wrongBackground: withOpacity(theme.destructive, 0.12),
    ringBorder: theme.border,
    checkIcon: theme.successForeground,
  }
}

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
  const theme = useThemePalette()
  const palette = { ...getDefaultColors(theme), ...colors }
  const isHighlighted = Boolean(isWrong || isCorrect || isSelected)
  const letter =
    showPrefix && typeof index === "number" ? (CHOICE_LETTERS[index] ?? "") : ""

  const accentColor = isWrong
    ? palette.wrongBorder
    : isCorrect
      ? palette.correctBorder
      : isSelected
        ? palette.selectedBorder
        : palette.baseBorder

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
      role="radio"
      aria-checked={isSelected}
      className={cn("rounded-[14px] border px-4 py-4", className)}
      style={{
        borderColor: accentColor,
        backgroundColor,
        borderWidth: isHighlighted ? 1.5 : 1,
      }}
      {...props}
    >
      <View className="flex-row items-center gap-3.5">
        {isHighlighted ? (
          <View
            className="absolute bottom-0 left-0 top-0 w-1 rounded-l-[14px]"
            style={{ backgroundColor: accentColor }}
          />
        ) : null}
        <View
          className="h-5 w-5 items-center justify-center rounded-full border"
          style={{
            borderColor: isHighlighted ? accentColor : palette.ringBorder,
          }}
        >
          {isHighlighted ? (
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          ) : null}
        </View>
        {letter ? (
          <View
            className="mt-0.5 h-7 w-7 items-center justify-center rounded-xl"
            style={{
              backgroundColor: isHighlighted
                ? accentColor
                : withOpacity(theme.muted, 0.9),
            }}
          >
            <Text
              className="text-xs font-black"
              style={{
                color: isHighlighted ? palette.checkIcon : palette.mutedText,
              }}
            >
              {letter}
            </Text>
          </View>
        ) : null}
        <Text
          className="flex-1 text-[14px] font-medium leading-5"
          style={{ color: palette.baseText }}
        >
          {children}
        </Text>
        {isSelected || isCorrect ? (
          <View
            className="h-6 w-6 items-center justify-center rounded-full"
            style={{
              backgroundColor: isCorrect
                ? palette.correctBorder
                : palette.selectedBorder,
            }}
          >
            <Check size={14} color={palette.checkIcon} strokeWidth={3} />
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}
