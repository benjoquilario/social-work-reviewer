import { memo } from "react"
import LogOut from "lucide-react-native/icons/log-out"
import Trash2 from "lucide-react-native/icons/trash-2"
import TriangleAlert from "lucide-react-native/icons/triangle-alert"
import { View } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

/**
 * Sign out, and the one action that cannot be undone.
 *
 * Tinted rather than merely labelled, and last on the screen. Deletion opens a
 * dialog that asks the member to type the word — a second tap is not a
 * confirmation, it is a reflex.
 */

type DangerZoneSectionProps = {
  isLoggingOut: boolean
  canDelete: boolean
  onSignOut: () => void
  onDeleteAccount: () => void
}

export const DangerZoneSection = memo(function DangerZoneSection({
  isLoggingOut,
  canDelete,
  onSignOut,
  onDeleteAccount,
}: DangerZoneSectionProps) {
  const theme = useThemePalette()

  return (
    <Card className="border-destructive/25 bg-destructive/5">
      <CardContent className="gap-3">
        <View className="flex-row items-start gap-3">
          <TriangleAlert size={18} color={theme.destructive} strokeWidth={2.3} />
          <View className="flex-1 gap-0.5">
            <Text variant="subheading">Danger zone</Text>
            <Text variant="caption">
              Sign out, or remove your account and everything on it.
            </Text>
          </View>
        </View>

        <Button
          variant="outline"
          disabled={isLoggingOut}
          onPress={onSignOut}
          style={{
            borderColor: withOpacity(theme.destructive, 0.35),
            backgroundColor: withOpacity(theme.destructive, 0.07),
          }}
        >
          <LogOut size={16} color={theme.destructive} strokeWidth={2.2} />
          <Text style={{ color: theme.destructive }} className="font-bold">
            {isLoggingOut ? "Signing out…" : "Sign out"}
          </Text>
        </Button>

        <Button variant="destructive" onPress={onDeleteAccount}>
          <Trash2
            size={16}
            color={theme.destructiveForeground}
            strokeWidth={2.2}
          />
          <Text className="font-bold text-destructive-foreground">
            Delete account
          </Text>
        </Button>

        {!canDelete ? (
          <Text variant="caption">
            Account deletion needs the Appwrite function configured — set
            EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID before shipping.
          </Text>
        ) : null}
      </CardContent>
    </Card>
  )
})
