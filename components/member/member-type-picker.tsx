import { memo, useCallback } from "react"
import { Pressable, View } from "react-native"

import {
  memberTypeLabels,
  memberTypeOrder,
  type MemberType,
} from "@/lib/schema"
import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

/**
 * Who the member is.
 *
 * Asked once at sign-up and changeable afterwards, because people graduate — a
 * student in March is a graduate in June. **Skipping is a normal answer**, so
 * there is an explicit "Rather not say" chip rather than a required field.
 *
 * It grants nothing and gates nothing. `memberType: "professional"` looks like
 * it should unlock something; it does not. Premium is the only thing that
 * opens a screen (section 14).
 */

type MemberTypePickerProps = {
  value: MemberType | null
  onChange: (value: MemberType | null) => void
  label?: string
  helper?: string
}

type ChipProps = {
  label: string
  isSelected: boolean
  onPress: () => void
}

const Chip = memo(function Chip({ label, isSelected, onPress }: ChipProps) {
  const theme = useThemePalette()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      // 44pt minimum: these are small chips and a 32pt row is a miss for
      // anyone with larger fingers or a moving bus.
      className="min-h-[44px] justify-center rounded-full border px-3.5 py-2 active:opacity-90"
      style={{
        borderColor: isSelected ? theme.primary : theme.border,
        borderWidth: isSelected ? 1.5 : 1,
        backgroundColor: isSelected
          ? withOpacity(theme.primary, 0.1)
          : theme.card,
      }}
    >
      <Text
        className="text-xs font-semibold"
        style={{
          color: isSelected ? theme.primary : theme.mutedForeground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
})

export const MemberTypePicker = memo(function MemberTypePicker({
  value,
  onChange,
  label = "Where are you in your journey?",
  helper = "Optional. It shapes the tips you get — nothing more.",
}: MemberTypePickerProps) {
  const handleSelect = useCallback(
    (next: MemberType) => () => onChange(next === value ? null : next),
    [onChange, value]
  )

  const handleClear = useCallback(() => onChange(null), [onChange])

  return (
    <View className="gap-2.5">
      <View className="gap-0.5">
        <Text variant="label">{label}</Text>
        <Text variant="caption">{helper}</Text>
      </View>

      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {memberTypeOrder.map((memberType) => (
          <Chip
            key={memberType}
            label={memberTypeLabels[memberType]}
            isSelected={memberType === value}
            onPress={handleSelect(memberType)}
          />
        ))}

        <Chip
          label="Rather not say"
          isSelected={value === null}
          onPress={handleClear}
        />
      </View>
    </View>
  )
})
