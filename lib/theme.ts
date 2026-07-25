import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native"

/**
 * ─── Brand ────────────────────────────────────────────────────────────────
 *
 * The literal colors sampled from the "Social Work Sure Win!" logo
 * (assets/images/logo.png). These are the identity colors — use them for
 * logo-adjacent surfaces, hero gradients and SVG fills. They are hex so they
 * can be handed straight to react-native-svg, which does not parse the
 * space-separated CSS Color Level 4 `hsl()` syntax used by the tokens below.
 *
 * Every semantic token in THEME is derived from these five hues.
 */
export const BRAND = {
  /** Left figure, "Social Work" wordmark, "Win!" — the dominant logo color. */
  teal: "#03979d",
  /** Book cover and the "Sure" wordmark — the deepest brand color. */
  navy: "#02275c",
  /** Right figure — supporting brand blue. */
  blue: "#226dc3",
  /** Open book pages — soft supporting blue. */
  sky: "#2892be",
  /** Heart, checkmark and the "!" dot — the single highlight color. */
  amber: "#f8a716",
} as const

/**
 * ─── Semantic tokens ──────────────────────────────────────────────────────
 *
 * Runtime source of truth for the palette. Mirrored in global.css for web and
 * for anything rendered outside the themed root View — change values HERE
 * first, then mirror.
 *
 * Every foreground/background pair below is verified to meet WCAG AA (4.5:1)
 * in both schemes. `accent` is a light amber and is only ever legible as a
 * FILL — when the amber has to be text on a light surface, use `accentText`.
 */
export const THEME = {
  light: {
    // Cool near-white pulled from the logo's blue family rather than a
    // neutral grey, so the whole app sits in the same temperature.
    background: "hsl(204 46% 97%)",
    foreground: "hsl(215 48% 15%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(215 48% 15%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(215 48% 15%)",
    // Logo teal, deepened until white-on-primary clears AA (5.06:1).
    primary: "hsl(183 95% 26%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(200 46% 92%)",
    secondaryForeground: "hsl(215 52% 24%)",
    muted: "hsl(204 40% 94%)",
    mutedForeground: "hsl(210 18% 42%)",
    // Logo amber, unchanged — it is a fill color.
    accent: "hsl(38 94% 53%)",
    accentForeground: "hsl(215 60% 13%)",
    /** Amber darkened for use as TEXT on light surfaces (4.87:1 on card). */
    accentText: "hsl(30 88% 36%)",
    destructive: "hsl(0 72% 46%)",
    destructiveForeground: "hsl(0 0% 100%)",
    border: "hsl(205 32% 87%)",
    input: "hsl(205 34% 91%)",
    ring: "hsl(183 95% 26%)",
    success: "hsl(162 82% 27%)",
    successForeground: "hsl(0 0% 100%)",
    warning: "hsl(38 94% 53%)",
    warningForeground: "hsl(215 60% 13%)",
    radius: "0.875rem",
    // chart1–3 are the logo colors; 4–5 add hue separation so categorical
    // series stay distinguishable (teal/sky/blue alone are too close).
    chart1: "hsl(183 95% 30%)",
    chart2: "hsl(212 70% 45%)",
    chart3: "hsl(38 94% 53%)",
    chart4: "hsl(262 62% 56%)",
    chart5: "hsl(344 72% 52%)",
  },
  dark: {
    // Navy-black derived from the logo's book cover.
    background: "hsl(215 50% 7%)",
    foreground: "hsl(204 34% 94%)",
    card: "hsl(215 42% 11%)",
    cardForeground: "hsl(204 34% 94%)",
    popover: "hsl(215 42% 11%)",
    popoverForeground: "hsl(204 34% 94%)",
    primary: "hsl(182 72% 46%)",
    primaryForeground: "hsl(215 60% 8%)",
    secondary: "hsl(214 36% 17%)",
    secondaryForeground: "hsl(204 34% 94%)",
    muted: "hsl(214 32% 18%)",
    mutedForeground: "hsl(206 22% 68%)",
    accent: "hsl(38 95% 58%)",
    accentForeground: "hsl(215 60% 10%)",
    accentText: "hsl(38 95% 62%)",
    destructive: "hsl(2 76% 62%)",
    destructiveForeground: "hsl(215 60% 8%)",
    border: "hsl(213 28% 22%)",
    input: "hsl(214 30% 16%)",
    ring: "hsl(182 72% 46%)",
    success: "hsl(160 66% 45%)",
    successForeground: "hsl(215 60% 8%)",
    warning: "hsl(38 95% 58%)",
    warningForeground: "hsl(215 60% 10%)",
    radius: "0.875rem",
    chart1: "hsl(182 72% 50%)",
    chart2: "hsl(212 82% 66%)",
    chart3: "hsl(38 95% 58%)",
    chart4: "hsl(262 78% 72%)",
    chart5: "hsl(344 80% 68%)",
  },
} as const

export type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

export const NAV_THEME: Record<"light" | "dark", Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
}

