import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs"
import { PlatformPressable } from "@react-navigation/elements"
import * as Haptics from "expo-haptics"

import { useAppPreferences } from "@/lib/app-preferences"

export function HapticTab(props: BottomTabBarButtonProps) {
  const { preferences } = useAppPreferences()

  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios" && preferences.hapticsEnabled) {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }
        props.onPressIn?.(ev)
      }}
    />
  )
}
