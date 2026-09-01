import { memo } from "react"
import Bell from "lucide-react-native/icons/bell"
import Menu from "lucide-react-native/icons/menu"
import Search from "lucide-react-native/icons/search"
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
 * Home's top bar: brand and menu on the left, actions on the right.
 *
 * The bell is the entry point to Updates. That tab was removed from the bottom
 * bar to make room for the centre study action, and news is exactly the kind
 * of low-frequency, check-when-badged content a bell serves better than a
 * permanent tab.
 *
 * The mark is the symbol, not the wordmark. "Social Work Sure Win!" is two
 * lines of type, and the tallest it could be here without crowding the 44pt
 * controls leaves its top line around 5pt — a blue smudge rather than a logo.
 * The symbol was drawn to survive being small.
 *
 * ─── Why the mark sits left rather than centred ───────────────────────────
 *
 * It used to be absolutely positioned in the middle, because the left side is
 * one button and the right side is three, so a plain `justify-between` row
 * would park it noticeably off-centre. That worked, and it cost more than it
 * returned: it stranded the mark in the middle of an empty stretch, left a
 * conspicuous gap beside the menu button, and needed `pointerEvents="none"` so
 * the overlay would not swallow taps meant for the controls beneath it.
 *
 * Grouping it with the menu removes all three problems and reads as the
 * ordinary app-bar arrangement people already know. Nothing is lost by not
 * centring it: `HomeGreeting` renders directly below with the member's name
 * and the app's promise set in 3xl type, so this row does not have to carry
 * the introduction on its own.
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
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-1">
        <IconButton label="Open menu" variant="ghost" onPress={onPressMenu}>
          {/*
            22, not 24. Menu is the densest glyph in this row — three solid
            bars against the open outlines of the search and bell — so drawn at
            a larger size it reads heavier than its neighbours and pulls the
            eye to the least important control on the screen.
          */}
          <Menu size={22} color={theme.foreground} strokeWidth={2.2} />
        </IconButton>

        {/* Decorative here: the screen is already announced as Home, so a
            second "Sure Win" adds noise to a screen reader and nothing else. */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <BrandLogo size="sm" />
        </View>
      </View>

      <View className="flex-row items-center gap-0.5">
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

        {/*
          `ml-1.5` where the two icon buttons only get `gap-0.5`. The bell and
          the search are the same kind of thing and read as a pair; the avatar
          is a person, and a destination rather than an action. Spacing it
          slightly apart is what stops the row reading as three identical
          buttons and makes the grouping legible without a divider.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${displayName}, open profile`}
          hitSlop={6}
          className="ml-1.5 active:opacity-80"
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
