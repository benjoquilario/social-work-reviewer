import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "expo-router"
import { Alert, Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppPreferences, type ThemeMode } from "@/lib/app-preferences"
import { getInitials } from "@/lib/auth"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Text } from "@/components/ui/text"

const APPEARANCE_OPTIONS: {
  label: string
  value: ThemeMode
  description: string
}[] = [
  {
    label: "System",
    value: "system",
    description: "Follow your device appearance",
  },
  {
    label: "Light",
    value: "light",
    description: "Bright and clean for daytime review",
  },
  {
    label: "Dark",
    value: "dark",
    description: "Lower glare for evening study",
  },
]

function SettingRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string
  description: string
  value: boolean
  onValueChange: (value: boolean) => void
}) {
  return (
    <View className="flex-row items-center justify-between gap-4 py-1.5">
      <View className="flex-1">
        <Text className="text-sm font-bold text-card-foreground">{label}</Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {description}
        </Text>
      </View>
      <Switch checked={value} onCheckedChange={onValueChange} />
    </View>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const {
    preferences,
    resolvedColorScheme,
    setPreference,
    setThemeMode,
    resetPreferences,
  } = useAppPreferences()
  const { user, profile, logout } = useAuth()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const displayName = profile?.fullName ?? user?.name ?? "Reviewer"
  const email = profile?.email ?? user?.email ?? ""
  const schoolName = profile?.schoolName ?? null
  const initials = getInitials(displayName)

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true)
          try {
            await logout()
          } finally {
            setIsLoggingOut(false)
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-4 pb-28 pt-5">
        {/* Header */}
        <View className="gap-0.5">
          <Text className="text-[11px] font-black uppercase tracking-[1.8px] text-primary">
            App Preferences
          </Text>
          <Text className="text-[22px] font-black leading-tight text-foreground">
            Settings
          </Text>
        </View>

        {/* Profile card */}
        <Card className="rounded-3xl">
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Profile
            </Text>
            <View className="flex-row items-center gap-4">
              {/* Avatar */}
              <View
                className="h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: theme.primary }}
              >
                <Text
                  className="text-xl font-black"
                  style={{ color: theme.primaryForeground }}
                >
                  {initials}
                </Text>
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-black text-card-foreground">
                  {displayName}
                </Text>
                <Text
                  className="text-xs text-muted-foreground"
                  numberOfLines={1}
                >
                  {email}
                </Text>
                {schoolName ? (
                  <Text className="text-xs text-muted-foreground">
                    {schoolName}
                  </Text>
                ) : null}
                <View className="mt-1 self-start">
                  {profile?.isPremium ? (
                    <View
                      className="rounded-full px-2.5 py-0.5"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <Text
                        className="text-[10px] font-black uppercase tracking-wide"
                        style={{ color: theme.accentForeground }}
                      >
                        Premium
                      </Text>
                    </View>
                  ) : (
                    <View className="rounded-full border border-border px-2.5 py-0.5">
                      <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Free Plan
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="rounded-3xl">
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Appearance
            </Text>
            <Text className="text-xs leading-5 text-muted-foreground">
              Current: {resolvedColorScheme === "dark" ? "Dark" : "Light"} mode
            </Text>
            <View className="gap-2">
              {APPEARANCE_OPTIONS.map((option) => {
                const isActive = preferences.themeMode === option.value
                return (
                  <Pressable
                    key={option.value}
                    className="rounded-2xl border p-3"
                    style={{
                      borderColor: isActive ? theme.primary : theme.border,
                      backgroundColor: isActive
                        ? withOpacity(theme.primary, 0.1)
                        : theme.background,
                    }}
                    onPress={() => setThemeMode(option.value)}
                  >
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-card-foreground">
                          {option.label}
                        </Text>
                        <Text className="text-xs leading-5 text-muted-foreground">
                          {option.description}
                        </Text>
                      </View>
                      {isActive ? (
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <Text
                            className="text-[10px] font-bold uppercase tracking-wide"
                            style={{ color: theme.primaryForeground }}
                          >
                            Active
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </CardContent>
        </Card>

        {/* Quiz Experience */}
        <Card className="rounded-3xl">
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Quiz Experience
            </Text>
            <SettingRow
              label="Show answer explanations"
              description="Display rationale after submitting a timed session."
              value={preferences.showExplanations}
              onValueChange={(v) => setPreference("showExplanations", v)}
            />
            <SettingRow
              label="Enable strict mode"
              description="Lock answer changes after moving to next question."
              value={preferences.strictMode}
              onValueChange={(v) => setPreference("strictMode", v)}
            />
            <SettingRow
              label="Sound effects"
              description="Play subtle sounds for correct and wrong answers."
              value={preferences.soundEffects}
              onValueChange={(v) => setPreference("soundEffects", v)}
            />
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card className="rounded-3xl">
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Accessibility & Focus
            </Text>
            <SettingRow
              label="Haptic feedback"
              description="Tactile cues when selecting options."
              value={preferences.hapticsEnabled}
              onValueChange={(v) => setPreference("hapticsEnabled", v)}
            />
            <SettingRow
              label="Daily study reminder"
              description="Remind you to complete at least one review session."
              value={preferences.dailyReminder}
              onValueChange={(v) => setPreference("dailyReminder", v)}
            />
          </CardContent>
        </Card>

        {/* Data Controls */}
        <Card className="rounded-3xl">
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Data
            </Text>
            <Button
              variant="outline"
              className="h-11"
              onPress={() => router.push("/diagnostics")}
            >
              <Text className="font-bold">Run Appwrite Diagnostics</Text>
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onPress={() => resetPreferences()}
            >
              <Text className="font-bold">Restore Defaults</Text>
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onPress={() =>
                Alert.alert(
                  "Reset Progress",
                  "This will clear local progress data."
                )
              }
            >
              <Text className="font-bold">Reset Local Progress</Text>
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button
          className="h-12 rounded-3xl"
          onPress={handleLogout}
          disabled={isLoggingOut}
          variant="outline"
          style={
            {
              borderColor: "hsl(0 84% 60% / 0.35)",
              backgroundColor: "hsl(0 84% 60% / 0.07)",
            } as never
          }
        >
          <Text style={{ color: theme.destructive }} className="font-bold">
            {isLoggingOut ? "Signing out…" : "Sign Out"}
          </Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}
