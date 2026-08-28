import { type ThemePalette } from "@/lib/theme"

/**
 * ─── Tone ─────────────────────────────────────────────────────────────────
 *
 * One semantic vocabulary shared by every component that colors itself by
 * meaning: `Badge`, `StatTile`, `EmptyState`, callouts, list rows.
 *
 * Before this, each of those had invented its own overlapping set — Badge had
 * `default | secondary | muted | success | warning | destructive | accent |
 * outline` where `default` secretly meant primary, while StatTile had
 * `default | primary | success | warning | destructive`. Same idea, two
 * spellings, and no way to hand a tone from one component to another.
 *
 * Add a tone here and every consumer gets it.
 */
export const TONES = [
  "default",
  "primary",
  "success",
  "warning",
  "accent",
  "destructive",
  "muted",
] as const

export type Tone = (typeof TONES)[number]

/**
 * Text color per tone, AA-safe on `card` and `background` in both schemes.
 *
 * `warning` and `accent` both resolve to `accent-text` rather than the raw
 * gold: the logo's gold is a fill color and only reaches 1.65:1 as text on
 * white. `accent-text` is that gold darkened for light mode and warmed for
 * dark, so one class is correct in both — no `dark:` override needed.
 */
export const TONE_TEXT_CLASS: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-accent-text",
  accent: "text-accent-text",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
}

/** Tinted surface + border for pills, tiles and callouts. */
export const TONE_SURFACE_CLASS: Record<Tone, string> = {
  default: "border-border bg-card",
  primary: "border-primary/25 bg-primary/10",
  success: "border-success/25 bg-success/10",
  warning: "border-warning/30 bg-warning/15",
  accent: "border-accent/30 bg-accent/15",
  destructive: "border-destructive/25 bg-destructive/10",
  muted: "border-transparent bg-muted",
}

/**
 * Raw color for a tone — for lucide `color` props, SVG fills and shadows,
 * which cannot take a class. Pass the palette from `useThemePalette()`.
 */
export function getToneColor(theme: ThemePalette, tone: Tone): string {
  switch (tone) {
    case "primary":
      return theme.primary
    case "success":
      return theme.success
    case "warning":
    case "accent":
      return theme.accentText
    case "destructive":
      return theme.destructive
    case "muted":
      return theme.mutedForeground
    case "default":
    default:
      return theme.foreground
  }
}