const NATIVEWIND_THEME_VARIABLE_KEYS = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  accentText: "--accent-text",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
  success: "--success",
  successForeground: "--success-foreground",
  warning: "--warning",
  warningForeground: "--warning-foreground",
  radius: "--radius",
  chart1: "--chart-1",
  chart2: "--chart-2",
  chart3: "--chart-3",
  chart4: "--chart-4",
  chart5: "--chart-5",
} as const

type NativewindThemeToken = keyof typeof NATIVEWIND_THEME_VARIABLE_KEYS
type NativewindThemeRecord = Record<NativewindThemeToken, string>

function toNativewindVariableValue(value: string): string {
  if (value.startsWith("hsl(") && value.endsWith(")")) {
    return value.slice(4, -1)
  }

  return value
}

function createNativewindThemeVariables(
  palette: NativewindThemeRecord
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(NATIVEWIND_THEME_VARIABLE_KEYS).map(
      ([token, cssVariable]) => [
        cssVariable,
        toNativewindVariableValue(palette[token as keyof typeof palette]),
      ]
    )
  )
}

export const NATIVEWIND_THEME_VARIABLES = {
  light: createNativewindThemeVariables(THEME.light),
  dark: createNativewindThemeVariables(THEME.dark),
} as const

export function withOpacity(hslString: string, opacity: number): string {
  return hslString.replace(")", ` / ${opacity})`)
}

/**
 * react-native-svg's color parser predates CSS Color Level 4, so it cannot
 * read the space-separated `hsl(H S% L% / A)` form the tokens use. Convert to
 * the legacy comma form before handing a token to any SVG prop.
 */
export function toSvgColor(color: string | undefined): string | undefined {
  if (!color) {
    return color
  }

  const match = color.match(
    /hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+))?\s*\)/
  )

  if (match) {
    const [, h, s, l, a] = match
    return `hsla(${h}, ${s}%, ${l}%, ${a ?? 1})`
  }

  return color
}

export function getBorderColor(theme: ThemePalette): string {
  return theme.border
}

export function getThemeChartPalette(theme: ThemePalette): string[] {
  return [theme.primary, theme.chart2, theme.chart3, theme.chart4, theme.chart5]
}

/**
 * Palette for content painted on top of the brand (navy) hero surface.
 *
 * The hero is deliberately dark in BOTH schemes — it is the logo's own
 * surface, so it stays constant the way a printed logo would. Everything here
 * is therefore light-on-dark regardless of the active color scheme.
 */
export function getBrandSurfacePalette() {
  return {
    /** Gradient stops, deep navy → brand teal, matching the logo's read. */
    gradientStart: BRAND.navy,
    gradientMid: "#0a4a73",
    gradientEnd: BRAND.teal,
    foreground: "hsl(0 0% 100%)",
    mutedForeground: "hsl(199 40% 84%)",
    /** Frosted panels layered on the gradient. */
    overlayStrong: "hsl(0 0% 100% / 0.14)",
    overlaySoft: "hsl(0 0% 100% / 0.08)",
    border: "hsl(0 0% 100% / 0.18)",
    accent: BRAND.amber,
    sky: BRAND.sky,
  }
}

/**
 * Palette for the home feature sections, which sit on `card` / `background`.
 *
 * Overlays are brand-tinted rather than plain white so they remain visible in
 * light mode — a flat white wash disappears entirely on a white card.
 */
export function getReviewerFeaturePalette(mode: "light" | "dark") {
  const isDark = mode === "dark"
  const brandTheme = isDark ? THEME.dark : THEME.light

  return {
    surface: brandTheme.card,
    foreground: brandTheme.foreground,
    mutedForeground: brandTheme.mutedForeground,
    borderColor: withOpacity(brandTheme.primary, isDark ? 0.24 : 0.18),
    panelBorder: withOpacity(brandTheme.foreground, isDark ? 0.14 : 0.08),
    overlayStrong: withOpacity(brandTheme.primary, isDark ? 0.14 : 0.07),
    overlaySoft: withOpacity(brandTheme.primary, isDark ? 0.08 : 0.045),
    primaryGlow: withOpacity(brandTheme.primary, isDark ? 0.16 : 0.1),
    accentGlow: withOpacity(brandTheme.chart3, isDark ? 0.14 : 0.1),
    activeSurface: withOpacity(brandTheme.primary, isDark ? 0.2 : 0.12),
    activeBorder: withOpacity(brandTheme.primary, isDark ? 0.34 : 0.28),
    inactiveSurface: withOpacity(brandTheme.foreground, isDark ? 0.05 : 0.035),
    inactiveBorder: withOpacity(brandTheme.foreground, isDark ? 0.09 : 0.07),
    inactiveDot: withOpacity(brandTheme.foreground, isDark ? 0.2 : 0.16),
    chartPalette: getThemeChartPalette(brandTheme),
    primary: brandTheme.primary,
    accentText: brandTheme.accentText,
    chart2: brandTheme.chart2,
    chart3: brandTheme.chart3,
  }
}

export function getCommunityCategoryColor(
  theme: ThemePalette,
  category: string
): string {
  switch (category) {
    case "discussion":
      return theme.chart2
    case "tip":
      return theme.chart3
    case "question":
    default:
      return theme.primary
  }
}
