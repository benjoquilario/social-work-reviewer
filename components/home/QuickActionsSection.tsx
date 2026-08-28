import { memo } from "react"
import { ScrollView, View } from "react-native"

import { Text } from "@/components/ui/text"

import { QuickActionTile, type QuickActionIcon } from "./QuickActionTile"

export type QuickAction = {
  key: string
  Icon: QuickActionIcon
  label: string
  color: string
  onPress: () => void
}

type QuickActionsSectionProps = {
  actions: QuickAction[]
}

/**
 * The five shortcuts under the progress card.
 *
 * Horizontally scrollable rather than a fixed five-across row: five 64px tiles
 * plus gaps fit a 360px screen exactly, with nothing left for a sixth or for
 * larger text settings. Scrolling means adding an action never squeezes the
 * labels, and on a normal screen there is nothing to scroll so it reads as a
 * static row.
 */
export const QuickActionsSection = memo(function QuickActionsSection({
  actions,
}: QuickActionsSectionProps) {
  return (
    <View className="gap-3">
      <Text variant="heading">Quick Actions</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Negative margin + matching padding lets tiles bleed to the screen
        // edge while the section itself stays on the 16px gutter.
        className="-mx-4"
        contentContainerClassName="gap-3 px-4"
      >
        {actions.map((action) => (
          <QuickActionTile
            key={action.key}
            Icon={action.Icon}
            label={action.label}
            color={action.color}
            onPress={action.onPress}
          />
        ))}
      </ScrollView>
    </View>
  )
})
