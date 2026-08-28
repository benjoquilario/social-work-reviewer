import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  BookOpenCheck,
  Check,
  Crown,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { ScreenHeader } from "@/components/screen-header"

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

  if (source === "exam") {
    return "Exam"
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
  const profile = useAuth((state) => state.profile)
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
  const monthlyPricePhp = 300
  const yearlyBasePhp = monthlyPricePhp * 12
  const yearlyDiscountRate = 0.2
  const yearlyDiscountPhp = yearlyBasePhp * yearlyDiscountRate
  const yearlyPricePhp = yearlyBasePhp - yearlyDiscountPhp
  const effectiveMonthlyPhp = yearlyPricePhp / 12

  const lockedTitle = readFirstParam(params.title) || "premium content"
  const source = readFirstParam(params.source)
  const sourceLabel = toSourceLabel(source)
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
        label: "Access premium-only exams and quiz categories",
      },
      {
        icon: <Sparkles size={16} color={theme.primary} strokeWidth={2.2} />,
        label: "Get the full review library experience",
      },
    ],
    [theme.primary]
  )

  const pricingOptions = useMemo(
    () => [
      {
        id: "monthly",
        badge: "Monthly",
        headline: `PHP ${monthlyPricePhp}`,
        subheadline: "per month",
        detail: "Flexible access for one billing cycle at a time.",
      },
      {
        id: "yearly",
        badge: "Annual",
        headline: `PHP ${yearlyPricePhp}`,
        subheadline: "per year",
        detail: `20% off. Save PHP ${yearlyDiscountPhp} and average PHP ${effectiveMonthlyPhp}/month.`,
      },
    ],
    [effectiveMonthlyPhp, monthlyPricePhp, yearlyDiscountPhp, yearlyPricePhp]
  )

  function handleBackToContext() {
    if (topicId) {
      router.push({ pathname: "/learn/topic/[topicId]", params: { topicId } })
      return
    }

    if (categoryId && (source === "exam" || source === "quiz-category")) {
      router.push({ pathname: "/board-exams" })
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
        contentContainerClassName="gap-4 px-4 pb-8"
      >
        <ScreenHeader
          title="Premium"
          trailing={
            <View className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
              <Text variant="eyebrow">
                Premium Access
              </Text>
            </View>
          }
        />

        <Card className="overflow-hidden rounded-xl border-0">
          <CardContent
            className="gap-4 px-4 py-5"
            style={{ backgroundColor: withOpacity(theme.primary, 0.13) }}
          >
            <View className="h-12 w-12 items-center justify-center rounded-md bg-background">
              <Crown size={24} color={theme.primary} strokeWidth={2.2} />
            </View>

            <View className="gap-1.5">
              <Text variant="eyebrow">
                Premium Reviewer Access
              </Text>
              <Text className="text-2xl font-black leading-8 text-foreground">
                {isPremiumUser
                  ? "Premium is active"
                  : "Unlock the full reviewer library"}
              </Text>
              <Text className="text-sm leading-6 text-muted-foreground">
                {isPremiumUser
                  ? "Your account already has premium access. Continue and open all locked content."
                  : "Free users can browse the catalog, but premium unlocks locked lessons, topic tracks, and the full exam library."}
              </Text>
            </View>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardContent className="gap-2.5">
            <View className="flex-row items-center gap-2">
              <LockKeyhole size={16} color={theme.primary} strokeWidth={2.2} />
              <Text className="text-sm font-black text-card-foreground">
                Locked Item
              </Text>
            </View>
            <Text className="text-sm leading-5 text-muted-foreground">
              {sourceLabel}: {lockedTitle}
            </Text>
          </CardContent>
        </Card>

        <View className="gap-3">
          {pricingOptions.map((option) => (
            <Card key={option.id} className="rounded-lg">
              <CardContent className="gap-3">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="gap-1">
                    <View
                      className="self-start rounded-full px-2.5 py-1"
                      style={{
                        backgroundColor: withOpacity(
                          option.id === "yearly" ? theme.primary : theme.accent,
                          0.12
                        ),
                      }}
                    >
                      <Text
                        className="text-2xs font-bold uppercase tracking-[1px]"
                        style={{
                          color:
                            option.id === "yearly"
                              ? theme.primary
                              : theme.accent,
                        }}
                      >
                        {option.badge}
                      </Text>
                    </View>
                    <Text className="text-xl font-black text-card-foreground">
                      {option.headline}
                    </Text>
                    <Text className="text-xs font-semibold text-muted-foreground">
                      {option.subheadline}
                    </Text>
                  </View>

                  {option.id === "yearly" ? (
                    <View className="rounded-full bg-primary/10 px-2.5 py-1">
                      <Text variant="eyebrow">
                        Best value
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text className="text-sm leading-5 text-muted-foreground">
                  {option.detail}
                </Text>
              </CardContent>
            </Card>
          ))}
        </View>

        <Card className="rounded-lg">
          <CardContent className="gap-3">
            <Text className="text-sm font-black text-card-foreground">
              What Premium Includes
            </Text>

            <View className="gap-2.5">
              {premiumHighlights.map((item) => (
                <View key={item.label} className="flex-row items-start gap-2.5">
                  <View className="mt-0.5">{item.icon}</View>
                  <Text className="flex-1 text-sm leading-6 text-muted-foreground">
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
              className="h-11 rounded-md"
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Crown
                size={16}
                color={theme.primaryForeground}
                strokeWidth={2.2}
              />
              <Text className="font-bold text-primary-foreground">
                Continue to Upgrade
              </Text>
            </Button>

            <Button
              variant="outline"
              className="h-11 rounded-md"
              onPress={handleBackToContext}
            >
              <Text className="font-bold">Not now</Text>
            </Button>
          </View>
        ) : (
          <View className="gap-2.5">
            <View className="flex-row items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5">
              <Check size={15} color={theme.primary} strokeWidth={2.4} />
              <Text className="text-xs font-bold text-primary">
                Premium account confirmed
              </Text>
            </View>

            <Button className="h-11 rounded-md" onPress={handleBackToContext}>
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
