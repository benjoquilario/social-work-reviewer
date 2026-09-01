import { memo } from "react"
import MailWarning from "lucide-react-native/icons/mail-warning"
import { View } from "react-native"

import type { ThemePalette } from "@/lib/theme"
import { getToneColor, TONE_SURFACE_CLASS } from "@/lib/tone"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

/**
 * Reads "you are N% done and here is what is left".
 *
 * Renders only while the profile is incomplete — at 100% it has nothing to
 * say, and a card that only ever congratulates you is a card that costs a
 * scroll. The three summary tiles that used to sit beside this (Plan / Email /
 * Profile %) all repeated numbers already on screen, so they are gone.
 */
export const ProfileCompletionCard = memo(function ProfileCompletionCard({
  completion,
  missingFields,
}: {
  completion: number
  missingFields: string[]
}) {
  if (missingFields.length === 0) {
    return null
  }

  return (
    <Card>
      <CardContent className="gap-3">
        <View className="flex-row items-end justify-between gap-3">
          <View className="gap-0.5">
            <Text variant="label">Profile strength</Text>
            <Text className="text-2xl font-black leading-7">{completion}%</Text>
          </View>

          <Badge tone="warning" size="sm">
            {`${missingFields.length} to add`}
          </Badge>
        </View>

        <View
          className="h-2 overflow-hidden rounded-full bg-muted"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: completion }}
        >
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.max(2, Math.min(100, completion))}%` }}
          />
        </View>

        <Text variant="caption">
          Still missing: {missingFields.join(", ")}.
        </Text>
      </CardContent>
    </Card>
  )
})

/**
 * Unverified email is the only account state worth interrupting for, so this
 * is the only banner. The old card also rendered when verification had already
 * succeeded, which meant most accounts carried a permanent "Email Verified"
 * row that could never be acted on.
 */
export const ProfileVerifyEmailCard = memo(function ProfileVerifyEmailCard({
  theme,
  email,
  isSending,
  onSendVerification,
}: {
  theme: ThemePalette
  email: string
  isSending: boolean
  onSendVerification: () => void
}) {
  return (
    <Card className={cn("border", TONE_SURFACE_CLASS.warning)}>
      <CardContent size="compact" className="flex-row items-center gap-3">
        <MailWarning size={20} color={getToneColor(theme, "warning")} />

        <View className="flex-1 gap-0.5">
          <Text variant="subheading">Verify your email</Text>
          <Text variant="caption" numberOfLines={1}>
            {email || "Confirm your address to secure the account."}
          </Text>
        </View>

        <Button
          size="sm"
          variant="outline"
          disabled={isSending}
          accessibilityLabel="Send verification email"
          onPress={onSendVerification}
        >
          <Text>{isSending ? "Sending…" : "Send"}</Text>
        </Button>
      </CardContent>
    </Card>
  )
})
