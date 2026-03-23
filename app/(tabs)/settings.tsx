import { Alert, Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppPreferences, type ThemeMode } from "@/lib/app-preferences"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Text } from "@/components/ui/text"
import { AppShellHeader } from "@/components/app-shell-header"

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
    <View className="flex-row items-center justify-between gap-4 py-1">
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
  const {
    preferences,
    resolvedColorScheme,
    setPreference,
    setThemeMode,
    resetPreferences,
  } = useAppPreferences()

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-5">
        <AppShellHeader
          compact
          eyebrow="App Preferences"
          title="Settings"
          subtitle="Configure your reviewer workflow for focus, consistency, and exam readiness."
          stats={[
            {
              label: "Theme",
              value: resolvedColorScheme === "dark" ? "Dark" : "Light",
            },
            {
              label: "Explain",
              value: preferences.showExplanations ? "On" : "Off",
            },
            {
              label: "Haptics",
              value: preferences.hapticsEnabled ? "On" : "Off",
            },
          ]}
        />

        <Card>
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Appearance
            </Text>
            <Text className="text-xs leading-5 text-muted-foreground">
              Current theme: {resolvedColorScheme === "dark" ? "Dark" : "Light"}
            </Text>

            <View className="gap-2">
              {APPEARANCE_OPTIONS.map((option) => {
                const isActive = preferences.themeMode === option.value

                return (
                  <Pressable
                    key={option.value}
                    className={
                      isActive
                        ? "rounded-2xl border border-primary bg-primary/10 p-3"
                        : "rounded-2xl border border-border bg-background p-3"
                    }
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
                        <View className="rounded-full bg-primary px-2 py-1">
                          <Text className="text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                            Active
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                )
              })}
            </View>

            <View className="rounded-2xl border border-border bg-muted/60 p-3">
              <Text className="text-sm font-bold text-card-foreground">
                Recommended font family
              </Text>
              <Text className="mt-1 text-xs leading-5 text-muted-foreground">
                Plus Jakarta Sans is now used as the app typeface. It is
                compact, modern, and reads well in long study sessions.
              </Text>
            </View>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Quiz Experience
            </Text>
            <SettingRow
              label="Show answer explanations"
              description="Display short rationale after submitting a timed session."
              value={preferences.showExplanations}
              onValueChange={(value) =>
                setPreference("showExplanations", value)
              }
            />
            <SettingRow
              label="Enable strict mode"
              description="Lock answer changes after moving to the next question."
              value={preferences.strictMode}
              onValueChange={(value) => setPreference("strictMode", value)}
            />
            <SettingRow
              label="Sound effects"
              description="Play subtle sounds for correct and wrong answers."
              value={preferences.soundEffects}
              onValueChange={(value) => setPreference("soundEffects", value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Accessibility and Focus
            </Text>
            <SettingRow
              label="Haptic feedback"
              description="Use tactile cues when selecting options and completing quizzes."
              value={preferences.hapticsEnabled}
              onValueChange={(value) => setPreference("hapticsEnabled", value)}
            />
            <SettingRow
              label="Daily study reminder"
              description="Remind you to complete at least one timed review session."
              value={preferences.dailyReminder}
              onValueChange={(value) => setPreference("dailyReminder", value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Data Controls
            </Text>
            <Text className="text-xs leading-5 text-muted-foreground">
              These actions are local-only in this version and can be connected
              to cloud sync later.
            </Text>
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
                  "Reset progress",
                  "This action will clear local progress history in a future connected version."
                )
              }
            >
              <Text className="font-bold">Reset Progress</Text>
            </Button>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
