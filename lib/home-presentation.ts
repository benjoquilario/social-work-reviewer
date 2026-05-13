import { ArrowRight, FolderOpen, LockKeyhole } from "lucide-react-native"
import { withOpacity } from "@/lib/theme"
import type { ThemePalette, QuickAccessTone } from "@/lib/home-types"

export function getSubjectCardPresentation(
  theme: ThemePalette,
  isLocked: boolean
) {
  const tone = isLocked ? theme.accent : theme.primary
  const primaryCtaText = isLocked
    ? theme.secondaryForeground
    : theme.primaryForeground

  return {
    tone,
    statusIconBg: isLocked
      ? withOpacity(theme.accent, 0.14)
      : withOpacity(theme.primary, 0.12),
    statusIcon: isLocked ? LockKeyhole : FolderOpen,
    badgeBg: isLocked ? withOpacity(theme.accent, 0.14) : theme.secondary,
    badgeText: isLocked ? theme.accent : theme.secondaryForeground,
    statusLabel: isLocked ? "Premium" : "Open",
    primaryIcon: isLocked ? LockKeyhole : ArrowRight,
    primaryLabel: isLocked ? "Unlock" : "Board Exams",
    primaryCtaBg: isLocked ? theme.secondary : tone,
    primaryCtaText,
  }
}

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
