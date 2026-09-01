import { memo, useCallback } from "react"
import Minus from "lucide-react-native/icons/minus"
import Plus from "lucide-react-native/icons/plus"
import { Pressable, View } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { IconButton } from "@/components/ui/icon-button"
import { Switch } from "@/components/ui/switch"
import { Text } from "@/components/ui/text"

/**
 * The row shapes every settings screen is built from.
 *
 * Three of them, and nothing else: a switch, a choice between named options,
 * and a number. Anything that does not fit one of these is a sign the setting
 * needs rethinking rather than a fourth row type.
 */

type SwitchRowProps = {
  label: string
  description?: string
  value: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}

export const SettingsSwitchRow = memo(function SettingsSwitchRow({
  label,
  description,
  value,
  disabled = false,
  onChange,
}: SwitchRowProps) {
  return (
    <View
      className="flex-row items-center justify-between gap-4 py-2"
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <View className="flex-1 gap-0.5">
        <Text variant="subheading" className="text-sm">
          {label}
        </Text>
        {description ? <Text variant="caption">{description}</Text> : null}
      </View>

      <Switch
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </View>
  )
})

export type SettingsOption<T extends string> = {
  value: T
  label: string
  description?: string
}

type OptionRowProps<T extends string> = {
  label: string
  description?: string
  options: readonly SettingsOption<T>[]
  value: T
  onChange: (value: T) => void
}

/**
 * A closed choice, rendered as chips.
 *
 * Chips rather than a dropdown because every one of these has three to five
 * options and the whole set fits on screen — a picker would hide the answer
 * behind a tap for no benefit.
 */
function OptionChip<T extends string>({
  option,
  isSelected,
  onPress,
}: {
  option: SettingsOption<T>
  isSelected: boolean
  onPress: (value: T) => void
}) {
  const theme = useThemePalette()
  const handlePress = useCallback(
    () => onPress(option.value),
    [onPress, option.value]
  )

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={option.label}
      className="min-h-[44px] flex-1 justify-center rounded-md border px-3 py-2 active:opacity-90"
      style={{
        borderColor: isSelected ? theme.primary : theme.border,
        borderWidth: isSelected ? 1.5 : 1,
        backgroundColor: isSelected
          ? withOpacity(theme.primary, 0.1)
          : theme.card,
      }}
    >
      <Text
        className="text-center text-xs font-bold"
        style={{ color: isSelected ? theme.primary : theme.mutedForeground }}
      >
        {option.label}
      </Text>
    </Pressable>
  )
}

export const SettingsOptionRow = memo(function SettingsOptionRow<
  T extends string,
>({ label, description, options, value, onChange }: OptionRowProps<T>) {
  const selected = options.find((option) => option.value === value)

  return (
    <View className="gap-2 py-2">
      <View className="gap-0.5">
        <Text variant="subheading" className="text-sm">
          {label}
        </Text>
        <Text variant="caption">
          {selected?.description ?? description ?? ""}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {options.map((option) => (
          <OptionChip
            key={option.value}
            option={option}
            isSelected={option.value === value}
            onPress={onChange}
          />
        ))}
      </View>
    </View>
  )
}) as <T extends string>(props: OptionRowProps<T>) => React.ReactElement

type StepperRowProps = {
  label: string
  description?: string
  value: number
  min: number
  max: number
  step?: number
  /** Rendered instead of the raw number — "Whole paper" for 0, say. */
  formatValue?: (value: number) => string
  onChange: (value: number) => void
}

/**
 * A number, changed by tapping rather than typing.
 *
 * These are set once and rarely revisited, and every one of them has a small
 * sensible range — a keyboard for "20" is more friction than it is worth, and
 * a slider cannot land on an exact value.
 */
export const SettingsStepperRow = memo(function SettingsStepperRow({
  label,
  description,
  value,
  min,
  max,
  step = 5,
  formatValue,
  onChange,
}: StepperRowProps) {
  const theme = useThemePalette()

  const decrement = useCallback(
    () => onChange(Math.max(value - step, min)),
    [min, onChange, step, value]
  )
  const increment = useCallback(
    () => onChange(Math.min(value + step, max)),
    [max, onChange, step, value]
  )

  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <View className="flex-1 gap-0.5">
        <Text variant="subheading" className="text-sm">
          {label}
        </Text>
        {description ? <Text variant="caption">{description}</Text> : null}
      </View>

      <View className="flex-row items-center gap-1">
        <IconButton
          label={`Decrease ${label}`}
          size="sm"
          disabled={value <= min}
          onPress={decrement}
        >
          <Minus size={16} color={theme.foreground} strokeWidth={2.4} />
        </IconButton>

        <Text className="min-w-[64px] text-center text-sm font-extrabold text-card-foreground">
          {formatValue ? formatValue(value) : value}
        </Text>

        <IconButton
          label={`Increase ${label}`}
          size="sm"
          disabled={value >= max}
          onPress={increment}
        >
          <Plus size={16} color={theme.foreground} strokeWidth={2.4} />
        </IconButton>
      </View>
    </View>
  )
})
