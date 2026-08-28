import { memo } from "react"
import { Menu, Settings } from "lucide-react-native"
import { View } from "react-native"

import type { ThemePalette } from "@/lib/theme"
import { BrandLogo } from "@/components/ui/brand-logo"
import { IconButton } from "@/components/ui/icon-button"

type ProfileTopBarProps = {
  theme: ThemePalette
  onPressMenu: () => void
  onPressSettings: () => void
}

/**
 * Menu on the left, settings on the right — the same bar shape Home uses, so
 * moving between the two tabs does not move the controls.
 *
 * Settings takes the accent colour here because it is this screen's one
 * outbound action; on Home that slot belongs to notifications.
 */
export const ProfileTopBar = memo(function ProfileTopBar({
  theme,
  onPressMenu,
  onPressSettings,
}: ProfileTopBarProps) {
  return (
    <View className="relative flex-row items-center justify-between">
      {/* Matches Home: the mark is centred on the bar, not between the two
          controls, so it does not shift as either side gains a button. */}
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
      >
        <BrandLogo size="sm" variant="lockup" />
      </View>

      <IconButton label="Open menu" variant="ghost" onPress={onPressMenu}>
        <Menu size={24} color={theme.foreground} strokeWidth={2.2} />
      </IconButton>

      <IconButton label="Settings" variant="ghost" onPress={onPressSettings}>
        <Settings size={22} color={theme.primary} strokeWidth={2.2} />
      </IconButton>
    </View>
  )
})
