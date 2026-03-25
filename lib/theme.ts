import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native"

export const THEME = {
  light: {
    background: "hsl(0 0% 100%)",
    foreground: "hsl(240 10% 8%)",
    card: "hsl(243 30% 98%)",
    cardForeground: "hsl(240 10% 8%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(240 10% 8%)",
    primary: "hsl(243 75% 59%)", // indigo
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(243 30% 94%)",
    secondaryForeground: "hsl(243 60% 30%)",
    muted: "hsl(243 20% 94%)",
    mutedForeground: "hsl(240 10% 50%)",
    accent: "hsl(38 92% 58%)", // amber accent
    accentForeground: "hsl(240 10% 8%)",
    destructive: "hsl(0 84.2% 60.2%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(243 20% 88%)",
    input: "hsl(243 20% 90%)",
    ring: "hsl(243 75% 59%)",
    success: "hsl(142 71% 45%)",
    successForeground: "hsl(0 0% 100%)",
    warning: "hsl(38 92% 50%)",
    warningForeground: "hsl(240 10% 8%)",
    radius: "0.625rem",
    chart1: "hsl(243 75% 59%)",
    chart2: "hsl(173 58% 39%)",
    chart3: "hsl(38 92% 58%)",
    chart4: "hsl(280 65% 60%)",
    chart5: "hsl(340 75% 55%)",
  },
  dark: {
    background: "hsl(240 10% 6%)",
    foreground: "hsl(243 20% 96%)",
    card: "hsl(240 10% 10%)",
    cardForeground: "hsl(243 20% 96%)",
    popover: "hsl(240 10% 10%)",
    popoverForeground: "hsl(243 20% 96%)",
    primary: "hsl(245 80% 72%)", // lighter indigo for dark bg
    primaryForeground: "hsl(240 10% 6%)",
    secondary: "hsl(240 10% 18%)",
    secondaryForeground: "hsl(243 20% 90%)",
    muted: "hsl(240 10% 20%)",
    mutedForeground: "hsl(240 10% 68%)",
    accent: "hsl(38 85% 60%)", // amber (slightly muted for dark)
    accentForeground: "hsl(240 10% 6%)",
    destructive: "hsl(0 70.9% 59.4%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(240 10% 20%)",
    input: "hsl(240 10% 18%)",
    ring: "hsl(245 80% 72%)",
    success: "hsl(142 65% 50%)",
    successForeground: "hsl(240 10% 6%)",
    warning: "hsl(38 85% 55%)",
    warningForeground: "hsl(240 10% 6%)",
    radius: "0.625rem",
    chart1: "hsl(245 80% 72%)",
    chart2: "hsl(160 60% 50%)",
    chart3: "hsl(38 85% 60%)",
    chart4: "hsl(280 65% 65%)",
    chart5: "hsl(340 75% 60%)",
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
