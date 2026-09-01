import { memo } from "react"
import KeyRound from "lucide-react-native/icons/key-round"
import MailCheck from "lucide-react-native/icons/mail-check"
import Stethoscope from "lucide-react-native/icons/stethoscope"
import { useThemePalette } from "@/hooks/use-theme"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { SettingsSection } from "./settings-section"

/**
 * Email, password, and the diagnostics escape hatch.
 *
 * "Send verification email" appears only while the address is unverified — a
 * permanently visible button for something already done is noise, and worse,
 * it makes a member wonder whether it *did* work.
 */

type AccountSectionProps = {
  email: string
  isEmailVerified: boolean
  onChangeEmail: () => void
  onChangePassword: () => void
  onSendVerification: () => void
  onOpenDiagnostics: () => void
}

export const AccountSection = memo(function AccountSection({
  email,
  isEmailVerified,
  onChangeEmail,
  onChangePassword,
  onSendVerification,
  onOpenDiagnostics,
}: AccountSectionProps) {
  const theme = useThemePalette()

  return (
    <SettingsSection
      title="Account"
      description={email || "Signed in"}
    >
      <Button
        variant="outline"
        className="h-11 justify-start"
        onPress={onChangeEmail}
      >
        <MailCheck size={16} color={theme.primary} strokeWidth={2.2} />
        <Text className="font-bold">Change email address</Text>
      </Button>

      <Button
        variant="outline"
        className="h-11 justify-start"
        onPress={onChangePassword}
      >
        <KeyRound size={16} color={theme.primary} strokeWidth={2.2} />
        <Text className="font-bold">Change password</Text>
      </Button>

      {!isEmailVerified ? (
        <Button
          variant="outline"
          className="h-11 justify-start"
          onPress={onSendVerification}
        >
          <MailCheck size={16} color={theme.accentText} strokeWidth={2.2} />
          <Text className="font-bold">Send verification email</Text>
        </Button>
      ) : null}

      <Button
        variant="ghost"
        className="h-11 justify-start"
        onPress={onOpenDiagnostics}
      >
        <Stethoscope size={16} color={theme.mutedForeground} strokeWidth={2.2} />
        <Text className="font-bold">Run connection diagnostics</Text>
      </Button>
    </SettingsSection>
  )
})
