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
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { HapticTab } from "@/components/haptic-tab"

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const activeTint = theme.primary
  const inactiveTint = theme.mutedForeground
  const insets = useSafeAreaInsets()
  // Keep compact spacing while still respecting device safe area.
  const paddingBottom = Math.max(insets.bottom, 2)

  return (
    <>
      <Tabs
        screenOptions={{
          lazy: true,
          freezeOnBlur: true,
          tabBarActiveTintColor: activeTint,
          tabBarInactiveTintColor: inactiveTint,
          tabBarHideOnKeyboard: true,
          tabBarActiveBackgroundColor: withOpacity(theme.primary, 0.1),
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: 52 + paddingBottom,
            paddingBottom,
            paddingTop: 2,
            paddingHorizontal: 4,
          },
          tabBarItemStyle: {
            borderRadius: 12,
            marginHorizontal: 2,
          },
          tabBarLabelStyle: {
            fontFamily: APP_FONTS.semiBold,
            fontSize: 10,
            marginTop: 1,
          },
          headerShown: false,
          tabBarButton: HapticTab,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Review",
            tabBarIcon: ({ color }) => (
              <ClipboardCheck size={22} color={color} strokeWidth={2.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="learn"
          options={{
            title: "Content",
            tabBarIcon: ({ color }) => (
              <BookOpenText size={22} color={color} strokeWidth={2.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Chat",
            tabBarIcon: ({ color }) => (
              <MessagesSquare size={22} color={color} strokeWidth={2.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="news"
          options={{
            title: "News",
            tabBarIcon: ({ color }) => (
              <Newspaper size={22} color={color} strokeWidth={2.3} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <User size={22} color={color} strokeWidth={2.3} />
            ),
          }}
        />
        {/* Hidden screens */}
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
    </>
  )
}
