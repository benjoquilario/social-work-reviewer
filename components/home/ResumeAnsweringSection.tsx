import { memo } from "react"
import ChevronRight from "lucide-react-native/icons/chevron-right"
import Play from "lucide-react-native/icons/play"
import { View } from "react-native"

import type { ResumeAttemptCard, ThemePalette } from "@/lib/home-types"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { MotionPressable } from "@/components/ui/motion"
import { SectionHeader } from "@/components/ui/section-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

/**
 * Unfinished attempts. Render only when `hasResumableWork` on the screen says
 * there is something to show — an early `return null` here would still leave
 * an empty flex item in the feed's `gap-5` rhythm, i.e. a double gap.
 */
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
  return (
    <View className="gap-3">
      <SectionHeader title="Continue" />

      {isLoading ? (
        <View className="gap-2.5">
          <Skeleton className="h-[76px] rounded-xl" />
          <Skeleton className="h-[76px] rounded-xl" />
        </View>
      ) : errorMessage ? (
        <EmptyState
          tone="destructive"
          title="Resume data unavailable"
          description={errorMessage}
        />
      ) : (
        <View className="gap-2.5">
          {items.map((item) => (
            <MotionPressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Resume ${item.title}. ${item.progressLabel}.`}
              onPress={() => onPressItem(item)}
            >
              <Card>
                <CardContent
                  size="compact"
                  className="flex-row items-center gap-3"
                >
                  <View className="h-11 w-11 items-center justify-center rounded-lg bg-primary">
                    <Play
                      size={15}
                      color={theme.primaryForeground}
                      fill={theme.primaryForeground}
                    />
                  </View>

                  <View className="flex-1 gap-1">
                    <Text variant="subheading" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text variant="caption" numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                    <Text
                      variant="label"
                      className="text-primary"
                      numberOfLines={1}
                    >
                      {item.progressLabel} · {item.updatedLabel}
                    </Text>
                  </View>

                  <ChevronRight size={18} color={theme.mutedForeground} />
                </CardContent>
              </Card>
            </MotionPressable>
          ))}
        </View>
      )}
    </View>
  )
})
