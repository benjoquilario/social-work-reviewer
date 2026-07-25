import { THEME, type ThemePalette } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"

/**
 * Single entry point for theme state.
 *
 * Prefer NativeWind semantic classes (bg-primary, text-muted-foreground, …)
 * for styling. Reach for `theme`/`useThemePalette()` only when a raw color
 * value is required (SVG strokes, icon `color` props, gradients, shadows).
 */
export function useTheme() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  return {
    isDark,
    colorScheme,
    theme: (isDark ? THEME.dark : THEME.light) as ThemePalette,
  }
}

/**
 * Shorthand when only the resolved palette is needed.
 * Replaces the repeated `colorScheme === "dark" ? THEME.dark : THEME.light`
 * pattern previously copy-pasted across screens.
 */
export function useThemePalette(): ThemePalette {
  return useTheme().theme
}
