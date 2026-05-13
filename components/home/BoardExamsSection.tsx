import { memo } from "react"
import { BookOpenCheck } from "lucide-react-native"
import { View } from "react-native"

import type { ThemePalette } from "@/lib/home-types"
import { withOpacity } from "@/lib/theme"
import { Card, CardContent } from "@/components/ui/card"
import { MotionPressable } from "@/components/ui/motion"
import { Text } from "@/components/ui/text"

export const BoardExamsSection = memo(function BoardExamsSection({
  theme,
  onPress,
}: {
  theme: ThemePalette
  onPress: () => void
}) {
  return (
    <View className="gap-2.5">
      <View className="gap-0.5">
        <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
          Board Exams
        </Text>
        {/* <Text className="text-[17px] font-extrabold text-foreground">
          Category To Set Review
        </Text> */}
      </View>

      <Card
        className="rounded-[26px]"
        style={{ borderWidth: 1, borderColor: theme.border }}
      >
        <CardContent className="gap-3.5 px-4 py-4">
          <View className="flex-row items-start gap-3">
            <View
              className="h-11 w-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: withOpacity(theme.primary, 0.14) }}
            >
              <BookOpenCheck size={18} color={theme.primary} />
            </View>

            <View className="flex-1 gap-1">
              <Text className="text-[15px] font-black text-card-foreground">
                Build A Professional Board Exam Routine
              </Text>
              {/* <Text className="text-[12px] leading-5 text-muted-foreground">
                Open categories, choose Set A/B/C/D, select a mode, and answer
                each question in a timed flow.
              </Text> */}
            </View>
          </View>

          <MotionPressable
            className="h-11 flex-row items-center justify-center gap-2 rounded-2xl"
            style={{ backgroundColor: theme.primary }}
            onPress={onPress}
          >
            <BookOpenCheck size={15} color={theme.primaryForeground} />
            <Text
              className="text-[13px] font-black"
              style={{ color: theme.primaryForeground }}
            >
              Open Board Exams
            </Text>
          </MotionPressable>
        </CardContent>
      </Card>
    </View>
  )
})
