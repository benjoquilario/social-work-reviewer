import { memo } from "react"
import { View } from "react-native"
import { BookOpenText } from "lucide-react-native"
import type { LearningSubject } from "@/lib/learning-content"
import type { ThemePalette } from "@/lib/home-types"
import { getSubjectCardPresentation } from "@/lib/home-presentation"
import { Card, CardContent } from "@/components/ui/card"
import { MotionPressable } from "@/components/ui/motion"
import { Text } from "@/components/ui/text"

export const HomeSubjectCard = memo(function HomeSubjectCard({
  subject,
  theme,
  onPrimaryAction,
  onSecondaryAction,
}: {
  subject: LearningSubject
  theme: ThemePalette
  onPrimaryAction: (subject: LearningSubject) => void
  onSecondaryAction: (subject: LearningSubject) => void
}) {
  const cardPresentation = getSubjectCardPresentation(theme, subject.isLocked)
  const StatusIcon = cardPresentation.statusIcon
  const PrimaryIcon = cardPresentation.primaryIcon
  const premiumCountColor = subject.hasPremiumContent
    ? cardPresentation.tone
    : theme.mutedForeground

  return (
    <View className="w-[300px]">
      <Card
        className="overflow-hidden rounded-[26px]"
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
        }}
      >
        <CardContent className="gap-4 px-4 py-4">
          <View className="flex-row items-start gap-3">
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: cardPresentation.statusIconBg }}
            >
              <StatusIcon size={18} color={cardPresentation.tone} />
            </View>

            <View className="flex-1 gap-1.5">
              <View className="flex-row items-start justify-between gap-3">
                <Text
                  className="flex-1 text-[15px] font-black leading-[21px] text-foreground"
                  numberOfLines={2}
                >
                  {subject.name}
                </Text>
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{ backgroundColor: cardPresentation.badgeBg }}
                >
                  <Text
                    className="text-[10px] font-black uppercase tracking-[0.7px]"
                    style={{ color: cardPresentation.badgeText }}
                  >
                    {cardPresentation.statusLabel}
                  </Text>
                </View>
              </View>

              <Text className="text-[12px] text-muted-foreground">
                {subject.materialCount} materials · {subject.topicCount} topics
              </Text>
            </View>
          </View>

          <View
            className="flex-row rounded-2xl px-3 py-1.5"
            style={{ backgroundColor: theme.muted }}
          >
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-muted-foreground">
                Free
              </Text>
              <Text className="text-[13px] font-black text-foreground">
                {subject.freeMaterialCount}
              </Text>
            </View>

            <View className="flex-1 items-end">
              <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-muted-foreground">
                Premium
              </Text>
              <Text
                className="text-[13px] font-black"
                style={{ color: premiumCountColor }}
              >
                {subject.premiumMaterialCount}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <MotionPressable
              className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-3"
              style={{ backgroundColor: cardPresentation.primaryCtaBg }}
              onPress={() => onPrimaryAction(subject)}
            >
              <PrimaryIcon size={15} color={cardPresentation.primaryCtaText} />
              <Text
                className="text-[13px] font-black"
                style={{ color: cardPresentation.primaryCtaText }}
              >
                {cardPresentation.primaryLabel}
              </Text>
            </MotionPressable>

            <MotionPressable
              className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-3"
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.background,
              }}
              onPress={() => onSecondaryAction(subject)}
            >
              <BookOpenText size={15} color={theme.primary} />
              <Text
                className="text-[13px] font-bold"
                style={{ color: theme.primary }}
              >
                View Topics
              </Text>
            </MotionPressable>
          </View>
        </CardContent>
      </Card>
    </View>
  )
})
