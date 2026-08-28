import { memo } from "react"
import { ChevronRight } from "lucide-react-native"
import { Pressable } from "react-native"

import type { ThemePalette } from "@/lib/theme"
import { Text } from "@/components/ui/text"

type SectionLinkProps = {
  theme: ThemePalette
  /** Visible text, e.g. "See all" or "View Details". */
  label: string
  /** Fuller description for screen readers — "See all subjects". */
  accessibilityLabel?: string
  onPress: () => void
}

/**
 * The trailing "See all ›" affordance on every section header, on Home and
 * Profile alike.
 *
 * One component so the two screens cannot drift in size, weight or chevron gap
 * — which is exactly what happened the last time each section styled its own.
 * `hitSlop` reaches 44pt without padding the text out and pushing the section
 * title off its baseline.
 */
export const SectionLink = memo(function SectionLink({
  theme,
  label,
  accessibilityLabel,
  onPress,
}: SectionLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={10}
      className="flex-row items-center gap-0.5 active:opacity-70"
      onPress={onPress}
    >
      <Text className="text-xs font-semibold text-primary">{label}</Text>
      <ChevronRight size={14} color={theme.primary} strokeWidth={2.6} />
    </Pressable>
  )
})
