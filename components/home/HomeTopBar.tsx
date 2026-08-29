import { memo } from "react"
import { Bell, Menu, Search } from "lucide-react-native"
import { Pressable, View } from "react-native"

import type { ThemePalette } from "@/lib/theme"
import { BrandLogo } from "@/components/ui/brand-logo"
import { IconButton } from "@/components/ui/icon-button"
import { CommunityAvatar } from "@/components/community/avatar"

type HomeTopBarProps = {
  theme: ThemePalette
  displayName: string
  initials: string
  avatarUrl: string | null
  /** Shows the unread dot on the bell. */
  hasUnread?: boolean
  onPressMenu: () => void
  onPressNotifications: () => void
  onPressAvatar: () => void
  onPressSearch: () => void
}

/**
 * Home's top bar: menu on the left, notifications and avatar on the right.
 *
 * The bell is the entry point to Updates. That tab was removed from the bottom
 * bar to make room for the centre study action, and news is exactly the kind
 * of low-frequency, check-when-badged content a bell serves better than a
 * permanent tab.
 *
 * The centre element is the symbol, not the wordmark. "Social Work Sure Win!"
 * is two lines of type, and the tallest it could be here without crowding the
 * 44pt controls either side leaves its top line around 5pt — a blue smudge
 * rather than a logo. The symbol was drawn to survive being small; the name is
 * already on the launcher, the splash and the auth screens.
 */
export const HomeTopBar = memo(function HomeTopBar({
  theme,
  displayName,
  initials,
  avatarUrl,
  hasUnread = false,
  onPressMenu,
  onPressNotifications,
  onPressAvatar,
  onPressSearch,
}: HomeTopBarProps) {
  return (
    <View className="relative flex-row items-center justify-between">
      {/*
        Absolutely placed rather than sat between the two groups. The left side
        is one 44px button and the right side is two, so a plain
        justify-between row would park the mark ~24px left of centre — close
        enough to look like a mistake rather than a choice. pointerEvents="none"
        keeps it from swallowing taps meant for the controls underneath.
      */}
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
      >
        <BrandLogo size="sm" />
      </View>

      <IconButton label="Open menu" variant="ghost" onPress={onPressMenu}>
        <Menu size={24} color={theme.foreground} strokeWidth={2.2} />
      </IconButton>

      <View className="flex-row items-center gap-1">
        {/*
          Search sits before the bell because it is reached deliberately and
          often, while the bell is reached because it lit up. Putting the
          frequent one first also keeps it away from the screen edge, where a
          thumb reaching across a 6" phone is least accurate.
        */}
        <IconButton
          label="Search questions and lessons"
          variant="ghost"
          onPress={onPressSearch}
        >
          <Search size={22} color={theme.foreground} strokeWidth={2.2} />
        </IconButton>

        <View>
          <IconButton
            label={
              hasUnread ? "Updates, new items available" : "Updates"
            }
            variant="ghost"
            onPress={onPressNotifications}
          >
            <Bell size={22} color={theme.foreground} strokeWidth={2.2} />
          </IconButton>

          {hasUnread ? (
            <View
              // Decorative: the unread state is already in the button's label,
              // so a screen reader would otherwise hear it twice.
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-destructive"
            />
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${displayName}, open profile`}
          hitSlop={6}
          className="active:opacity-80"
          onPress={onPressAvatar}
        >
          <CommunityAvatar
            label={initials}
            theme={theme}
            size="md"
            sourceUri={avatarUrl}
            className="rounded-full"
          />
        </Pressable>
      </View>
    </View>
  )
})
