import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  Crown,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

function readFirstParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

function toSourceLabel(source: string) {
  if (source === "subject") {
    return "Subject"
  }

  if (source === "topic") {
    return "Topic"
  }

  if (source === "material") {
    return "Learning Material"
  }

  if (source === "quiz-category") {
    return "Quiz Category"
  }

  return "Premium Content"
}

export default function PremiumSubscriptionScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const params = useLocalSearchParams<{
    title?: string | string[]
    source?: string | string[]
    categoryId?: string | string[]
    topicId?: string | string[]
  }>()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const isPremiumUser = profile?.isPremium === true

  const lockedTitle = readFirstParam(params.title) || "premium content"
  const sourceLabel = toSourceLabel(readFirstParam(params.source))
  const categoryId = readFirstParam(params.categoryId)
  const topicId = readFirstParam(params.topicId)

  const premiumHighlights = useMemo(
    () => [
      {
        icon: (
          <BookOpenCheck size={16} color={theme.primary} strokeWidth={2.2} />
        ),
        label: "Unlock all premium lessons and topic tracks",
      },
      {
        icon: <ShieldCheck size={16} color={theme.primary} strokeWidth={2.2} />,
        label: "Access premium-only quiz categories",
      },
      {
        icon: <Sparkles size={16} color={theme.primary} strokeWidth={2.2} />,
        label: "Get the full review library experience",
      },
    ],
    [theme.primary]
  )

  function handleBackToContext() {
    if (topicId) {
      router.push({ pathname: "/learn/topic/[topicId]", params: { topicId } })
      return
    }

    if (categoryId) {
      router.push({
        pathname: "/review/[categoryId]",
        params: { categoryId },
      })
      return
    }

    router.back()
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-4 pb-8 pt-3"
      >
        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-2xl"
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={theme.primary} strokeWidth={2.5} />
          </Pressable>

          <View className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
            <Text className="text-[10px] font-black uppercase tracking-[1.2px] text-primary">
              Premium Access
            </Text>
          </View>
        </View>

        <Card className="overflow-hidden rounded-[28px] border-0">
          <CardContent
            className="gap-3 px-4 py-5"
            style={{ backgroundColor: withOpacity(theme.primary, 0.13) }}
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-background">
              <Crown size={24} color={theme.primary} strokeWidth={2.2} />
            </View>

            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-[1.5px] text-primary">
                Upgrade Plan
              </Text>
              <Text className="text-[24px] font-black leading-8 text-foreground">
                {isPremiumUser
                  ? "Premium is active"
                  : "Become a Premium Learner"}
              </Text>
              <Text className="text-[13px] leading-6 text-muted-foreground">
                {isPremiumUser
                  ? "Your account already has premium access. Continue and open all locked content."
                  : "You tapped a locked item. Upgrade your plan to unlock premium-only materials and full quiz coverage."}
              </Text>
            </View>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardContent className="gap-2.5 px-4 py-4">
            <View className="flex-row items-center gap-2">
              <LockKeyhole size={16} color={theme.primary} strokeWidth={2.2} />
              <Text className="text-sm font-black text-card-foreground">
                Locked Item
              </Text>
            </View>
            <Text className="text-[13px] leading-5 text-muted-foreground">
              {sourceLabel}: {lockedTitle}
            </Text>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-sm font-black text-card-foreground">
              What Premium Includes
            </Text>

            <View className="gap-2.5">
              {premiumHighlights.map((item) => (
                <View key={item.label} className="flex-row items-start gap-2.5">
                  <View className="mt-0.5">{item.icon}</View>
                  <Text className="flex-1 text-[13px] leading-6 text-muted-foreground">
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>

        {!isPremiumUser ? (
          <View className="gap-2.5">
            <Button
              className="h-11 rounded-2xl"
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Crown
                size={16}
                color={theme.primaryForeground}
                strokeWidth={2.2}
              />
              <Text className="font-bold text-primary-foreground">
                Go to Profile and Upgrade
              </Text>
            </Button>

            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={handleBackToContext}
            >
              <Text className="font-bold">Not now</Text>
            </Button>
          </View>
        ) : (
          <View className="gap-2.5">
            <View className="flex-row items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-3 py-2.5">
              <Check size={15} color={theme.primary} strokeWidth={2.4} />
              <Text className="text-xs font-bold text-primary">
                Premium account confirmed
              </Text>
            </View>

            <Button className="h-11 rounded-2xl" onPress={handleBackToContext}>
              <Text className="font-bold text-primary-foreground">
                Continue to Content
              </Text>
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
