import { memo } from "react"
import { Clock3, ListChecks, Play } from "lucide-react-native"
import { View } from "react-native"

import type { ResumeAttemptCard, ThemePalette } from "@/lib/home-types"
import { withOpacity } from "@/lib/theme"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { MotionPressable } from "@/components/ui/motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

export const ResumeAnsweringSection = memo(function ResumeAnsweringSection({
  items,
  isLoading,
  errorMessage,
  onPressItem,
  theme,
}: {
  items: ResumeAttemptCard[]
  isLoading: boolean
  errorMessage: string | null
  onPressItem: (item: ResumeAttemptCard) => void
  theme: ThemePalette
}) {
  if (isLoading) {
    return (
      <View className="gap-2.5">
        <View className="gap-0.5">
          <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
            Resume Answering
          </Text>
          <Text className="text-[17px] font-extrabold text-foreground">
            Continue your previous attempts
          </Text>
        </View>
        <Skeleton className="h-24 rounded-[26px]" />
      </View>
    )
  }

  if (errorMessage) {
    return (
      <View className="gap-2.5">
        <View className="gap-0.5">
          <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
            Resume Answering
          </Text>
          <Text className="text-[17px] font-extrabold text-foreground">
            Continue your previous attempts
          </Text>
        </View>
        <EmptyState
          tone="destructive"
          title="Resume data unavailable"
          description={errorMessage}
        />
      </View>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <View className="gap-2.5">
      <View className="gap-0.5">
        <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
          Resume Answering
        </Text>
        <Text className="text-[17px] font-extrabold text-foreground">
          Continue your previous attempts
        </Text>
        <Text className="text-[12px] leading-5 text-muted-foreground">
          Jump back into your ongoing board exam or quiz exactly where you left
          off.
        </Text>
      </View>

      <View className="gap-2.5">
        {items.map((item) => (
          <MotionPressable key={item.id} onPress={() => onPressItem(item)}>
            <Card
              className="rounded-[26px]"
              style={{ borderWidth: 1, borderColor: theme.border }}
            >
              <CardContent className="gap-3 px-4 py-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-[15px] font-black text-card-foreground">
                      {item.title}
                    </Text>
                    <Text className="text-[12px] leading-5 text-muted-foreground">
                      {item.subtitle}
                    </Text>
                  </View>
                  <View
                    className="h-11 w-11 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: withOpacity(theme.primary, 0.14),
                    }}
                  >
                    <Play size={16} color={theme.primary} />
                  </View>
                </View>

                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-row items-center gap-1.5">
                    <ListChecks size={13} color={theme.primary} />
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.9px] text-primary">
                      {item.progressLabel}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Clock3 size={13} color={theme.mutedForeground} />
                    <Text className="text-[11px] font-semibold text-muted-foreground">
                      {item.updatedLabel}
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </MotionPressable>
        ))}
      </View>
    </View>
  )
})
