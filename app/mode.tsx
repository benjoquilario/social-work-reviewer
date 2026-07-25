import { useRouter } from "expo-router"
import { CalendarDays, FileQuestion } from "lucide-react-native"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { ScreenHeader } from "@/components/screen-header"

export default function ModeScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-4 pb-8 pt-1"
      >
        <ScreenHeader title="Question Mode" />

        <Card style={{ borderWidth: 1, borderColor: theme.border }}>
          <CardContent className="gap-4 px-4 py-5">
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: withOpacity(theme.primary, 0.12) }}
            >
              <FileQuestion size={22} color={theme.primary} />
            </View>

            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
                Board Exams First
              </Text>
              <Text className="text-[22px] font-black leading-8 text-foreground">
                Reviewer quizzes now run from board exam JSON sets
              </Text>
              <Text className="text-[13px] leading-6 text-muted-foreground">
                The old subject exam mode has been retired. Use board exam
                categories, set-based drills, progress tracking, achievements,
                and dashboard reports from the new reviewer flow.
              </Text>
            </View>

            <View className="gap-2.5">
              <View
                className="rounded-2xl px-3.5 py-3"
                style={{ backgroundColor: withOpacity(theme.primary, 0.08) }}
              >
                <View className="flex-row items-center gap-2">
                  <CalendarDays size={15} color={theme.accent} />
                  <Text className="text-[12px] font-bold text-foreground">
                    What changed
                  </Text>
                </View>
                <Text className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  Your application now centers on board exam sets, learning
                  materials, weekly activity, achievements, and performance
                  reporting instead of the old `questions`, `exams`, and
                  `exam_attempts` path.
                </Text>
              </View>

              <Button
                className="h-12 rounded-2xl"
                onPress={() => router.push("/board-exams")}
              >
                <Text className="font-bold text-primary-foreground">
                  Open Board Exams
                </Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
