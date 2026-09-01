import { useCallback, type ComponentProps } from "react"
import { Tabs } from "expo-router"
import * as Haptics from "expo-haptics"
import BookOpenText from "lucide-react-native/icons/book-open-text"
import ClipboardCheck from "lucide-react-native/icons/clipboard-check"
import MessagesSquare from "lucide-react-native/icons/messages-square"
import Pencil from "lucide-react-native/icons/pencil"
import User from "lucide-react-native/icons/user"
import type { LucideIcon } from "lucide-react-native"
import { Pressable, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useAppPreferences } from "@/lib/app-preferences"
import { getBorderColor } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

/**
 * Icon and label per route. Keyed by the expo-router route name so a route
 * that is hidden from the bar (`href: null`) simply never appears here.
 */
const TAB_META: Record<string, { Icon: LucideIcon; label: string }> = {
  index: { Icon: ClipboardCheck, label: "Home" },
  learn: { Icon: BookOpenText, label: "Learn" },
  community: { Icon: MessagesSquare, label: "Forum" },
  profile: { Icon: User, label: "Profile" },
}

/**
 * The props expo-router hands a custom `tabBar`, inferred from the component
 * that calls it.
 *
 * Not imported from `@react-navigation/bottom-tabs`: expo-router 57 vendors its
 * own copy of that package, so the two `BottomTabBarProps` are structurally
 * incompatible and the assignment fails to typecheck. Inferring from `Tabs`
 * always matches whichever copy the installed router actually uses.
 */
type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>["tabBar"]>

type StudyTabBarProps = Parameters<TabBarRenderer>[0] & {
  /** Fired by the raised centre button. */
  onPressStudy: () => void
}

function TabItem({
  Icon,
  label,
  isFocused,
  activeColor,
  inactiveColor,
  onPress,
  onLongPress,
}: {
  Icon: LucideIcon
  label: string
  isFocused: boolean
  activeColor: string
  inactiveColor: string
  onPress: () => void
  onLongPress: () => void
}) {
  const color = isFocused ? activeColor : inactiveColor

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      className="h-full flex-1 items-center justify-center gap-1 active:opacity-70"
    >
      <Icon size={21} color={color} strokeWidth={isFocused ? 2.6 : 2.2} />
      <Text
        numberOfLines={1}
        className={cn(
          "text-[10px] leading-3",
          isFocused ? "font-bold" : "font-medium"
        )}
        style={{ color }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * Bottom bar with a raised centre action.
 *
 * The four tabs are destinations; the centre button is a *verb* — it starts a
 * quiz rather than navigating to a section, which is why it is a button and
 * not a fifth tab. Splitting the routes around the middle keeps the button
 * optically centred no matter how many tabs are registered, so hiding or
 * adding one does not require re-tuning the layout.
 *
 * Updates lost its tab to make room; it is reachable from the Home bell, which
 * suits content you check when it is badged rather than browse on a schedule.
 */
export function StudyTabBar({
  state,
  navigation,
  onPressStudy,
}: StudyTabBarProps) {
  const theme = useThemePalette()
  const insets = useSafeAreaInsets()
  const hapticsEnabled = useAppPreferences(
    (preferences) => preferences.preferences.hapticsEnabled
  )

  const tapFeedback = useCallback(() => {
    if (hapticsEnabled && process.env.EXPO_OS === "ios") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }, [hapticsEnabled])

  const handlePress = useCallback(
    (routeKey: string, routeName: string, isFocused: boolean) => {
      tapFeedback()

      const event = navigation.emit({
        type: "tabPress",
        target: routeKey,
        canPreventDefault: true,
      })

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(routeName)
      }
    },
    [navigation, tapFeedback]
  )

  const handleStudyPress = useCallback(() => {
    tapFeedback()
    onPressStudy()
  }, [onPressStudy, tapFeedback])

  const visibleRoutes = state.routes.filter((route) => TAB_META[route.name])
  const splitAt = Math.ceil(visibleRoutes.length / 2)

  const renderTab = (route: (typeof visibleRoutes)[number]) => {
    const meta = TAB_META[route.name]
    const isFocused =
      state.routes[state.index]?.key === route.key

    return (
      <TabItem
        key={route.key}
        Icon={meta.Icon}
        label={meta.label}
        isFocused={isFocused}
        activeColor={theme.primary}
        inactiveColor={theme.mutedForeground}
        onPress={() => handlePress(route.key, route.name, isFocused)}
        onLongPress={() =>
          navigation.emit({ type: "tabLongPress", target: route.key })
        }
      />
    )
  }

  return (
    <View
      // The bar floats, so the container is transparent and only the inner
      // surface is painted. `pointerEvents="box-none"` lets taps in the gap
      // beside the FAB fall through to the screen instead of being swallowed.
      pointerEvents="box-none"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      className="px-3 pt-2"
    >
      <View pointerEvents="box-none" className="relative">
        <View
          className="h-16 flex-row items-center rounded-2xl"
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: getBorderColor(theme),
            shadowColor: theme.foreground,
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          {visibleRoutes.slice(0, splitAt).map(renderTab)}

          {/* Reserves the footprint the raised button sits over. */}
          <View className="w-[72px]" />

          {visibleRoutes.slice(splitAt).map(renderTab)}
        </View>

        {/* Raised centre action, absolutely placed so it can break the bar's
            top edge without changing the bar's own height. */}
        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 -top-5 items-center"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start studying"
            onPress={handleStudyPress}
            className="h-14 w-14 items-center justify-center rounded-full active:opacity-90"
            style={{
              backgroundColor: theme.primary,
              borderWidth: 4,
              borderColor: theme.background,
              shadowColor: theme.primary,
              shadowOpacity: 0.45,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 10,
            }}
          >
            <Pencil
              size={22}
              color={theme.primaryForeground}
              strokeWidth={2.6}
            />
          </Pressable>

          <Text
            className="mt-0.5 text-[10px] font-bold leading-3"
            style={{ color: theme.primary }}
          >
            Study
          </Text>
        </View>
      </View>
    </View>
  )
}
