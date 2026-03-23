import { LEARNING_LESSONS } from "@/data/learning-center-data"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowLeft,
  ArrowRight,
  CircleCheckBig,
  EllipsisVertical,
  NotebookPen,
  Search,
  UserCircle2,
} from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

export default function LessonDetailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ lessonId?: string }>()
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary

  const lessonId = params.lessonId ?? ""
  const lesson = LEARNING_LESSONS.find((item) => item.id === lessonId)

  if (!lesson) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-2xl font-black text-foreground">
            Lesson not found
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            This route does not match an available learning module.
          </Text>
          <Button
            className="h-11 w-full"
            onPress={() => router.replace("/learn")}
          >
            <Text className="font-bold text-primary-foreground">
              Back to Learning Center
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-4 pb-7 pt-3">
        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-2xl"
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={primaryColor} strokeWidth={2.5} />
          </Pressable>

          <View className="flex-row items-center gap-4">
            <Search size={20} color={primaryColor} strokeWidth={2.2} />
            <UserCircle2 size={22} color={primaryColor} strokeWidth={2.1} />
            <EllipsisVertical
              size={20}
              color={primaryColor}
              strokeWidth={2.2}
            />
          </View>
        </View>

        <View className="items-end">
          <Text className="text-[13px] font-semibold text-muted-foreground">
            {lesson.lessonSections.length + 1}/
            {lesson.lessonSections.length + 1}
          </Text>
        </View>

        <View className="h-2 rounded-full bg-muted">
          <View
            className="h-2 rounded-full bg-border"
            style={{ width: "100%" }}
          />
        </View>

        <View className="gap-3 px-1">
          <Text className="text-[13px] font-black uppercase tracking-[1.4px] text-primary">
            {lesson.stage} · {lesson.level} · {lesson.duration}
          </Text>

          <Text className="text-[17px] font-black leading-7 text-foreground">
            {lesson.title}
          </Text>
          <Text className="text-[14px] leading-7 text-card-foreground">
            {lesson.lessonSections[0]?.body ?? lesson.summary}
          </Text>
        </View>

        <Card>
          <CardContent className="gap-2.5 px-3.5 py-3.5">
            <View className="flex-row items-center gap-2">
              <NotebookPen size={15} color={primaryColor} />
              <Text className="text-sm font-black text-card-foreground">
                Key Objectives
              </Text>
            </View>

            {lesson.objectives.map((objective) => (
              <View key={objective} className="flex-row items-start gap-2">
                <View className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <Text className="flex-1 text-[12px] leading-5 text-muted-foreground">
                  {objective}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-2.5 px-3.5 py-3.5">
            <Text className="text-sm font-black text-card-foreground">
              Lesson Walkthrough
            </Text>
            {lesson.lessonSections.map((section, index) => (
              <View
                key={section.title}
                className="rounded-2xl border border-border bg-background p-2.5"
              >
                <View className="flex-row items-center gap-2">
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <Text className="text-[11px] font-black text-primary">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="text-[13px] font-bold text-card-foreground">
                    {section.title}
                  </Text>
                </View>
                <Text className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                  {section.body}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-2.5 px-3.5 py-3.5">
            <Text className="text-sm font-black text-card-foreground">
              Worked Example
            </Text>
            <View className="rounded-2xl border border-border bg-background p-2.5">
              <Text className="text-sm font-bold text-card-foreground">
                {lesson.exampleTitle}
              </Text>
              <Text className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                {lesson.exampleScenario}
              </Text>
            </View>
            <View className="rounded-2xl border border-primary/30 bg-primary/10 p-2.5">
              <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                Key Takeaway
              </Text>
              <Text className="mt-1 text-[13px] leading-6 text-card-foreground">
                {lesson.exampleTakeaway}
              </Text>
            </View>
            <View className="rounded-2xl border border-border bg-background p-2.5">
              <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                Situation
              </Text>
              <Text className="mt-1 text-[13px] leading-6 text-muted-foreground">
                {lesson.appliedExample.situation}
              </Text>
              <Text className="mt-3 text-xs font-bold uppercase tracking-wide text-primary">
                Analysis
              </Text>
              <Text className="mt-1 text-[13px] leading-6 text-muted-foreground">
                {lesson.appliedExample.analysis}
              </Text>
              <Text className="mt-3 text-xs font-bold uppercase tracking-wide text-primary">
                Recommended Action
              </Text>
              <Text className="mt-1 text-[13px] leading-6 text-muted-foreground">
                {lesson.appliedExample.action}
              </Text>
            </View>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-2.5 px-3.5 py-3.5">
            <View className="flex-row items-center gap-2">
              <CircleCheckBig size={15} color={primaryColor} />
              <Text className="text-sm font-black text-card-foreground">
                Practice Checklist
              </Text>
            </View>

            {lesson.practice.map((task, index) => (
              <View key={task} className="flex-row items-start gap-2">
                <Text className="mt-0.5 text-sm font-black text-primary">
                  {index + 1}.
                </Text>
                <Text className="flex-1 text-[12px] leading-5 text-muted-foreground">
                  {task}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-2.5 px-3.5 py-3.5">
            <Text className="text-sm font-black text-card-foreground">
              Content Source
            </Text>
            <Text className="text-[12px] leading-5 text-muted-foreground">
              Future dashboard source:{" "}
              <Text className="font-bold text-card-foreground">
                {lesson.markdownSlug}.md
              </Text>
            </Text>
            <Text className="text-[11px] leading-5 text-muted-foreground">
              Recommended setup: store lesson metadata in your database, keep
              the markdown body in object storage or a CMS, and send the mobile
              app a signed URL or cached payload when the user opens a lesson.
            </Text>
          </CardContent>
        </Card>

        <Pressable
          className="mt-1 self-end rounded-full border border-border bg-card p-3.5"
          onPress={() => router.back()}
        >
          <ArrowRight size={22} color={primaryColor} strokeWidth={2.2} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
