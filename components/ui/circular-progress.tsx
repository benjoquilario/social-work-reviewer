import { memo } from "react"
import { View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

type CircularProgressProps = {
  /** 0–100 */
  percent: number
  /** Outer size in pixels */
  size?: number
  /** Ring thickness */
  strokeWidth?: number
  /** Track (background ring) color */
  trackColor?: string
  /** Active ring color */
  color?: string
  /** Label beneath the percent number */
  label?: string
  /** Label color */
  labelColor?: string
}

function parseSvgColor(colorStr: string | undefined): string | undefined {
  if (!colorStr) return colorStr

  // Convert modern hsl "hsl(H S% L% / A)" to legacy "hsla(H, S%, L%, A)"
  // because react-native-svg color parser does not fully support CSS Color Level 4
  const match = colorStr.match(
    /hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+))?\s*\)/
  )
  if (match) {
    const [, h, s, l, a] = match
    return `hsla(${h}, ${s}%, ${l}%, ${a ?? 1})`
  }
  return colorStr
}

export const CircularProgress = memo(function CircularProgress({
  percent,
  size = 140,
  strokeWidth = 10,
  trackColor,
  color,
  label = "CORRECT",
  labelColor,
}: CircularProgressProps) {
  const palette = useThemePalette()
  const resolvedTrackColor = trackColor ?? palette.muted
  const resolvedColor = color ?? palette.success
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedPercent = Math.min(Math.max(percent, 0), 100)
  const strokeDashoffset =
    circumference - (clampedPercent / 100) * circumference

  const parsedTrackColor = parseSvgColor(resolvedTrackColor)
  const parsedColor = parseSvgColor(resolvedColor)

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {/* Track ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={parsedTrackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={parsedColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center text */}
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{
            fontSize: size * 0.24,
            fontWeight: "900",
            color: resolvedColor,
          }}
        >
          {clampedPercent}%
        </Text>
        <Text
          style={{
            fontSize: size * 0.075,
            fontWeight: "800",
            letterSpacing: 1.5,
            color: labelColor ?? resolvedColor,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  )
})
