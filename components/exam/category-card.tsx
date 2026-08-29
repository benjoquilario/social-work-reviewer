import { memo } from "react"
import { ChevronRight, FileQuestion, Layers, LockKeyhole } from "lucide-react-native"
import { Pressable, View } from "react-native"

import {
  getCategoryDestination,
  type ExamCategory,
} from "@/lib/content/exam-categories"
import { useThemePalette } from "@/hooks/use-theme"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

/**
 * One exam category.
 *
 * The counts on the row are the CMS's, and they are what decide the tap
 * destination — a category with sets opens a picker, one without opens its
 * questions directly (section 2). Nothing here queries the sets table to find
 * that out.
 */

type ExamCategoryCardProps = {
  category: ExamCategory
  onPress: () => void
}

function describeContents(category: ExamCategory) {
  const destination = getCategoryDestination(category)

  if (destination.kind === "sets") {
    return `${destination.setCount} ${destination.setCount === 1 ? "set" : "sets"}`
  }

  if (destination.kind === "questions") {
    return `${destination.questionCount} items`
  }

  return "Nothing published yet"
}

export const ExamCategoryCard = memo(function ExamCategoryCard({
  category,
  onPress,
}: ExamCategoryCardProps) {
  const theme = useThemePalette()
  const destination = getCategoryDestination(category)
  const isEmpty = destination.kind === "empty"

  return (
    <Pressable
      onPress={onPress}
      disabled={isEmpty}
      accessibilityRole="button"
      accessibilityLabel={`${category.title}. ${describeContents(category)}.`}
      accessibilityState={{ disabled: isEmpty }}
      className="active:opacity-90"
    >
      <Card style={{ opacity: isEmpty ? 0.6 : 1 }}>
        <CardContent className="gap-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1.5">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text variant="subheading">{category.title}</Text>
                {category.code ? (
                  <Badge tone="primary" size="sm">
                    {category.code}
                  </Badge>
                ) : null}
                {category.isLocked ? (
                  <Badge tone="accent" size="sm">
                    <LockKeyhole size={10} color={theme.accentText} />
                    <Text>Premium</Text>
                  </Badge>
                ) : null}
              </View>

              {category.description ? (
                <Text variant="caption" numberOfLines={2}>
                  {category.description}
                </Text>
              ) : null}
            </View>

            <ChevronRight size={18} color={theme.mutedForeground} />
          </View>

          <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1.5">
            {destination.kind === "sets" ? (
              <View className="flex-row items-center gap-1.5">
                <Layers size={13} color={theme.primary} />
                <Text variant="label">{describeContents(category)}</Text>
              </View>
            ) : null}

            <View className="flex-row items-center gap-1.5">
              <FileQuestion size={13} color={theme.mutedForeground} />
              <Text variant="label">{category.questionCount} questions</Text>
            </View>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  )
})
