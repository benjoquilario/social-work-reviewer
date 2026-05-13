import { memo } from "react"
import { View } from "react-native"
import { FlashList, type ListRenderItem } from "@shopify/flash-list"
import type { LearningSubject } from "@/lib/learning-content"
import type { ThemePalette } from "@/lib/home-types"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"

const SubjectCardSeparator = memo(function SubjectCardSeparator() {
  return <View className="w-2.5" />
})

export const PracticeAreasSection = memo(function PracticeAreasSection({
  theme,
  isLoading,
  errorMessage,
  reviewSubjects,
  renderSubjectCard,
}: {
  theme: ThemePalette
  isLoading: boolean
  errorMessage: string | null
  reviewSubjects: LearningSubject[]
  renderSubjectCard: ListRenderItem<LearningSubject>
}) {
  return (
    <View className="gap-2.5">
      <View className="gap-0.5">
        <Text className="text-[11px] font-black uppercase tracking-[1.4px] text-primary">
          Practice Areas
        </Text>
        <Text className="text-[17px] font-extrabold text-foreground">
          Quiz Categories
        </Text>
      </View>

      {isLoading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingRight: 16 }}
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={`subject-skeleton-${index}`} className="w-[300px]">
              <Card>
                <CardContent className="gap-3 px-4 py-4">
                  <View className="flex-row items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-2xl" />
                    <View className="flex-1 gap-1.5">
                      <Skeleton className="h-4 w-36 rounded-lg" />
                      <Skeleton className="h-3 w-24 rounded-lg" />
                    </View>
                  </View>

                  <Skeleton className="h-8 rounded-xl" />
                  <View className="flex-row gap-2">
                    <Skeleton className="h-10 flex-1 rounded-2xl" />
                    <Skeleton className="h-10 w-12 rounded-2xl" />
                  </View>
                </CardContent>
              </Card>
            </View>
          ))}
        </ScrollView>
      ) : errorMessage ? (
        <Card className="rounded-[28px]">
          <CardContent className="gap-2 px-4 py-4">
            <Text className="text-sm font-black text-destructive">
              Review subjects unavailable
            </Text>
            <Text className="text-[13px] leading-5 text-muted-foreground">
              {errorMessage}
            </Text>
          </CardContent>
        </Card>
      ) : (
        <FlashList
          data={reviewSubjects}
          extraData={theme}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
          keyExtractor={(item) => item.id}
          decelerationRate="fast"
          renderItem={renderSubjectCard}
          ItemSeparatorComponent={SubjectCardSeparator}
          ListEmptyComponent={
            <Card className="w-[300px]">
              <CardContent className="gap-2 px-4 py-4">
                <Text className="text-sm font-black text-card-foreground">
                  No review subjects yet
                </Text>
                <Text className="text-[13px] leading-5 text-muted-foreground">
                  Add Appwrite subject and topic records to populate this
                  section.
                </Text>
              </CardContent>
            </Card>
          }
        />
      )}
    </View>
  )
})
