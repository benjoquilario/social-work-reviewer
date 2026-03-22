import React from "react"
import { Tabs } from "expo-router"
import {
  BookOpenText,
  ClipboardCheck,
  MessagesSquare,
  Newspaper,
  Settings,
} from "lucide-react-native"

import { APP_FONTS } from "@/lib/fonts"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { HapticTab } from "@/components/haptic-tab"

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const activeTint =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary
  const inactiveTint =
    colorScheme === "dark"
      ? THEME.dark.mutedForeground
      : THEME.light.mutedForeground

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: isDark ? THEME.dark.card : THEME.light.card,
          borderTopColor: isDark ? THEME.dark.border : THEME.light.border,
          borderTopWidth: 1,
          height: 74,
          paddingBottom: 10,
          paddingTop: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.18 : 0.06,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 2,
        },
        tabBarLabelStyle: {
          fontFamily: APP_FONTS.semiBold,
          fontSize: 11,
          marginTop: 2,
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
            <ClipboardCheck size={22} color={color} strokeWidth={2.4} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ color }) => (
            <BookOpenText size={22} color={color} strokeWidth={2.4} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color }) => (
            <MessagesSquare size={22} color={color} strokeWidth={2.4} />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: "News",
          tabBarIcon: ({ color }) => (
            <Newspaper size={22} color={color} strokeWidth={2.4} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Settings size={22} color={color} strokeWidth={2.4} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}
