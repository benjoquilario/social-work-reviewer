import { useCallback } from "react"
import { useRouter } from "expo-router"
import { ClipboardCheck, GraduationCap, type LucideIcon } from "lucide-react-native"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { QuestionnaireMode } from "@/lib/schema"
import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { ScreenHeader } from "@/components/screen-header"

/**
 * ─── Pick a mode ──────────────────────────────────────────────────────────
 *
 * `exam_categories.mode` is `quiz` or `board_exam`, and it is the CMS's own
 * statement about where a category belongs. This screen is that column, made
 * tappable — it does not invent a third category of its own.
 */

type ModeOption = {
  mode: QuestionnaireMode
  Icon: LucideIcon
  title: string
  description: string
  detail: string
}

const MODES: ModeOption[] = [
  {
    mode: "quiz",
    Icon: ClipboardCheck,
    title: "Quick quiz",
    description: "Short, untimed, feedback as you go.",
    detail: "Best for learning something new or drilling a weak area.",
  },
  {
    mode: "board_exam",
    Icon: GraduationCap,
    title: "Board exam",
    description: "Full lettered sets, timed, answers at the end.",
    detail: "Closest to the real sitting. Use it to test where you stand.",
  },
]

export default function ModeScreen() {
  const router = useRouter()
  const theme = useThemePalette()

  const openMode = useCallback(
    (mode: QuestionnaireMode) => {
      router.push({ pathname: "/board-exams", params: { mode } })
    },
    [router]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-4 pb-8 pt-1"
      >
        <ScreenHeader title="Choose a mode" />

        <Text variant="callout" className="px-1 text-muted-foreground">
          Both draw from the same question bank. The difference is how you are
          asked — and when you find out how you did.
        </Text>

        {MODES.map((option) => (
          <Pressable
            key={option.mode}
            onPress={() => openMode(option.mode)}
            accessibilityRole="button"
            accessibilityLabel={`${option.title}. ${option.description}`}
            className="active:opacity-90"
          >
            <Card>
              <CardContent size="loose" className="gap-3">
                <View
                  className="h-12 w-12 items-center justify-center rounded-lg"
                  style={{ backgroundColor: withOpacity(theme.primary, 0.12) }}
                >
                  <option.Icon size={22} color={theme.primary} />
                </View>

                <View className="gap-1">
                  <Text variant="heading">{option.title}</Text>
                  <Text variant="callout" className="text-muted-foreground">
                    {option.description}
                  </Text>
                </View>

                <View
                  className="rounded-md px-3 py-2.5"
                  style={{ backgroundColor: withOpacity(theme.muted, 0.8) }}
                >
                  <Text variant="caption">{option.detail}</Text>
                </View>
              </CardContent>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
