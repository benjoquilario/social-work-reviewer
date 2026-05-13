import { ThemeProvider } from "@react-navigation/native"
import { PortalHost } from "@rn-primitives/portal"
import { useFonts } from "expo-font"
import { Stack, useRouter, useSegments } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { BookOpenText, ListChecks, Timer } from "lucide-react-native"
import { vars } from "nativewind"

import "react-native-reanimated"

import { useEffect, useMemo } from "react"
import { View } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import "../global.css"

import { AuthProvider, useAuth } from "@/contexts/auth-context"

import {
  AppPreferencesProvider,
  useAppPreferences,
} from "@/lib/app-preferences"
import { APP_FONTS } from "@/lib/fonts"
import { configureNotifications } from "@/lib/notifications"
import { AppQueryProvider } from "@/lib/query-client"
import { NATIVEWIND_THEME_VARIABLES, NAV_THEME } from "@/lib/theme"
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
  const router = useRouter()
  const segments = useSegments()
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular: require("../assets/fonts/PlusJakartaSans_400Regular.ttf"),
    PlusJakartaSans_500Medium: require("../assets/fonts/PlusJakartaSans_500Medium.ttf"),
    PlusJakartaSans_600SemiBold: require("../assets/fonts/PlusJakartaSans_600SemiBold.ttf"),
    PlusJakartaSans_700Bold: require("../assets/fonts/PlusJakartaSans_700Bold.ttf"),
    PlusJakartaSans_800ExtraBold: require("../assets/fonts/PlusJakartaSans_800ExtraBold.ttf"),
  })
  const isReady = useAppPreferences((state) => state.isReady)
  const authState = useAuth((state) => state.authState)
  const colorScheme = useColorScheme()
  const navTheme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light
  const nativewindThemeVariables = useMemo(
    () =>
      vars(
        colorScheme === "dark"
          ? NATIVEWIND_THEME_VARIABLES.dark
          : NATIVEWIND_THEME_VARIABLES.light
      ),
    [colorScheme]
  )

  const screenOptions = useMemo(
    () => ({
      headerShadowVisible: false,
      headerStyle: { backgroundColor: navTheme.colors.background },
      headerTintColor: navTheme.colors.primary,
      headerBackButtonDisplayMode: "minimal" as const,
      headerTitleStyle: {
        fontFamily: APP_FONTS.extraBold,
        fontSize: 18,
      },
    }),
    [navTheme.colors.background, navTheme.colors.primary]
  )

  useEffect(() => {
    if (fontsLoaded && isReady && authState.status !== "loading") {
      SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [fontsLoaded, isReady, authState.status])

  useEffect(() => {
    void configureNotifications()
  }, [])

  useEffect(() => {
    if (!fontsLoaded || !isReady || authState.status === "loading") {
      return
    }

    const inAuthGroup = segments[0] === "(auth)"
    const isPublicRoute =
      segments[0] === "verify-email" || segments[0] === "verify-email-bridge"

    if (
      authState.status === "unauthenticated" &&
      !inAuthGroup &&
      !isPublicRoute
    ) {
      router.replace("/(auth)/login")
      return
    }

    if (authState.status === "authenticated" && inAuthGroup) {
      router.replace("/(tabs)")
    }
  }, [authState.status, fontsLoaded, isReady, router, segments])

  if (!fontsLoaded || !isReady || authState.status === "loading") {
    return null
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <View className="flex-1 bg-background" style={nativewindThemeVariables}>
          <Stack screenOptions={screenOptions}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="diagnostics" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen
              name="verify-email"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="verify-email-bridge"
              options={{ headerShown: false }}
            />
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
              options={{}}
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
              options={{}}
            />
            <Stack.Screen
              name="board-exams/index"
              options={{}}
            />
            <Stack.Screen
              name="board-exams/[categoryId]"
              options={{}}
            />
            <Stack.Screen
              name="board-exams/[categoryId]/[setId]"
              options={{}}
            />
            <Stack.Screen
              name="premium"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="community/[postId]"
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
        </View>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
