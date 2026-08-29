import { memo } from "react"
import { ChevronRight, Compass } from "lucide-react-native"
import { Pressable, View } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"
import { SettingsSection } from "./settings-section"

/**
 * Where the first-run tour goes to live afterwards.
 *
 * Onboarding used to be genuinely once-only: it ran before the first sign-in,
 * set a flag, and became unreachable for the life of the install. That is the
 * wrong shape for it — the slides explain what the app is *for*, which is worth
 * more to somebody three weeks in and unsure what "board exam mode" does than
 * to somebody who has not signed up yet and is skipping to get past it.
 *
 * So it stays out of the way and stays reachable.
 */

type HelpSectionProps = {
  onReplayOnboarding: () => void
}

export const HelpSection = memo(function HelpSection({
  onReplayOnboarding,
}: HelpSectionProps) {
  const theme = useThemePalette()

  return (
    <SettingsSection
      title="Help"
      description="A refresher on what this app does, whenever you want it."
    >
      <Pressable
        onPress={onReplayOnboarding}
        accessibilityRole="button"
        accessibilityLabel="How this app works"
        accessibilityHint="Replays the introduction slides"
        className="min-h-[56px] flex-row items-center gap-3 rounded-md px-1 py-2 active:opacity-80"
      >
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
        >
          <Compass size={16} color={theme.primary} strokeWidth={2.2} />
        </View>

        <View className="flex-1 gap-0.5">
          <Text variant="callout" className="font-semibold">
            How this app works
          </Text>
          <Text variant="caption">
            The three slides from your first launch.
          </Text>
        </View>

        <ChevronRight
          size={18}
          color={theme.mutedForeground}
          strokeWidth={2.2}
        />
      </Pressable>
    </SettingsSection>
  )
})
