import { Check, X } from "lucide-react-native"
import { Pressable, View, type PressableProps } from "react-native"

import { withOpacity, type ThemePalette } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

import { toChoiceLabel } from "@/lib/schema"

/**
 * The label is passed in, not looked up.
 *
 * This used to index a fixed `["A"..."H"]` array, which quietly rendered an
 * empty badge on the ninth option. `toChoiceLabel` runs A…Z then AA, AB,
 * without a ceiling — the same alphabet the schema uses for set codes — and
 * the caller passes the label it already computed, because under a shuffle the
 * row's letter and the choice's stored letter are deliberately different.
 */

/**
 * What this option is, at this moment, for this learner.
 *
 * Modelled as one closed state rather than the old
 * `isSelected`/`isCorrect`/`isWrong` booleans. Those three could describe
 * combinations that make no sense — and did: a wrong answer arrived as
 * `isSelected && isWrong`, and the render only checked `isSelected || isCorrect`
 * before drawing a tick, so choosing wrongly put a checkmark on the wrong
 * answer. A single state cannot express that.
 *
 *   idle      untouched, still answerable
 *   selected  chosen, not yet graded
 *   correct   graded: the right answer, and the learner picked it
 *   incorrect graded: the learner picked it, and it is wrong
 *   missed    graded: the right answer, which the learner did not pick
 */
export type AnswerOptionState =
  | "idle"
  | "selected"
  | "correct"
  | "incorrect"
  | "missed"

type AnswerOptionColors = {
  baseBorder: string
  baseBackground: string
  baseText: string
  mutedText: string
  selectedBorder: string
  correctBorder: string
  wrongBorder: string
}

function getDefaultColors(theme: ThemePalette): AnswerOptionColors {
  return {
    baseBorder: theme.border,
    baseBackground: theme.card,
    baseText: theme.cardForeground,
    mutedText: theme.mutedForeground,
    selectedBorder: theme.primary,
    correctBorder: theme.success,
    wrongBorder: theme.destructive,
  }
}

/**
 * Accent per state. `missed` shares the correct hue — it *is* the right
 * answer — and is told apart by its caption and lighter fill instead.
 */
function getAccentColor(state: AnswerOptionState, palette: AnswerOptionColors) {
  switch (state) {
    case "correct":
    case "missed":
      return palette.correctBorder
    case "incorrect":
      return palette.wrongBorder
    case "selected":
      return palette.selectedBorder
    case "idle":
    default:
      return palette.baseBorder
  }
}

/**
 * The caption under the text for graded states.
 *
 * This is what keeps the component readable without colour. Green-vs-red is
 * the only thing separating right from wrong otherwise, which fails for the
 * ~8% of men with a red-green deficiency and disappears entirely in a
 * screenshot printed in greyscale.
 */
const STATE_CAPTION: Partial<Record<AnswerOptionState, string>> = {
  correct: "Your answer · Correct",
  incorrect: "Your answer · Incorrect",
  missed: "Correct answer",
}

interface AnswerOptionProps extends Omit<PressableProps, "onPress"> {
  state: AnswerOptionState
  /** Position on screen. Only used when no explicit `label` is given. */
  index?: number
  /** The letter to draw — pass `PresentedChoice.displayLabel`. */
  label?: string
  showPrefix?: boolean
  colors?: Partial<AnswerOptionColors>
  /** Locks the option once the question has been graded. */
  disabled?: boolean
  onPress: () => void
  children: string
}

export function AnswerOption({
  state,
  index,
  label,
  showPrefix = true,
  colors,
  disabled = false,
  onPress,
  children,
  className,
  ...props
}: AnswerOptionProps) {
  const theme = useThemePalette()
  const palette = { ...getDefaultColors(theme), ...colors }

  const isGraded =
    state === "correct" || state === "incorrect" || state === "missed"
  const isEmphasised = isGraded || state === "selected"
  const accentColor = getAccentColor(state, palette)
  const caption = STATE_CAPTION[state]
  const letter = !showPrefix
    ? ""
    : (label ?? (typeof index === "number" ? toChoiceLabel(index) : ""))

  // `missed` stays quieter than `correct`: the learner did not choose it, so
  // it is information rather than a result, and shouting it competes with the
  // verdict on their own answer.
  const backgroundColor =
    state === "idle"
      ? palette.baseBackground
      : withOpacity(accentColor, state === "missed" ? 0.07 : 0.12)

  // Filled badge for a chosen or resolved option; outlined while idle.
  const badgeBackground = isEmphasised
    ? state === "missed"
      ? withOpacity(accentColor, 0.18)
      : accentColor
    : withOpacity(theme.muted, 0.9)
  const badgeText = isEmphasised
    ? state === "missed"
      ? accentColor
      : state === "correct"
        ? theme.successForeground
        : state === "incorrect"
          ? theme.destructiveForeground
          : theme.primaryForeground
    : palette.mutedText

  const accessibilityLabel = [
    letter ? `Option ${letter}` : null,
    children,
    caption,
  ]
    .filter(Boolean)
    .join(". ")

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{
        checked: state === "selected" || state === "correct" || state === "incorrect",
        disabled,
      }}
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "rounded-md border px-4 py-3.5",
        !disabled && "active:opacity-90",
        className
      )}
      style={{
        borderColor: accentColor,
        backgroundColor,
        borderWidth: isEmphasised ? 1.5 : 1,
      }}
      {...props}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-8 w-8 items-center justify-center rounded-sm"
          style={{ backgroundColor: badgeBackground }}
        >
          <Text className="text-xs font-black" style={{ color: badgeText }}>
            {letter}
          </Text>
        </View>

        <View className="flex-1 gap-0.5">
          {/* 16px, not 14px: these are exam stems read under time pressure,
              and the option text is the content, not a label for it. */}
          <Text
            className="text-base leading-6"
            style={{ color: palette.baseText }}
          >
            {children}
          </Text>

          {caption ? (
            <Text
              className="text-2xs font-bold uppercase tracking-[0.8px]"
              style={{ color: accentColor }}
            >
              {caption}
            </Text>
          ) : null}
        </View>

        {/* A tick appears only on a genuinely correct option — never on the
            learner's wrong pick, which is what the old version did. */}
        {state === "correct" || state === "missed" ? (
          <Check size={19} color={accentColor} strokeWidth={3} />
        ) : state === "incorrect" ? (
          <X size={19} color={accentColor} strokeWidth={3} />
        ) : null}
      </View>
    </Pressable>
  )
}

/**
 * Resolves the state of one option from the question's answer key.
 *
 * Kept next to the component so every screen that grades a question — the
 * runner and the results review — derives states the same way, instead of
 * each re-implementing the "is this the right one, did they pick it" logic.
 */
export function getAnswerOptionState({
  choiceIndex,
  answerIndex,
  selectedIndex,
  isGraded,
}: {
  choiceIndex: number
  answerIndex: number
  selectedIndex: number | undefined
  isGraded: boolean
}): AnswerOptionState {
  const isSelected = selectedIndex === choiceIndex

  if (!isGraded) {
    return isSelected ? "selected" : "idle"
  }

  if (choiceIndex === answerIndex) {
    return isSelected ? "correct" : "missed"
  }

  return isSelected ? "incorrect" : "idle"
}
