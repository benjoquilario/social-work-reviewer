import { useEffect, useMemo, useState } from "react"
import { useLocalSearchParams } from "expo-router"
import { ActivityIndicator, Linking, Platform, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { APPWRITE_CONFIG } from "@/lib/appwrite"
import { Text } from "@/components/ui/text"

export default function VerifyEmailBridgeScreen() {
  const params = useLocalSearchParams<{ userId?: string; secret?: string }>()
  const [message, setMessage] = useState(
    "Preparing secure verification handoff to the app."
  )

  const targetUrl = useMemo(() => {
    const userId = typeof params.userId === "string" ? params.userId : ""
    const secret = typeof params.secret === "string" ? params.secret : ""

    if (!userId || !secret) {
      return ""
    }

    const query = new URLSearchParams({ userId, secret }).toString()
    return `${APPWRITE_CONFIG.appScheme}://verify-email?${query}`
  }, [params.secret, params.userId])

  useEffect(() => {
    if (!targetUrl) {
      setMessage(
        "This verification link is missing the required Appwrite parameters."
      )
      return
    }

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.replace(targetUrl)
      return
    }

    void Linking.openURL(targetUrl).catch(() => {
      setMessage(
        "Unable to open the app automatically. Return to Reviewer and complete verification there."
      )
    })
  }, [targetUrl])

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <ActivityIndicator size="large" />
        <Text className="text-center text-[22px] font-black text-foreground">
          Opening Reviewer
        </Text>
        <Text className="text-center text-[13px] leading-6 text-muted-foreground">
          {message}
        </Text>
      </View>
    </SafeAreaView>
  )
}
