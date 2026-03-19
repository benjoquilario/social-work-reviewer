import { createContext, useContext } from "react";
import { useColorScheme as useNativeColorScheme } from "react-native";

type ColorScheme = "light" | "dark" | null | undefined;

interface ThemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

export function useColorScheme(): ColorScheme {
  const systemColorScheme = useNativeColorScheme();
  const context = useContext(ThemeContext);

  if (context) {
    return context.colorScheme;
  }

  return systemColorScheme;
}

export function useTheme() {
  const colorScheme = useColorScheme();
  return {
    isDark: colorScheme === "dark",
    colorScheme,
  };
}
