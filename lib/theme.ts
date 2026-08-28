import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native"

/**
 * ─── Brand ────────────────────────────────────────────────────────────────
 *
 * Literal colors sampled from the "Social Work Sure Win!" logo
 * (assets/images/logo.png) — the neon-on-ink artwork. Sampled by pixel
 * dominance, so these are the hues a viewer actually reads off the mark:
 *
 *   teal  #019a9d  29.7k px — left figure and heart outline, dominant hue
 *   navy  #00246e  13.9k px — the book cover, deepest brand color
 *   sky   #07abf4   7.4k px — the open book pages
 *   blue  #0269ed   6.8k px — the right figure
 *   gold  #fec503   5.1k px — the heart's highlight and the "!" dot
 *   amber #fea902   5.1k px — the heart's body
 *   cyan  #21d5fe          — the outer glow, the artwork's light source
 *   ink   #01060d          — the near-black the whole mark sits on
 *
 * Use them for logo-adjacent surfaces, hero gradients and SVG fills. They are
 * hex so they can be handed straight to react-native-svg, which does not
 * parse the space-separated CSS Color Level 4 `hsl()` syntax used below.
 *
 * Every semantic token in THEME is derived from these hues.
 */
export const BRAND = {
  /** Left figure, "Social Work" wordmark, "Win!" — the dominant logo color. */
  teal: "#019a9d",
  /** The glow radiating off the mark. Dark mode's primary comes from here. */
  cyan: "#21d5fe",
  /** Book cover and the "Sure" wordmark — the deepest brand color. */
  navy: "#00246e",
  /** Right figure — electric brand blue. */
  blue: "#0269ed",
  /** Open book pages — bright supporting blue. */
  sky: "#07abf4",
  /** Heart body — the single warm highlight. */
  amber: "#fea902",
  /** Heart highlight and the "!" dot. */
  gold: "#fec503",
  /** The near-black the logo is set on. Dark mode's floor. */
  ink: "#01060d",
} as const

/**
 * ─── Semantic tokens ──────────────────────────────────────────────────────
 *
 * Runtime source of truth for the palette. Mirrored in global.css for web and
 * for anything rendered outside the themed root View — change values HERE
 * first, then mirror.
 *
 * Every foreground/background pair below is verified against WCAG AA — 4.5:1
 * for text, 3:1 for graphics — in both schemes.
 *
 * `accent` is the bright logo gold, which is legible only as a FILL. When the
 * gold has to be TEXT on a light surface use `accentText`, and when it has to
 * be a chart series in light mode use `chart3`; both are darkened versions.
 */
