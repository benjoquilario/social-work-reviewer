import { useColorScheme as useNativeColorScheme } from "react-native"

import { toColorScheme, useAppPreferences } from "@/lib/app-preferences"

export function useColorScheme() {
  const nativeColorScheme = toColorScheme(useNativeColorScheme())
  const isReady = useAppPreferences((state) => state.isReady)
  const resolvedColorScheme = useAppPreferences(
    (state) => state.resolvedColorScheme
  )

  return isReady ? resolvedColorScheme : nativeColorScheme
}
