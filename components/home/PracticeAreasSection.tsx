import { memo } from "react"
import ChevronRight from "lucide-react-native/icons/chevron-right"
import { Pressable, View } from "react-native"

import type { ThemePalette } from "@/lib/home-types"
import type { LearningSubject } from "@/lib/learning-content"
import { EmptyState } from "@/components/ui/empty-state"
import { SectionHeader } from "@/components/ui/section-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

import { HomeSubjectRow } from "./HomeSubjectRow"

const SKELETON_ROWS = [0, 1, 2]

export const PracticeAreasSection = memo(function PracticeAreasSection({
  theme,
  isLoading,
  errorMessage,
  subjects,
  hiddenCount,
  onPressSubject,
  onPressSeeAll,
}: {
  theme: ThemePalette
  isLoading: boolean
  errorMessage: string | null
  /** Already trimmed to the preview length by the screen. */
  subjects: LearningSubject[]
  /** How many more exist behind "See all". */
  hiddenCount: number
  onPressSubject: (subject: LearningSubject) => void
  onPressSeeAll: () => void
}) {
  return (
    <View className="gap-3">
      <SectionHeader
        title="Review by subject"
        action={
          hiddenCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`See all subjects, ${hiddenCount} more`}
              className="flex-row items-center gap-0.5 py-1"
              onPress={onPressSeeAll}
            >
              <Text className="text-sm font-bold text-primary">See all</Text>
              <ChevronRight size={14} color={theme.primary} />
            </Pressable>
          ) : null
        }
      />

      {isLoading ? (
        <View className="gap-2.5">
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-[70px] rounded-xl" />
          ))}
        </View>
      ) : errorMessage ? (
        <EmptyState
          tone="destructive"
          title="Subjects unavailable"
          description={errorMessage}
        />
      ) : subjects.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Add Appwrite subject and topic records to populate this list."
        />
      ) : (
        <View className="gap-2.5">
          {subjects.map((subject) => (
            <HomeSubjectRow
              key={subject.id}
              subject={subject}
              theme={theme}
              onPress={onPressSubject}
            />
          ))}
        </View>
      )}
    </View>
  )
})
