import { memo } from "react"
import { Pressable, View } from "react-native"

import type { QuestionsAnsweredTimeline } from "@/lib/performance-stats"
import { THEME, withOpacity } from "@/lib/theme"
import { Text } from "@/components/ui/text"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

const BAR_MAX_HEIGHT = 110

const BarChartGridlines = memo(function BarChartGridlines({ theme }: { theme: ThemePalette }) {
  return (
    <>
      {[0, 0.5, 1].map((ratio) => (
        <View
          key={`grid-${ratio}`}
          style={{
            position: "absolute",
            left: 0,
            right: 30,
            top: (1 - ratio) * BAR_MAX_HEIGHT,
            height: 1,
            backgroundColor: withOpacity(theme.border, 0.5),
          }}
        />
      ))}
    </>
  )
})

const BarChartYAxis = memo(function BarChartYAxis({ theme, maxValue }: { theme: ThemePalette, maxValue: number }) {
  return (
    <View
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        alignItems: "flex-end",
        height: BAR_MAX_HEIGHT,
        justifyContent: "space-between",
      }}
    >
      <Text style={{ fontSize: 10, color: theme.mutedForeground, fontWeight: "600" }}>
        {maxValue}
      </Text>
      <Text style={{ fontSize: 10, color: theme.mutedForeground, fontWeight: "600" }}>
        {Math.round(maxValue / 2)}
      </Text>
      <Text style={{ fontSize: 10, color: theme.mutedForeground, fontWeight: "600" }}>
        0
      </Text>
    </View>
  )
})

const BarChartBars = memo(function BarChartBars({
  points, theme, maxValue, selectedBarIndex, onSelectBar
}: {
  points: QuestionsAnsweredTimeline["points"]
  theme: ThemePalette
  maxValue: number
  selectedBarIndex: number | null
  onSelectBar: (index: number) => void
}) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
        paddingRight: 36,
        height: BAR_MAX_HEIGHT,
      }}
    >
      {points.map((point, index) => {
        const height = point.value === 0 ? 4 : Math.max((point.value / maxValue) * BAR_MAX_HEIGHT, 8)
        const isSelected = selectedBarIndex === index

        return (
          <Pressable
            key={point.key}
            onPress={() => onSelectBar(index)}
            style={{ flex: 1, alignItems: "center" }}
          >
            {isSelected && point.value > 0 ? (
              <View
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginBottom: 6,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "800", color: theme.primaryForeground }} numberOfLines={1}>
                  {point.value}
                </Text>
                <View
                  style={{
                    position: "absolute",
                    bottom: -4,
                    width: 0,
                    height: 0,
                    borderLeftWidth: 5,
                    borderRightWidth: 5,
                    borderTopWidth: 5,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: theme.primary,
                  }}
                />
              </View>
            ) : null}

            <View
              style={{
                width: "85%",
                height,
                borderRadius: 6,
                backgroundColor: point.value === 0
                  ? withOpacity(theme.primary, 0.06)
                  : isSelected
                    ? theme.primary
                    : withOpacity(theme.primary, 0.3),
              }}
            />
          </Pressable>
        )
      })}
    </View>
  )
})

const BarChartLabels = memo(function BarChartLabels({
  points, theme
}: {
  points: QuestionsAnsweredTimeline["points"]
  theme: ThemePalette
}) {
  return (
    <View className="flex-row" style={{ paddingRight: 36, marginTop: 8, gap: 8 }}>
      {points.map((point) => (
        <View key={`label-${point.key}`} style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "600", color: theme.mutedForeground, textAlign: "center" }}>
            {point.label}
          </Text>
        </View>
      ))}
    </View>
  )
})

export const BarChart = memo(function BarChart({
  timeline,
  theme,
  selectedBarIndex,
  onSelectBar,
}: {
  timeline: QuestionsAnsweredTimeline
  theme: ThemePalette
  selectedBarIndex: number | null
  onSelectBar: (index: number) => void
}) {
  const maxValue = Math.max(1, ...timeline.points.map((p) => p.value))

  return (
    <View className="gap-2">
      <View style={{ height: BAR_MAX_HEIGHT + 28, position: "relative" }}>
        <BarChartGridlines theme={theme} />
        <BarChartYAxis theme={theme} maxValue={maxValue} />
        <BarChartBars 
          points={timeline.points} 
          theme={theme} 
          maxValue={maxValue} 
          selectedBarIndex={selectedBarIndex} 
          onSelectBar={onSelectBar} 
        />
        <BarChartLabels points={timeline.points} theme={theme} />
      </View>
    </View>
  )
})