export const THEME = {
  light: {
    // Cool near-white pulled from the logo's cyan family rather than a
    // neutral grey, so the whole app sits in the same temperature.
    background: "hsl(200 50% 97%)",
    foreground: "hsl(215 55% 13%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(215 55% 13%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(215 55% 13%)",
    // Logo blue (#0269ed), deepened one step so white-on-primary clears AA
    // with room to spare (5.34:1) and the blue itself stays legible as text
    // on `background` (5.03:1). Teal moves to `chart2` and stays the app's
    // supporting hue.
    primary: "hsl(214 98% 45%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(198 52% 92%)",
    secondaryForeground: "hsl(214 52% 22%)",
    muted: "hsl(200 44% 94%)",
    mutedForeground: "hsl(208 20% 40%)",
    // Logo gold, unchanged — it is a fill color.
    accent: "hsl(45 99% 51%)",
    accentForeground: "hsl(215 60% 12%)",
    /** Gold darkened for use as TEXT on light surfaces (5.05:1 on card). */
    accentText: "hsl(32 92% 34%)",
    destructive: "hsl(0 74% 45%)",
    destructiveForeground: "hsl(0 0% 100%)",
    border: "hsl(203 34% 87%)",
    input: "hsl(203 38% 92%)",
    ring: "hsl(214 98% 45%)",
    success: "hsl(165 88% 26%)",
    successForeground: "hsl(0 0% 100%)",
    warning: "hsl(40 99% 50%)",
    warningForeground: "hsl(215 60% 12%)",
    radius: "1rem",
    // chart1–3 are the logo hues; 4–5 add hue separation so categorical
    // series stay distinguishable (teal/sky/blue alone are too close).
    // chart3 is the gold darkened to clear 3:1 as a graphic on white — the
    // bright `accent` gold only reaches 1.65:1 there.
    chart1: "hsl(214 92% 48%)",
    chart2: "hsl(184 98% 30%)",
    chart3: "hsl(38 98% 40%)",
    chart4: "hsl(262 70% 56%)",
    chart5: "hsl(340 78% 52%)",
  },
  dark: {
    // The logo's own habitat: neon on ink. The artwork sits on a near-black
    // with a cool cast, so dark mode is a deep navy-black rather than grey.
    // It stops short of pure #000 so elevation layers still read.
    background: "hsl(210 55% 5%)",
    foreground: "hsl(200 32% 94%)",
    card: "hsl(211 44% 9%)",
    cardForeground: "hsl(200 32% 94%)",
    popover: "hsl(211 40% 12%)",
    popoverForeground: "hsl(200 32% 94%)",
    // The logo blue lifted until it carries on ink (7.90:1 on background).
    // The mark's cyan glow stays in the palette as `chart2`.
    primary: "hsl(212 96% 68%)",
    primaryForeground: "hsl(212 70% 7%)",
    secondary: "hsl(212 34% 16%)",
    secondaryForeground: "hsl(200 32% 94%)",
    muted: "hsl(212 30% 17%)",
    mutedForeground: "hsl(203 20% 66%)",
    accent: "hsl(45 96% 58%)",
    accentForeground: "hsl(215 70% 8%)",
    // On ink the gold is already high-contrast, so accentText only warms it
    // slightly instead of darkening it the way light mode has to.
    accentText: "hsl(45 96% 62%)",
    destructive: "hsl(2 80% 65%)",
    destructiveForeground: "hsl(212 70% 7%)",
    border: "hsl(209 30% 20%)",
    input: "hsl(212 32% 15%)",
    ring: "hsl(212 96% 68%)",
    success: "hsl(160 70% 48%)",
    successForeground: "hsl(212 70% 7%)",
    warning: "hsl(45 96% 58%)",
    warningForeground: "hsl(215 70% 8%)",
    radius: "1rem",
    chart1: "hsl(212 96% 68%)",
    chart2: "hsl(188 92% 58%)",
    chart3: "hsl(45 96% 58%)",
    chart4: "hsl(262 82% 74%)",
    chart5: "hsl(342 84% 68%)",
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
  return [theme.chart1, theme.chart2, theme.chart3, theme.chart4, theme.chart5]
}

/**
 * Palette for content painted on top of the brand hero surface.
 *
 * The hero is deliberately dark in BOTH schemes — it is the logo's own
 * surface, so it stays constant the way a printed logo would. The gradient
 * retraces how the artwork reads: ink at the edges, navy through the book,
 * teal where the figures glow. Everything here is therefore light-on-dark
 * regardless of the active color scheme.
 */
export function getBrandSurfacePalette() {
  return {
    /** Gradient stops, ink → navy → brand teal, matching the logo's read. */
    gradientStart: BRAND.ink,
    gradientMid: BRAND.navy,
    gradientEnd: BRAND.teal,
    foreground: "hsl(0 0% 100%)",
    mutedForeground: "hsl(196 45% 85%)",
    /** Frosted panels layered on the gradient. */
    overlayStrong: "hsl(0 0% 100% / 0.14)",
    overlaySoft: "hsl(0 0% 100% / 0.08)",
    border: "hsl(0 0% 100% / 0.18)",
    accent: BRAND.gold,
    sky: BRAND.sky,
    /** The logo's outer glow — for halos and rim light on the hero. */
    glow: BRAND.cyan,
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
