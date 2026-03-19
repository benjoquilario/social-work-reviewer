import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BookOpenText, ListChecks, Timer } from "lucide-react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { NAV_THEME } from "@/lib/theme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navTheme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: navTheme.colors.card },
            headerTintColor: navTheme.colors.text,
            headerTitleStyle: { fontWeight: "800" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="mode"
            options={{
              title: "Question Mode",
              headerRight: () => (
                <ListChecks
                  size={18}
                  color={navTheme.colors.primary}
                  strokeWidth={2.5}
                />
              ),
            }}
          />
          <Stack.Screen
            name="quiz"
            options={{
              title: "Timed Quiz",
              headerRight: () => (
                <Timer
                  size={18}
                  color={navTheme.colors.primary}
                  strokeWidth={2.5}
                />
              ),
            }}
          />
          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
              title: "Imports Glossary",
              headerRight: () => (
                <BookOpenText
                  size={18}
                  color={navTheme.colors.primary}
                  strokeWidth={2.5}
                />
              ),
            }}
          />
        </Stack>
        <PortalHost />
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
