import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native"

export const THEME = {
  light: {
    background: "hsl(42 45% 98%)",
    foreground: "hsl(220 30% 14%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(220 30% 14%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(220 30% 14%)",
    primary: "hsl(199 89% 48%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(190 46% 94%)",
    secondaryForeground: "hsl(198 65% 24%)",
    muted: "hsl(210 33% 95%)",
    mutedForeground: "hsl(220 14% 44%)",
    accent: "hsl(18 94% 62%)",
    accentForeground: "hsl(0 0% 100%)",
    destructive: "hsl(0 84.2% 60.2%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(205 32% 88%)",
    input: "hsl(205 32% 91%)",
    ring: "hsl(199 89% 48%)",
    success: "hsl(151 55% 41%)",
    successForeground: "hsl(0 0% 100%)",
    warning: "hsl(42 94% 57%)",
    warningForeground: "hsl(220 30% 14%)",
    radius: "0.875rem",
    chart1: "hsl(199 89% 48%)",
    chart2: "hsl(165 62% 43%)",
    chart3: "hsl(18 94% 62%)",
    chart4: "hsl(272 74% 66%)",
    chart5: "hsl(338 78% 61%)",
  },
  dark: {
    background: "hsl(224 29% 10%)",
    foreground: "hsl(210 40% 98%)",
    card: "hsl(223 27% 14%)",
    cardForeground: "hsl(210 40% 98%)",
    popover: "hsl(223 27% 14%)",
    popoverForeground: "hsl(210 40% 98%)",
    primary: "hsl(196 95% 72%)",
    primaryForeground: "hsl(224 29% 10%)",
    secondary: "hsl(214 20% 22%)",
    secondaryForeground: "hsl(210 32% 94%)",
    muted: "hsl(218 19% 20%)",
    mutedForeground: "hsl(214 20% 70%)",
    accent: "hsl(20 96% 68%)",
    accentForeground: "hsl(224 29% 10%)",
    destructive: "hsl(0 70.9% 59.4%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(216 18% 24%)",
    input: "hsl(216 18% 20%)",
    ring: "hsl(196 95% 72%)",
    success: "hsl(151 61% 55%)",
    successForeground: "hsl(224 29% 10%)",
    warning: "hsl(42 94% 62%)",
    warningForeground: "hsl(224 29% 10%)",
    radius: "0.875rem",
    chart1: "hsl(196 95% 72%)",
    chart2: "hsl(166 58% 55%)",
    chart3: "hsl(20 96% 68%)",
    chart4: "hsl(272 76% 72%)",
    chart5: "hsl(338 82% 68%)",
  },
} as const

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
type ThemePalette = Record<NativewindThemeToken, string>

function toNativewindVariableValue(value: string): string {
  if (value.startsWith("hsl(") && value.endsWith(")")) {
    return value.slice(4, -1)
  }

  return value
}

function createNativewindThemeVariables(
  palette: ThemePalette
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
