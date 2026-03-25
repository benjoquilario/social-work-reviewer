import React from "react"
import { Tabs } from "expo-router"
import { BookOpenText, ClipboardCheck, MessagesSquare, Newspaper, User } from "lucide-react-native"

import { APP_FONTS } from "@/lib/fonts"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { HapticTab } from "@/components/haptic-tab"

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const activeTint = theme.primary
  const inactiveTint = theme.mutedForeground

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: activeTint,
          tabBarInactiveTintColor: inactiveTint,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: isDark ? theme.card : "#ffffff",
            borderTopColor: theme.border,
            borderTopWidth: 1,
            height: 80,
            paddingBottom: 12,
            paddingTop: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: isDark ? 0.22 : 0.07,
            shadowRadius: 16,
            elevation: 12,
          },
          tabBarItemStyle: {
            borderRadius: 14,
            marginHorizontal: 2,
          },
          tabBarLabelStyle: {
            fontFamily: APP_FONTS.semiBold,
            fontSize: 10.5,
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
            title: "Community",
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
          name="settings"
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
