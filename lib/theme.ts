import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native"

export const THEME = {
  light: {
    background: "hsl(156 30% 96%)",
    foreground: "hsl(160 28% 12%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(160 28% 12%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(160 28% 12%)",
    primary: "hsl(174 72% 39%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(160 27% 90%)",
    secondaryForeground: "hsl(164 36% 24%)",
    muted: "hsl(162 24% 93%)",
    mutedForeground: "hsl(164 12% 41%)",
    accent: "hsl(46 92% 52%)",
    accentForeground: "hsl(160 28% 12%)",
    destructive: "hsl(0 84.2% 60.2%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(160 20% 84%)",
    input: "hsl(160 22% 90%)",
    ring: "hsl(174 72% 39%)",
    success: "hsl(152 63% 38%)",
    successForeground: "hsl(0 0% 100%)",
    warning: "hsl(46 92% 52%)",
    warningForeground: "hsl(160 28% 12%)",
    radius: "0.875rem",
    chart1: "hsl(174 72% 39%)",
    chart2: "hsl(210 93% 63%)",
    chart3: "hsl(46 92% 52%)",
    chart4: "hsl(258 78% 68%)",
    chart5: "hsl(344 80% 64%)",
  },
  dark: {
    background: "hsl(165 34% 7%)",
    foreground: "hsl(156 22% 94%)",
    card: "hsl(162 31% 10%)",
    cardForeground: "hsl(156 22% 94%)",
    popover: "hsl(162 31% 10%)",
    popoverForeground: "hsl(156 22% 94%)",
    primary: "hsl(174 73% 53%)",
    primaryForeground: "hsl(165 34% 7%)",
    secondary: "hsl(160 29% 13%)",
    secondaryForeground: "hsl(156 22% 94%)",
    muted: "hsl(160 21% 16%)",
    mutedForeground: "hsl(158 12% 67%)",
    accent: "hsl(46 95% 58%)",
    accentForeground: "hsl(165 34% 7%)",
    destructive: "hsl(0 70.9% 59.4%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(160 18% 18%)",
    input: "hsl(160 20% 14%)",
    ring: "hsl(174 73% 53%)",
    success: "hsl(151 63% 47%)",
    successForeground: "hsl(165 34% 7%)",
    warning: "hsl(46 95% 58%)",
    warningForeground: "hsl(165 34% 7%)",
    radius: "0.875rem",
    chart1: "hsl(174 73% 53%)",
    chart2: "hsl(210 95% 67%)",
    chart3: "hsl(46 95% 58%)",
    chart4: "hsl(258 80% 72%)",
    chart5: "hsl(344 82% 69%)",
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

export function getBorderColor(theme: ThemePalette): string {
  return theme.border
}

export function getThemeChartPalette(theme: ThemePalette): string[] {
  return [theme.primary, theme.chart2, theme.chart3, theme.chart4, theme.chart5]
}

export function getReviewerFeaturePalette(mode: "light" | "dark") {
  const brandTheme = mode === "dark" ? THEME.dark : THEME.light
  const surface = mode === "dark" ? "hsl(160 31% 11%)" : "hsl(160 30% 15%)"
  const foreground = mode === "dark" ? brandTheme.foreground : "hsl(0 0% 98%)"
  const mutedForeground =
    mode === "dark" ? brandTheme.mutedForeground : "hsl(156 12% 74%)"

  return {
    surface,
    foreground,
    mutedForeground,
    borderColor: withOpacity(brandTheme.primary, mode === "dark" ? 0.2 : 0.3),
    panelBorder: "hsl(0 0% 100% / 0.08)",
    overlayStrong:
      mode === "dark" ? "hsl(0 0% 100% / 0.08)" : "hsl(0 0% 100% / 0.08)",
    overlaySoft:
      mode === "dark" ? "hsl(0 0% 100% / 0.06)" : "hsl(0 0% 100% / 0.06)",
    primaryGlow: withOpacity(brandTheme.primary, mode === "dark" ? 0.18 : 0.16),
    accentGlow: withOpacity(brandTheme.chart3, 0.12),
    activeSurface: withOpacity(
      brandTheme.primary,
      mode === "dark" ? 0.18 : 0.14
    ),
    activeBorder: withOpacity(brandTheme.primary, mode === "dark" ? 0.3 : 0.34),
    inactiveSurface: "hsl(0 0% 100% / 0.04)",
    inactiveBorder: "hsl(0 0% 100% / 0.06)",
    inactiveDot: "hsl(0 0% 100% / 0.18)",
    chartPalette: getThemeChartPalette(brandTheme),
    primary: brandTheme.primary,
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
