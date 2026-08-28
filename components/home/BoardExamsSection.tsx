import { memo } from "react"
import {
  BookOpenCheck,
  ChevronRight,
  Layers,
  MessageSquareText,
  Timer,
} from "lucide-react-native"
import { View } from "react-native"

import type { ThemePalette } from "@/lib/home-types"
import { MotionPressable } from "@/components/ui/motion"
import { Text, TextClassContext } from "@/components/ui/text"

/** What a board-exam set actually gives you, one column each. */
const FEATURES = [
  { icon: Layers, label: "Sets A–D" },
  { icon: Timer, label: "Timed" },
  { icon: MessageSquareText, label: "Answers" },
] as const

/**
 * The screen's primary destination, as one filled card.
 *
 * A white card with a teal icon read as one more list item in a page of
 * white cards. Filling it with `primary` puts it a clear step below the ink
 * hero and a clear step above the content cards — three levels of emphasis
 * instead of two. The three features sit in equal columns rather than as
 * wrapping pills, which is what made the old chip row break into a ragged
 * second line.
 */
export const BoardExamsSection = memo(function BoardExamsSection({
  theme,
  onPress,
}: {
  theme: ThemePalette
  onPress: () => void
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel="Open board exams"
      onPress={onPress}
    >
      <TextClassContext.Provider value="text-primary-foreground">
        <View className="overflow-hidden rounded-2xl bg-primary">
          <View className="gap-4 p-5">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-lg bg-primary-foreground/15">
                <BookOpenCheck size={20} color={theme.primaryForeground} />
              </View>

              <View className="flex-1 gap-0.5">
                <Text variant="eyebrow" className="text-primary-foreground/90">
                  Board exams
                </Text>
                <Text variant="heading" numberOfLines={2}>
                  Drill like it&apos;s exam day
                </Text>
              </View>

              <ChevronRight size={20} color={theme.primaryForeground} />
            </View>

            <Text
              variant="callout"
              className="text-primary-foreground/90"
              numberOfLines={2}
            >
              Full sets, scored the way the licensure exam scores them.
            </Text>

            <View className="flex-row gap-2">
              {FEATURES.map(({ icon: Icon, label }) => (
                <View
                  key={label}
                  className="flex-1 items-center gap-1.5 rounded-md bg-primary-foreground/10 px-1.5 py-2.5"
                >
                  <Icon size={15} color={theme.primaryForeground} />
                  <Text
                    className="text-2xs font-bold uppercase"
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </TextClassContext.Provider>
    </MotionPressable>
  )
})
