import type { QuickAccessTone, ThemePalette } from "@/lib/home-types"
import { withOpacity } from "@/lib/theme"

export function getQuickAccessCardPresentation(
  theme: ThemePalette,
  tone: QuickAccessTone
) {
  const accent =
    tone === "support"
      ? theme.chart2
      : tone === "accent"
        ? theme.accent
        : theme.primary

  return {
    accent,
    borderColor: theme.border,
    iconBg: withOpacity(accent, 0.14),
    eyebrowBg: withOpacity(accent, 0.12),
    footerBg: withOpacity(accent, 0.08),
    actionBg: withOpacity(accent, 0.12),
    actionLabel: accent,
  }
}
