import React from "react"
import { Tabs } from "expo-router"
import {
  BookOpenText,
  ClipboardCheck,
  MessagesSquare,
  Newspaper,
  User,
} from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { APP_FONTS } from "@/lib/fonts"
import { getBorderColor, THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { HapticTab } from "@/components/haptic-tab"

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const activeTint = theme.primary
  const inactiveTint = theme.mutedForeground
  const insets = useSafeAreaInsets()
  const bottomInset = Math.min(Math.max(insets.bottom, 0), 4)

  return (
    <>
      <Tabs
        screenOptions={{
          lazy: true,
          freezeOnBlur: true,
          tabBarActiveTintColor: activeTint,
          tabBarInactiveTintColor: inactiveTint,
          tabBarHideOnKeyboard: true,
          tabBarActiveBackgroundColor: withOpacity(
            theme.primary,
            isDark ? 0.18 : 0.12
          ),
          tabBarStyle: {
            backgroundColor: withOpacity(theme.card, 0.98),
            borderWidth: 1,
            borderTopWidth: 1,
            borderColor: getBorderColor(theme),
            borderRadius: 24,
            marginHorizontal: 12,
            marginBottom: 8,
            height: 64,
            paddingBottom: bottomInset,
            paddingTop: 0,
            paddingHorizontal: 6,
            elevation: 0,
            shadowColor: "#000000",
            shadowOpacity: isDark ? 0.18 : 0.05,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
          },
          tabBarItemStyle: {
            borderRadius: 16,
            marginHorizontal: 2,
            minHeight: 52,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 0,
          },
          tabBarIconStyle: {
            marginTop: 0,
            marginBottom: 2,
          },
          tabBarLabelStyle: {
            fontFamily: APP_FONTS.semiBold,
            fontSize: 10,
            lineHeight: 12,
            marginTop: 0,
            paddingBottom: 0,
          },
          headerShown: false,
          tabBarButton: HapticTab,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <ClipboardCheck size={20} color={color} strokeWidth={2.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="learn"
          options={{
            title: "Learn",
            tabBarIcon: ({ color }) => (
              <BookOpenText size={20} color={color} strokeWidth={2.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Forum",
            tabBarIcon: ({ color }) => (
              <MessagesSquare size={20} color={color} strokeWidth={2.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="news"
          options={{
            title: "Updates",
            tabBarIcon: ({ color }) => (
              <Newspaper size={20} color={color} strokeWidth={2.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <User size={20} color={color} strokeWidth={2.3} />
            ),
          }}
        />
      </Tabs>
    </>
  )
}
