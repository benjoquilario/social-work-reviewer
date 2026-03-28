import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "expo-router"
import {
  ChevronLeft,
  KeyRound,
  MailCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react-native"
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppPreferences, type ThemeMode } from "@/lib/app-preferences"
import { APPWRITE_CONFIG } from "@/lib/appwrite"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

function SettingsInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = "none",
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  secureTextEntry?: boolean
  autoCapitalize?: "none" | "sentences" | "words" | "characters"
}) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light

  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedForeground}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        className="rounded-2xl border px-4 py-3 text-sm text-foreground"
        style={{
          minHeight: 52,
          borderColor: theme.border,
          backgroundColor: isDark ? "hsl(240 10% 14%)" : "hsl(243 30% 97%)",
          fontFamily: "PlusJakartaSans_500Medium",
          color: theme.foreground,
        }}
      />
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
  const {
    user,
    logout,
    updateEmail,
    sendVerificationEmail,
    changePassword,
    deleteAccount,
  } = useAuth()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [emailDraft, setEmailDraft] = useState(user?.email ?? "")
  const [emailPassword, setEmailPassword] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [nextPassword, setNextPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  useEffect(() => {
    setEmailDraft(user?.email ?? "")
  }, [user?.email])

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

  async function handleChangeEmail() {
    setIsSubmittingEmail(true)

    try {
      await updateEmail({
        email: emailDraft,
        currentPassword: emailPassword,
      })
      setIsEmailDialogOpen(false)
      setEmailPassword("")
      Alert.alert(
        "Email updated",
        "Your email address was updated. Send a new verification message if needed."
      )
    } catch (error) {
      Alert.alert(
        "Email update failed",
        error instanceof Error ? error.message : "Unable to update your email."
      )
    } finally {
      setIsSubmittingEmail(false)
    }
  }

  async function handleChangePassword() {
    if (nextPassword !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Confirm your new password exactly."
      )
      return
    }

    setIsSubmittingPassword(true)

    try {
      await changePassword(currentPassword, nextPassword)
      setIsPasswordDialogOpen(false)
      setCurrentPassword("")
      setNextPassword("")
      setConfirmPassword("")
      Alert.alert("Password updated", "Your password has been changed.")
    } catch (error) {
      Alert.alert(
        "Password update failed",
        error instanceof Error
          ? error.message
          : "Unable to change your password right now."
      )
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  async function handleSendVerification() {
    try {
      await sendVerificationEmail()
      Alert.alert(
        "Verification sent",
        "Check your inbox and complete the Appwrite verification link on this device."
      )
    } catch (error) {
      Alert.alert(
        "Unable to send verification",
        error instanceof Error
          ? error.message
          : "Verification email could not be sent."
      )
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      Alert.alert(
        "Confirmation required",
        "Type DELETE to confirm account removal."
      )
      return
    }

    setIsDeletingAccount(true)

    try {
      await deleteAccount()
    } catch (error) {
      Alert.alert(
        "Delete account failed",
        error instanceof Error
          ? error.message
          : "Unable to delete the account right now."
      )
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-4 pb-28 pt-5"
      >
        <View className="gap-3">
          <View className="flex-row items-start justify-between gap-3">
            <Pressable
              className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card"
              onPress={() => router.back()}
            >
              <ChevronLeft size={18} color={theme.primary} strokeWidth={2.5} />
            </Pressable>
            <View className="flex-1 gap-1">
              <Text className="text-[11px] font-black uppercase tracking-[1.8px] text-primary">
                Preferences & Security
              </Text>
              <Text className="text-[24px] font-black leading-tight text-foreground">
                Settings
              </Text>
              <Text className="text-[13px] leading-6 text-muted-foreground">
                Control app behavior, account security, diagnostics, and
                danger-zone actions.
              </Text>
            </View>
          </View>
        </View>

        <Card className="rounded-[28px]">
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Account Security
            </Text>
            <Button
              variant="outline"
              className="h-11 justify-start rounded-2xl px-4"
              onPress={() => setIsEmailDialogOpen(true)}
            >
              <MailCheck size={16} color={theme.primary} strokeWidth={2.2} />
              <Text className="font-bold">Change email address</Text>
            </Button>
            <Button
              variant="outline"
              className="h-11 justify-start rounded-2xl px-4"
              onPress={() => setIsPasswordDialogOpen(true)}
            >
              <KeyRound size={16} color={theme.primary} strokeWidth={2.2} />
              <Text className="font-bold">Change password</Text>
            </Button>
            {!user?.emailVerification ? (
              <Button
                variant="outline"
                className="h-11 justify-start rounded-2xl px-4"
                onPress={() => void handleSendVerification()}
              >
                <MailCheck size={16} color={theme.primary} strokeWidth={2.2} />
                <Text className="font-bold">Send verification email</Text>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[28px]">
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

        <Card className="rounded-[28px]">
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Quiz Experience
            </Text>
            <SettingRow
              label="Show answer explanations"
              description="Display rationale after submitting a timed session."
              value={preferences.showExplanations}
              onValueChange={(value) =>
                setPreference("showExplanations", value)
              }
            />
            <SettingRow
              label="Enable strict mode"
              description="Lock answer changes after moving to next question."
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

        <Card className="rounded-[28px]">
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Accessibility & Focus
            </Text>
            <SettingRow
              label="Haptic feedback"
              description="Tactile cues when selecting options."
              value={preferences.hapticsEnabled}
              onValueChange={(value) => setPreference("hapticsEnabled", value)}
            />
            <SettingRow
              label="Daily study reminder"
              description="Remind you to complete at least one review session."
              value={preferences.dailyReminder}
              onValueChange={(value) => setPreference("dailyReminder", value)}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px]">
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Data & Diagnostics
            </Text>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={() => router.push("/diagnostics")}
            >
              <Text className="font-bold">Run Appwrite diagnostics</Text>
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={() => resetPreferences()}
            >
              <Text className="font-bold">Restore defaults</Text>
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={() =>
                Alert.alert(
                  "Reset Progress",
                  "This currently clears only local progress handling. Connect it to your remote progress model before shipping a real reset flow."
                )
              }
            >
              <Text className="font-bold">Reset local progress</Text>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
          <CardContent className="gap-3 px-4 py-4">
            <View className="flex-row items-start gap-3">
              <TriangleAlert
                size={18}
                color={theme.destructive}
                strokeWidth={2.3}
              />
              <View className="flex-1 gap-1">
                <Text className="text-base font-black text-card-foreground">
                  Danger Zone
                </Text>
                <Text className="text-[13px] leading-6 text-muted-foreground">
                  Sign out safely or permanently remove your account.
                </Text>
              </View>
            </View>

            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={() => void handleLogout()}
              disabled={isLoggingOut}
              style={
                {
                  borderColor: "hsl(0 84% 60% / 0.35)",
                  backgroundColor: "hsl(0 84% 60% / 0.07)",
                } as never
              }
            >
              <Text style={{ color: theme.destructive }} className="font-bold">
                {isLoggingOut ? "Signing out…" : "Sign out"}
              </Text>
            </Button>

            <Button
              variant="destructive"
              className="h-11 rounded-2xl"
              onPress={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2
                size={16}
                color={theme.destructiveForeground}
                strokeWidth={2.2}
              />
              <Text className="font-bold text-destructive-foreground">
                Delete account
              </Text>
            </Button>

            {!APPWRITE_CONFIG.accountDeleteFunctionId ? (
              <Text className="text-[12px] leading-6 text-muted-foreground">
                Deploy the account deletion Appwrite Function and set
                EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID before shipping
                this action.
              </Text>
            ) : null}
          </CardContent>
        </Card>
      </ScrollView>

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              Changing your email resets verification. Appwrite requires your
              current password.
            </DialogDescription>
          </DialogHeader>

          <View className="gap-3">
            <SettingsInput
              label="New email"
              value={emailDraft}
              onChangeText={setEmailDraft}
              placeholder="name@example.com"
            />
            <SettingsInput
              label="Current password"
              value={emailPassword}
              onChangeText={setEmailPassword}
              placeholder="Enter current password"
              secureTextEntry
            />
          </View>

          <DialogFooter>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={() => setIsEmailDialogOpen(false)}
            >
              <Text className="font-bold">Cancel</Text>
            </Button>
            <Button
              className="h-11 rounded-2xl"
              onPress={() => void handleChangeEmail()}
              disabled={isSubmittingEmail}
            >
              <Text className="font-bold text-primary-foreground">
                {isSubmittingEmail ? "Saving…" : "Update email"}
              </Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Use a new password with at least 8 characters.
            </DialogDescription>
          </DialogHeader>

          <View className="gap-3">
            <SettingsInput
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              secureTextEntry
            />
            <SettingsInput
              label="New password"
              value={nextPassword}
              onChangeText={setNextPassword}
              placeholder="Enter new password"
              secureTextEntry
            />
            <SettingsInput
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              secureTextEntry
            />
          </View>

          <DialogFooter>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={() => setIsPasswordDialogOpen(false)}
            >
              <Text className="font-bold">Cancel</Text>
            </Button>
            <Button
              className="h-11 rounded-2xl"
              onPress={() => void handleChangePassword()}
              disabled={isSubmittingPassword}
            >
              <Text className="font-bold text-primary-foreground">
                {isSubmittingPassword ? "Saving…" : "Update password"}
              </Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent. Type DELETE to confirm and remove your
              account through Appwrite.
            </DialogDescription>
          </DialogHeader>

          <View className="gap-3">
            <SettingsInput
              label="Confirmation"
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="Type DELETE"
              autoCapitalize="characters"
            />
          </View>

          <DialogFooter>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={() => setIsDeleteDialogOpen(false)}
            >
              <Text className="font-bold">Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              className="h-11 rounded-2xl"
              onPress={() => void handleDeleteAccount()}
              disabled={isDeletingAccount}
            >
              <Text className="font-bold text-destructive-foreground">
                {isDeletingAccount ? "Deleting…" : "Delete account"}
              </Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  )
}
