import {
  LEARNING_CENTER_INTRO,
  LEARNING_LESSONS,
  LEARNING_MILESTONES,
} from "@/data/learning-center-data"
import { useRouter } from "expo-router"
import {
  ArrowRight,
  BookOpenText,
  Flag,
  Sparkles,
  Target,
} from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

export default function LearningCenterScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary
  const featuredLesson = LEARNING_LESSONS.find(
    (lesson) => lesson.id === "case-analysis"
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-5">
        <View className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-5">
          <View className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10" />
          <View className="bg-chart2/20 absolute -bottom-10 -left-6 h-24 w-24 rounded-full" />

          <View className="flex-row items-center gap-2">
            <Sparkles size={16} color={primaryColor} />
            <Text className="text-xs font-extrabold uppercase tracking-[2px] text-primary">
              Learning Center
            </Text>
          </View>

          <Text className="mt-2 text-2xl font-black leading-8 text-card-foreground">
            {LEARNING_CENTER_INTRO.title}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-muted-foreground">
            {LEARNING_CENTER_INTRO.subtitle}
          </Text>
        </View>

        <Card>
          <CardContent className="gap-2 px-4 py-4">
            <View className="flex-row items-center gap-2">
              <Flag size={16} color={primaryColor} />
              <Text className="text-base font-extrabold text-card-foreground">
                Milestones
              </Text>
            </View>

            {LEARNING_MILESTONES.map((milestone) => (
              <View key={milestone} className="flex-row items-start gap-2">
                <View className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <Text className="flex-1 text-sm leading-6 text-muted-foreground">
                  {milestone}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-3 px-4 py-4">
            <View className="flex-row items-center gap-2">
              <BookOpenText size={16} color={primaryColor} />
              <Text className="text-base font-extrabold text-card-foreground">
                Markdown-ready lessons
              </Text>
            </View>
            <Text className="text-sm leading-6 text-muted-foreground">
              Each lesson can later load its long-form body from markdown stored
              in your dashboard or CMS. The mobile app only needs a slug and
              summary metadata to render previews and open the full content.
            </Text>
          </CardContent>
        </Card>

        {featuredLesson ? (
          <Pressable
            className="rounded-2xl"
            onPress={() =>
              router.push({
                pathname: "/learn/[lessonId]",
                params: { lessonId: featuredLesson.id },
              })
            }
          >
            <Card>
              <CardContent className="gap-3 px-4 py-4">
                <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                  Featured Real-World Lesson
                </Text>
                <Text className="text-lg font-black leading-7 text-card-foreground">
                  {featuredLesson.title}
                </Text>
                <Text className="text-sm leading-6 text-muted-foreground">
                  {featuredLesson.lessonSections[0]?.body}
                </Text>
                <View className="rounded-2xl border border-primary/30 bg-primary/10 p-3">
                  <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                    Why this is a good sample
                  </Text>
                  <Text className="mt-1 text-sm leading-6 text-card-foreground">
                    It shows the design direction for serious learning material:
                    context first, structured analysis next, then clear action.
                  </Text>
                </View>
                <View className="mt-1 flex-row items-center gap-1">
                  <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                    View sample lesson
                  </Text>
                  <ArrowRight size={14} color={primaryColor} />
                </View>
              </CardContent>
            </Card>
          </Pressable>
        ) : null}

        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <Target size={16} color={primaryColor} />
            <Text className="text-lg font-black text-foreground">
              Route Path
            </Text>
          </View>

          {LEARNING_LESSONS.map((lesson, index) => (
            <Pressable
              key={lesson.id}
              className="rounded-2xl"
              onPress={() =>
                router.push({
                  pathname: "/learn/[lessonId]",
                  params: { lessonId: lesson.id },
                })
              }
            >
              <Card>
                <CardContent className="gap-2 px-4 py-4">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                      Step {index + 1} - {lesson.stage}
                    </Text>
                    <Text className="text-xs font-semibold text-muted-foreground">
                      {lesson.duration}
                    </Text>
                  </View>

                  <Text className="text-lg font-black leading-7 text-card-foreground">
                    {lesson.title}
                  </Text>
                  <Text className="text-sm leading-6 text-muted-foreground">
                    {lesson.summary}
                  </Text>
                  <View className="rounded-2xl border border-border bg-background p-3">
                    <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                      Example
                    </Text>
                    <Text className="mt-1 text-sm font-bold text-card-foreground">
                      {lesson.exampleTitle}
                    </Text>
                    <Text className="mt-1 text-xs leading-5 text-muted-foreground">
                      {lesson.exampleTakeaway}
                    </Text>
                  </View>

                  <View className="mt-1 flex-row items-center gap-1">
                    <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                      Open lesson
                    </Text>
                    <ArrowRight size={14} color={primaryColor} />
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
