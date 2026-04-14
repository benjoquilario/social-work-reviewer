import { useEffect, type ReactNode } from "react"
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"

import { MOTION, useMotionEnabled } from "@/lib/motion"

type FadeInViewProps = {
  children: ReactNode
  delay?: number
  offset?: number
  style?: StyleProp<ViewStyle>
}

export function FadeInView({
  children,
  delay = 0,
  offset = MOTION.enterOffset,
  style,
}: FadeInViewProps) {
  const motionEnabled = useMotionEnabled()
  const opacity = useSharedValue(motionEnabled ? 0 : 1)
  const translateY = useSharedValue(motionEnabled ? offset : 0)

  useEffect(() => {
    if (!motionEnabled) {
      opacity.value = 1
      translateY.value = 0
      return
    }

    opacity.value = 0
    translateY.value = offset
    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration: MOTION.durations.gentle,
        easing: MOTION.easing,
      })
    )
    translateY.value = withDelay(
      delay,
      withTiming(0, {
        duration: MOTION.durations.gentle,
        easing: MOTION.easing,
      })
    )
  }, [delay, motionEnabled, offset, opacity, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  )
}

type MotionPressableProps = PressableProps & {
  disableMotion?: boolean
  scaleTo?: number
}

export function MotionPressable({
  disableMotion = false,
  scaleTo = MOTION.pressScale,
  onPressIn,
  onPressOut,
  style,
  children,
  ...props
}: MotionPressableProps) {
  const motionEnabled = useMotionEnabled()
  const scale = useSharedValue(1)

  useEffect(() => {
    if (!motionEnabled || disableMotion) {
      scale.value = 1
    }
  }, [disableMotion, motionEnabled, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...props}
        style={style}
        onPressIn={(event) => {
          if (motionEnabled && !disableMotion) {
            scale.value = withTiming(scaleTo, {
              duration: MOTION.durations.quick,
              easing: MOTION.easing,
            })
          }
          onPressIn?.(event)
        }}
        onPressOut={(event) => {
          if (motionEnabled && !disableMotion) {
            scale.value = withTiming(1, {
              duration: MOTION.durations.quick,
              easing: MOTION.easing,
            })
          }
          onPressOut?.(event)
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}
