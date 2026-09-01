import { ThemeProvider } from "expo-router"
import { PortalHost } from "@rn-primitives/portal"
import { useFonts } from "expo-font"
import {
  Stack,
  useGlobalSearchParams,
  useRouter,
  useSegments,
} from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import BookOpenText from "lucide-react-native/icons/book-open-text"
import ListChecks from "lucide-react-native/icons/list-checks"
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
import { useStudyReminder } from "@/hooks/use-study-reminder"
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
  // Global rather than local: this is a layout, and `useLocalSearchParams`
  // reports the layout's own params, not the child route's.
  const globalParams = useGlobalSearchParams<{ replay?: string }>()
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular: require("../assets/fonts/PlusJakartaSans_400Regular.ttf"),
    PlusJakartaSans_500Medium: require("../assets/fonts/PlusJakartaSans_500Medium.ttf"),
    PlusJakartaSans_600SemiBold: require("../assets/fonts/PlusJakartaSans_600SemiBold.ttf"),
    PlusJakartaSans_700Bold: require("../assets/fonts/PlusJakartaSans_700Bold.ttf"),
    PlusJakartaSans_800ExtraBold: require("../assets/fonts/PlusJakartaSans_800ExtraBold.ttf"),
  })
  const isReady = useAppPreferences((state) => state.isReady)
  const hasCompletedOnboarding = useAppPreferences(
    (state) => state.preferences.hasCompletedOnboarding
  )
  const authState = useAuth((state) => state.authState)
  // Keeps the daily reminder in step with user_settings — including turning it
  // off, which is why it runs here rather than only from the settings screen.
  useStudyReminder()
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
    const inOnboarding = segments[0] === "onboarding"
    // Onboarding opened deliberately from Settings, rather than shown before
    // the first sign-in. Without this the guard below bounces a signed-in
    // member to Home the instant the screen mounts, so the Help entry would
    // look broken rather than replayed.
    const isOnboardingReplay = inOnboarding && globalParams.replay === "1"
    const isPublicRoute =
      segments[0] === "verify-email" || segments[0] === "verify-email-bridge"

    if (
      authState.status === "unauthenticated" &&
      !inAuthGroup &&
      !inOnboarding &&
      !isPublicRoute
    ) {
      router.replace(hasCompletedOnboarding ? "/(auth)/login" : "/onboarding")
      return
    }

    if (
      authState.status === "authenticated" &&
      (inAuthGroup || inOnboarding) &&
      !isOnboardingReplay
    ) {
      router.replace("/(tabs)")
    }
  }, [
    authState.status,
    fontsLoaded,
    globalParams.replay,
    hasCompletedOnboarding,
    isReady,
    router,
    segments,
  ])

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
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
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
