import { useColorScheme as useNativeColorScheme } from "react-native"

import { useAppPreferences } from "@/lib/app-preferences"

export function useColorScheme() {
  const nativeColorScheme = useNativeColorScheme() ?? "light"
  const isReady = useAppPreferences((state) => state.isReady)
  const resolvedColorScheme = useAppPreferences(
    (state) => state.resolvedColorScheme
  )

  return isReady ? resolvedColorScheme : nativeColorScheme
}
