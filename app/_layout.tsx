import { ThemeProvider } from "@react-navigation/native"
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
import { BookOpenText, ListChecks } from "lucide-react-native"
import { vars } from "nativewind"

import "react-native-reanimated"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
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

// ─── TEMPORARY DIAGNOSTIC ───────────────────────────────────────────
// Captures the "Couldn't find a navigation context" crash and shows the
// throw-site stack on screen, because that stack names the navigator that
// rendered without a container — which is the one fact static analysis of this
// repo cannot produce. React 19 reports render errors through
// console.error(error), so intercepting that is enough to catch it.
// Delete this whole block, and <NavContextCrashOverlay /> below, once fixed.
const NAV_CONTEXT_MESSAGE = "Couldn't find a navigation context"

let navCrashStack: string | null = null
const navCrashListeners = new Set<() => void>()

function subscribeToNavCrash(listener: () => void) {
  navCrashListeners.add(listener)
  return () => {
    navCrashListeners.delete(listener)
  }
}

function getNavCrashStack() {
  return navCrashStack
}

if (__DEV__) {
  const consoleError = console.error

  console.error = (...args: unknown[]) => {
    const match = args.find((arg) =>
      arg instanceof Error
        ? arg.message.includes(NAV_CONTEXT_MESSAGE)
        : typeof arg === "string" && arg.includes(NAV_CONTEXT_MESSAGE)
    )

    if (match && !navCrashStack) {
      navCrashStack =
        match instanceof Error
          ? (match.stack ?? match.message)
          : String(match)

      consoleError(
        `\n===== NAV CONTEXT CRASH START =====\n${navCrashStack}\n===== NAV CONTEXT CRASH END =====\n`
      )

      // Notify on a later tick: this runs inside React's error reporting, and
      // setting state synchronously from there would nest another render.
      setTimeout(() => {
        navCrashListeners.forEach((listener) => listener())
      }, 0)
    }

    consoleError(...args)
  }
}

function NavContextCrashOverlay() {
  const stack = useSyncExternalStore(
    subscribeToNavCrash,
    getNavCrashStack,
    getNavCrashStack
  )
  const [dismissed, setDismissed] = useState(false)

  if (!__DEV__ || !stack || dismissed) {
    return null
  }

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.92)",
        padding: 16,
        paddingTop: 56,
        zIndex: 9999,
      }}
    >
      <Text style={{ color: "#ff8a80", fontSize: 15, fontWeight: "700" }}>
        Navigation context crash
      </Text>
      <Text style={{ color: "#ffd180", fontSize: 11, marginTop: 4 }}>
        Send these frames to Claude — the topmost app/library frame names the
        navigator that rendered without a container.
      </Text>

      <ScrollView
        style={{ marginTop: 12, flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Text
          selectable
          style={{ color: "#e0e0e0", fontSize: 10, lineHeight: 15 }}
        >
          {stack}
        </Text>
      </ScrollView>

      <Pressable
        onPress={() => setDismissed(true)}
        style={{
          backgroundColor: "#37474f",
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "600" }}>Dismiss</Text>
      </Pressable>
    </View>
  )
}

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
          <NavContextCrashOverlay />
        </View>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
