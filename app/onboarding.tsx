import { useRef, useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  BookOpenText,
  ListChecks,
  TrendingUp,
  type LucideIcon,
} from "lucide-react-native"
import {
  FlatList,
  Pressable,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppPreferences } from "@/lib/app-preferences"
import { useTheme } from "@/hooks/use-theme"
import { BrandLogo } from "@/components/ui/brand-logo"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"

type OnboardingSlide = {
  key: string
  icon: LucideIcon
  badge: string
  title: string
  description: string
}

const SLIDES: OnboardingSlide[] = [
  {
    key: "learn",
    icon: BookOpenText,
    badge: "Curated reviewers",
    title: "Study smarter, not longer",
    description:
      "Bite-sized lessons and curated reviewers built for the Social Work Licensure Exam, organized by topic so nothing falls through the cracks.",
  },
  {
    key: "drill",
    icon: ListChecks,
    badge: "Board-exam drills",
    title: "Drill like it's exam day",
    description:
      "Timed board-exam sets and practice quizzes with detailed explanations for every answer — so every mistake becomes a lesson.",
  },
  {
    key: "progress",
    icon: TrendingUp,
    badge: "Progress & community",
    title: "See your progress climb",
    description:
      "Track your scores, keep your study streak alive, and learn together with a community preparing for the same exam.",
  },
]

export default function OnboardingScreen() {
  const router = useRouter()
  /**
   * Replayed from Settings rather than shown before the first sign-in.
   *
   * The slides are the same; what changes is where the exits go. A first run
   * ends by handing somebody to register or login, because that is the next
   * thing they need. A replay ends by putting them back where they were — a
   * member three weeks in who taps "How this app works" and lands on a login
   * screen has been thrown out of their own app.
   */
  const { replay } = useLocalSearchParams<{ replay?: string }>()
  const isReplay = replay === "1"
  const { theme } = useTheme()
  const setPreference = useAppPreferences((state) => state.setPreference)
  const { width } = useWindowDimensions()
  const listRef = useRef<FlatList<OnboardingSlide>>(null)
  const [index, setIndex] = useState(0)

  const isLastSlide = index === SLIDES.length - 1

  function finish(target: "/(auth)/register" | "/(auth)/login") {
    if (isReplay) {
      router.back()
      return
    }

    setPreference("hasCompletedOnboarding", true)
    router.replace(target)
  }

  function handleNext() {
    if (isLastSlide) {
      finish("/(auth)/register")
      return
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true })
  }

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0]
      if (first?.index != null) {
        setIndex(first.index)
      }
    }
  ).current

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Skip */}
      <View className="flex-row items-center justify-between px-6 pt-2">
        <View className="flex-row items-center gap-2">
          <BrandLogo size="sm" />
          <BrandLogo size="sm" variant="wordmark" />
        </View>
        <Pressable onPress={() => finish("/(auth)/login")} hitSlop={12}>
          <Text className="text-sm font-bold text-muted-foreground">
            {isReplay ? "Done" : "Skip"}
          </Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        renderItem={({ item }) => {
          const Icon = item.icon
          return (
            <View
              style={{ width }}
              className="items-center justify-center gap-8 px-8"
            >
              <View
                className="h-40 w-40 items-center justify-center rounded-3xl"
                style={{ backgroundColor: theme.secondary }}
              >
                <View
                  className="h-24 w-24 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Icon size={44} color={theme.primaryForeground} strokeWidth={2.25} />
                </View>
              </View>
              <View className="items-center gap-3">
                <View
                  className="rounded-full px-3.5 py-1.5"
                  style={{ backgroundColor: theme.secondary }}
                >
                  <Text variant="eyebrow">
                    {item.badge}
                  </Text>
                </View>
                <Text className="text-center text-3xl font-black leading-9 text-foreground">
                  {item.title}
                </Text>
                <Text className="text-center text-sm leading-7 text-muted-foreground">
                  {item.description}
                </Text>
              </View>
            </View>
          )
        }}
      />

      {/* Controls */}
      <View className="gap-5 px-6 pb-6">
        <View className="flex-row items-center justify-center gap-2">
          {SLIDES.map((slide, dotIndex) => (
            <View
              key={slide.key}
              className="h-2 rounded-full"
              style={{
                width: dotIndex === index ? 24 : 8,
                backgroundColor:
                  dotIndex === index ? theme.primary : theme.border,
              }}
            />
          ))}
        </View>
        <Button size="lg" onPress={handleNext}>
          <Text>
            {isLastSlide ? (isReplay ? "Done" : "Get Started") : "Continue"}
          </Text>
        </Button>
        {isReplay ? null : (
          <Pressable
            onPress={() => finish("/(auth)/login")}
            className="items-center"
            hitSlop={8}
          >
            <Text className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Text className="text-sm font-bold text-primary">Sign in</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  )
}
