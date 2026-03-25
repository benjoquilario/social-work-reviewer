import { ThemeProvider } from "@react-navigation/native"
import { PortalHost } from "@rn-primitives/portal"
import { useFonts } from "expo-font"
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { BookOpenText, ListChecks, Timer } from "lucide-react-native"

import "react-native-reanimated"

import { useEffect } from "react"
import { View } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import "../global.css"

import { AuthProvider, useAuth } from "@/contexts/auth-context"

import {
  AppPreferencesProvider,
  useAppPreferences,
} from "@/lib/app-preferences"
import { APP_FONTS } from "@/lib/fonts"
import { AppQueryProvider } from "@/lib/query-client"
import { NAV_THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"

export const unstable_settings = {
  anchor: "(tabs)",
}

void SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  return (
    <AppPreferencesProvider>
      <AppQueryProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </AppQueryProvider>
    </AppPreferencesProvider>
  )
}

function RootNavigator() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular: require("../assets/fonts/PlusJakartaSans_400Regular.ttf"),
    PlusJakartaSans_500Medium: require("../assets/fonts/PlusJakartaSans_500Medium.ttf"),
    PlusJakartaSans_600SemiBold: require("../assets/fonts/PlusJakartaSans_600SemiBold.ttf"),
    PlusJakartaSans_700Bold: require("../assets/fonts/PlusJakartaSans_700Bold.ttf"),
    PlusJakartaSans_800ExtraBold: require("../assets/fonts/PlusJakartaSans_800ExtraBold.ttf"),
  })
  const { isReady } = useAppPreferences()
  const { authState } = useAuth()
  const colorScheme = useColorScheme()
  const navTheme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light

  useEffect(() => {
    if (fontsLoaded && isReady && authState.status !== "loading") {
      SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [fontsLoaded, isReady, authState.status])

  const router = useRouter()
  const segments = useSegments()
  const rootNavigationState = useRootNavigationState()

  useEffect(() => {
    if (!fontsLoaded || !isReady || authState.status === "loading") return
    if (!rootNavigationState?.key) return // Guard: Wait for navigation to initialize

    const inAuthGroup = segments[0] === "(auth)"
    const isDiagnosticsRoute = segments[0] === "diagnostics"

    if (
      authState.status === "unauthenticated" &&
      !inAuthGroup &&
      !isDiagnosticsRoute
    ) {
      router.replace("/(auth)/login")
    } else if (authState.status === "authenticated" && inAuthGroup) {
      router.replace("/(tabs)")
    }
  }, [
    authState.status,
    fontsLoaded,
    isReady,
    segments,
    router,
    rootNavigationState?.key,
  ])

  if (!fontsLoaded || !isReady || authState.status === "loading") {
    return null
  }

  return (
    <SafeAreaProvider>
      <View className={colorScheme === "dark" ? "dark flex-1" : "flex-1"}>
        <ThemeProvider value={navTheme}>
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerStyle: { backgroundColor: navTheme.colors.card },
              headerTintColor: navTheme.colors.text,
              headerTitleStyle: {
                fontFamily: APP_FONTS.bold,
              },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="diagnostics" options={{ headerShown: false }} />
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
              name="learn/[lessonId]"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="learn/topic/[topicId]"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="dashboard"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="review/[categoryId]"
              options={{
                headerShown: false,
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
      </View>
    </SafeAreaProvider>
  )
}
