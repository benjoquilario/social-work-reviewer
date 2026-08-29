import { memo, useCallback } from "react"
import { Pressable, ScrollView, View } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

/**
 * The jump grid.
 *
 * Tiles carry three states — answered, current, untouched — and each is told
 * apart by fill *and* border weight, not colour alone. Under `feedbackTiming:
 * "at_end"` correctness is deliberately absent: revealing it here would defeat
 * the point of a mock exam.
 */

export type NavigatorTileState = "answered" | "current" | "untouched"

type QuestionNavigatorProps = {
  total: number
  currentIndex: number
  /** Indices the member has answered. */
  answeredIndices: ReadonlySet<number>
  onJump: (index: number) => void
}

type TileProps = {
  index: number
  state: NavigatorTileState
  onJump: (index: number) => void
}

const Tile = memo(function Tile({ index, state, onJump }: TileProps) {
  const theme = useThemePalette()
  const handlePress = useCallback(() => onJump(index), [index, onJump])

  const background =
    state === "current"
      ? theme.primary
      : state === "answered"
        ? withOpacity(theme.primary, 0.14)
        : theme.muted

  const color =
    state === "current"
      ? theme.primaryForeground
      : state === "answered"
        ? theme.primary
        : theme.mutedForeground

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Question ${index + 1}, ${state}`}
      className="h-11 w-11 items-center justify-center rounded-md active:opacity-80"
      style={{
        backgroundColor: background,
        borderWidth: state === "current" ? 2 : 1,
        borderColor:
          state === "untouched" ? theme.border : withOpacity(theme.primary, 0.4),
      }}
    >
      <Text className="text-xs font-bold" style={{ color }}>
        {index + 1}
      </Text>
    </Pressable>
  )
})

export const QuestionNavigator = memo(function QuestionNavigator({
  total,
  currentIndex,
  answeredIndices,
  onJump,
}: QuestionNavigatorProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 16 }}
    >
      <View className="flex-row flex-wrap gap-2">
        {Array.from({ length: total }, (_, index) => (
          <Tile
            key={index}
            index={index}
            state={
              index === currentIndex
                ? "current"
                : answeredIndices.has(index)
                  ? "answered"
                  : "untouched"
            }
            onJump={onJump}
          />
        ))}
      </View>
    </ScrollView>
  )
})
