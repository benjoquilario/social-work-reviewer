import { useContext } from "react"
import { useColorScheme as useNativeColorScheme } from "react-native"

import { AppPreferencesContext } from "@/lib/app-preferences"

export function useColorScheme() {
  const nativeColorScheme = useNativeColorScheme() ?? "light"
  const preferences = useContext(AppPreferencesContext)

  return preferences?.resolvedColorScheme ?? nativeColorScheme
}
