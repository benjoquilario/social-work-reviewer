import { Tabs } from "expo-router";
import { BookOpenText, ClipboardCheck } from "lucide-react-native";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { THEME } from "@/lib/theme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const activeTint =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary;
  const inactiveTint =
    colorScheme === "dark"
      ? THEME.dark.mutedForeground
      : THEME.light.mutedForeground;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarStyle: {
          backgroundColor: isDark ? THEME.dark.card : THEME.light.card,
          borderTopColor: isDark ? THEME.dark.border : THEME.light.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Reviewer",
          tabBarIcon: ({ color }) => (
            <ClipboardCheck size={22} color={color} strokeWidth={2.4} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Learn",
          tabBarIcon: ({ color }) => (
            <BookOpenText size={22} color={color} strokeWidth={2.4} />
          ),
        }}
      />
    </Tabs>
  );
}
