import { useEffect } from "react"
import { type ViewProps } from "react-native"
import { cssInterop } from "nativewind"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"

import { cn } from "@/lib/utils"

const AnimatedView = Animated.View
cssInterop(AnimatedView, { className: "style" })

export function Skeleton({ className, ...props }: ViewProps) {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1
    )
  }, [opacity])

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <AnimatedView
      style={pulse}
      className={cn("rounded-lg bg-muted/80", className)}
      {...props}
    />
  )
}
