import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { BadgeCheck, CircleAlert, LoaderCircle } from "lucide-react-native"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"

type VerificationState = "loading" | "success" | "error"

export default function VerifyEmailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ userId?: string; secret?: string }>()
  const { completeEmailVerification, isAuthenticated } = useAuth()
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light
  const [state, setState] = useState<VerificationState>("loading")
  const [message, setMessage] = useState(
    "We are confirming your Appwrite email verification now."
  )

  useEffect(() => {
    let cancelled = false

    async function runVerification() {
      const userId = typeof params.userId === "string" ? params.userId : ""
      const secret = typeof params.secret === "string" ? params.secret : ""

      if (!userId || !secret) {
        if (!cancelled) {
          setState("error")
          setMessage(
            "This verification link is missing the required Appwrite parameters."
          )
        }
        return
      }

      try {
        await completeEmailVerification(userId, secret)
        if (!cancelled) {
          setState("success")
          setMessage("Your email has been verified successfully.")
        }
      } catch (error) {
        if (!cancelled) {
          setState("error")
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to complete email verification."
          )
        }
      }
    }

    void runVerification()

    return () => {
      cancelled = true
    }
  }, [completeEmailVerification, params.secret, params.userId])

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-5 px-6">
        <View className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-[24px] bg-primary/10">
            {state === "loading" ? (
              <LoaderCircle size={28} color={theme.primary} strokeWidth={2.2} />
            ) : state === "success" ? (
              <BadgeCheck size={28} color={theme.success} strokeWidth={2.2} />
            ) : (
              <CircleAlert size={28} color={theme.warning} strokeWidth={2.2} />
            )}
          </View>

          <Text className="text-center text-[24px] font-black text-foreground">
            {state === "loading"
              ? "Verifying email"
              : state === "success"
                ? "Email verified"
                : "Verification failed"}
          </Text>
          <Text className="text-center text-[13px] leading-6 text-muted-foreground">
            {message}
          </Text>
        </View>

        {state === "success" ? (
          <Button
            className="h-11 w-full rounded-2xl"
            onPress={() => router.replace("/(tabs)/profile")}
          >
            <Text className="font-bold text-primary-foreground">
              Return to profile
            </Text>
          </Button>
        ) : null}

        {state === "error" ? (
          <Button
            variant="outline"
            className="h-11 w-full rounded-2xl"
            onPress={() =>
              router.replace(
                isAuthenticated ? "/(tabs)/profile" : "/(auth)/login"
              )
            }
          >
            <Text className="font-bold">
              {isAuthenticated ? "Back to profile" : "Go to login"}
            </Text>
          </Button>
        ) : null}
      </View>
    </SafeAreaView>
  )
}
