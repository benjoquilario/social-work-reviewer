import { useEffect, useState } from "react"
import { AccessibilityInfo } from "react-native"
import { Easing } from "react-native-reanimated"

import { useAppPreferences } from "@/lib/app-preferences"

export const MOTION = {
  durations: {
    instant: 1,
    quick: 140,
    moderate: 220,
    gentle: 280,
  },
  easing: Easing.bezier(0.2, 0, 0, 1),
  pressScale: 0.985,
  enterOffset: 8,
  staggerStep: 45,
} as const

export function getStaggerDelay(index: number, step = MOTION.staggerStep) {
  return Math.max(0, index) * step
}

export function useMotionEnabled() {
  const animationsEnabled = useAppPreferences(
    (state) => state.preferences.animationsEnabled
  )
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false)

  useEffect(() => {
    let isMounted = true

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) {
          setReduceMotionEnabled(enabled)
        }
      })
      .catch(() => undefined)

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        setReduceMotionEnabled(enabled)
      }
    )

    return () => {
      isMounted = false
      subscription.remove()
    }
  }, [])

  return animationsEnabled && !reduceMotionEnabled
}
