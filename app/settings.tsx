import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "expo-router"
import { Alert, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppPreferences, type ThemeMode } from "@/lib/app-preferences"
import { APPWRITE_CONFIG } from "@/lib/appwrite"
import type { MemberSettings } from "@/lib/member/settings"
import { useMemberSettings } from "@/hooks/use-member-settings"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormField, Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { ScreenHeader } from "@/components/screen-header"
import { AccountSection } from "@/components/settings/account-section"
import { AppearanceSection } from "@/components/settings/appearance-section"
import { DangerZoneSection } from "@/components/settings/danger-zone-section"
import { HelpSection } from "@/components/settings/help-section"
import {
  NotificationSection,
  ReminderSection,
} from "@/components/settings/reminder-section"
import { StudyPreferencesSection } from "@/components/settings/study-preferences-section"

/**
 * ─── Settings ─────────────────────────────────────────────────────────────
 *
 * Almost everything here is a column on `user_settings`, so it follows the
 * member to a new phone and the app never invents a default — they come from
 * the schema (section 8).
 *
 * The exception is `themeMode`, which is written to both: the local store
 * because the first frame has to be painted before any network call, and the
 * stored one because a fresh install should come back to the theme they chose.
 */

export default function SettingsScreen() {
  const router = useRouter()

  const { settings, isLoading, update } = useMemberSettings()
  const themeMode = useAppPreferences((state) => state.preferences.themeMode)
  const setThemeMode = useAppPreferences((state) => state.setThemeMode)

  const user = useAuth((state) => state.user)
  const logout = useAuth((state) => state.logout)
  const updateEmail = useAuth((state) => state.updateEmail)
  const sendVerificationEmail = useAuth((state) => state.sendVerificationEmail)
  const changePassword = useAuth((state) => state.changePassword)
  const deleteAccount = useAuth((state) => state.deleteAccount)

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [openDialog, setOpenDialog] = useState<
    "email" | "password" | "delete" | null
  >(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [emailDraft, setEmailDraft] = useState(user?.email ?? "")
  const [emailPassword, setEmailPassword] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [nextPassword, setNextPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  useEffect(() => {
    setEmailDraft(user?.email ?? "")
  }, [user?.email])

  /**
   * The stored theme wins on a fresh install, where the local store is at its
   * default. Once they have chosen on this device, the local value is already
   * the same one — so this is a one-way catch-up, not a loop.
   */
  useEffect(() => {
    if (!isLoading && settings.theme !== themeMode) {
      setThemeMode(settings.theme as ThemeMode)
    }
    // Only on the first resolved read: a later local change must not be
    // reverted by the value it is about to replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  const handleChange = useCallback(
    (patch: Partial<MemberSettings>) => update(patch),
    [update]
  )

  const closeDialog = useCallback(() => setOpenDialog(null), [])

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign out", "You will need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
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
  }, [logout])

  const handleChangeEmail = useCallback(async () => {
    setIsSubmitting(true)

    try {
      await updateEmail({ email: emailDraft, currentPassword: emailPassword })
      closeDialog()
      setEmailPassword("")
      Alert.alert(
        "Email updated",
        "Verify the new address to keep receiving account mail."
      )
    } catch (error) {
      Alert.alert(
        "Email update failed",
        error instanceof Error ? error.message : "Unable to update your email."
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [closeDialog, emailDraft, emailPassword, updateEmail])

  const handleChangePassword = useCallback(async () => {
    if (nextPassword !== confirmPassword) {
      Alert.alert("Passwords do not match", "Confirm your new password exactly.")
      return
    }

    setIsSubmitting(true)

    try {
      await changePassword(currentPassword, nextPassword)
      closeDialog()
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
      setIsSubmitting(false)
    }
  }, [changePassword, closeDialog, confirmPassword, currentPassword, nextPassword])

  const handleSendVerification = useCallback(async () => {
    try {
      await sendVerificationEmail()
      Alert.alert(
        "Verification sent",
        "Open the link on this device to finish verifying."
      )
    } catch (error) {
      Alert.alert(
        "Unable to send verification",
        error instanceof Error
          ? error.message
          : "The verification email could not be sent."
      )
    }
  }, [sendVerificationEmail])

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      Alert.alert("Confirmation required", "Type DELETE to confirm.")
      return
    }

    setIsSubmitting(true)

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
      setIsSubmitting(false)
    }
  }, [deleteAccount, deleteConfirmation])

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-4 pb-28 pt-2"
      >
        <ScreenHeader title="Settings" />

        {isLoading ? (
          <View className="gap-3">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </View>
        ) : (
          <>
            <StudyPreferencesSection
              settings={settings}
              onChange={handleChange}
            />

            <ReminderSection settings={settings} onChange={handleChange} />

            <NotificationSection settings={settings} onChange={handleChange} />

            <AppearanceSection
              settings={settings}
              themeMode={themeMode}
              onChangeSettings={handleChange}
              onChangeThemeMode={setThemeMode}
            />
          </>
        )}

        <HelpSection
          onReplayOnboarding={() =>
            router.push({
              pathname: "/onboarding",
              params: { replay: "1" },
            })
          }
        />

        <AccountSection
          email={user?.email ?? ""}
          isEmailVerified={user?.emailVerification === true}
          onChangeEmail={() => setOpenDialog("email")}
          onChangePassword={() => setOpenDialog("password")}
          onSendVerification={() => void handleSendVerification()}
          onOpenDiagnostics={() => router.push("/diagnostics")}
        />

        <DangerZoneSection
          isLoggingOut={isLoggingOut}
          canDelete={Boolean(APPWRITE_CONFIG.accountDeleteFunctionId)}
          onSignOut={handleSignOut}
          onDeleteAccount={() => setOpenDialog("delete")}
        />
      </ScrollView>

      <Dialog open={openDialog === "email"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change email</DialogTitle>
            <DialogDescription>
              Changing your address resets verification, and your current
              password is required.
            </DialogDescription>
          </DialogHeader>

          <View className="gap-3">
            <FormField label="New email">
              <Input
                value={emailDraft}
                onChangeText={setEmailDraft}
                placeholder="name@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </FormField>
            <FormField label="Current password">
              <Input
                value={emailPassword}
                onChangeText={setEmailPassword}
                placeholder="Enter your current password"
                secureTextEntry
              />
            </FormField>
          </View>

          <DialogFooter className="flex-row">
            <Button variant="outline" className="flex-1" onPress={closeDialog}>
              <Text>Cancel</Text>
            </Button>
            <Button
              className="flex-1"
              disabled={isSubmitting}
              onPress={() => void handleChangeEmail()}
            >
              <Text>{isSubmitting ? "Saving…" : "Update"}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "password"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Use at least 8 characters.
            </DialogDescription>
          </DialogHeader>

          <View className="gap-3">
            <FormField label="Current password">
              <Input
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
                secureTextEntry
              />
            </FormField>
            <FormField label="New password">
              <Input
                value={nextPassword}
                onChangeText={setNextPassword}
                placeholder="Enter a new password"
                secureTextEntry
              />
            </FormField>
            <FormField label="Confirm new password">
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter the new password"
                secureTextEntry
              />
            </FormField>
          </View>

          <DialogFooter className="flex-row">
            <Button variant="outline" className="flex-1" onPress={closeDialog}>
              <Text>Cancel</Text>
            </Button>
            <Button
              className="flex-1"
              disabled={isSubmitting}
              onPress={() => void handleChangePassword()}
            >
              <Text>{isSubmitting ? "Saving…" : "Update"}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "delete"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This removes your account, your answers, and your progress. It
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <FormField label="Type DELETE to confirm">
            <Input
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="DELETE"
              autoCapitalize="characters"
            />
          </FormField>

          <DialogFooter className="flex-row">
            <Button variant="outline" className="flex-1" onPress={closeDialog}>
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={isSubmitting}
              onPress={() => void handleDeleteAccount()}
            >
              <Text>{isSubmitting ? "Deleting…" : "Delete"}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  )
}
