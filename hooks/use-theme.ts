import { useColorScheme } from "@/hooks/use-color-scheme"

export function useTheme() {
  const colorScheme = useColorScheme()

  return {
    isDark: colorScheme === "dark",
    colorScheme,
  }
}
