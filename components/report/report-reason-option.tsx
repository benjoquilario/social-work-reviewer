import { memo } from "react"
import { Check } from "lucide-react-native"
import { Pressable } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

/**
 * One selectable reason.
 *
 * A radio in everything but name, so it carries `accessibilityRole="radio"`
 * and a selected state — a screen reader announcing "button" here would give
 * no hint that picking one deselects the others.
 */

type ReportReasonOptionProps = {
  label: string
  isSelected: boolean
  onSelect: () => void
}

export const ReportReasonOption = memo(function ReportReasonOption({
  label,
  isSelected,
  onSelect,
}: ReportReasonOptionProps) {
  const theme = useThemePalette()

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      className="min-h-[44px] flex-row items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 active:opacity-90"
      style={{
        borderColor: isSelected ? theme.primary : theme.border,
        // Thickened rather than recoloured alone: on a small screen in daylight
        // a 1px border shift in hue is not a state change anybody can see.
        borderWidth: isSelected ? 1.5 : 1,
        backgroundColor: isSelected
          ? withOpacity(theme.primary, 0.08)
          : theme.card,
      }}
    >
      <Text variant="callout" className="flex-1">
        {label}
      </Text>
      {isSelected ? (
        <Check size={16} color={theme.primary} strokeWidth={3} />
      ) : null}
    </Pressable>
  )
})
