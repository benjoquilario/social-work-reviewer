import { CATEGORIES } from "@/data/reviewer-data"
import { useRouter } from "expo-router"
import {
  ArrowRight,
  BookOpenText,
  Clock3,
  FolderOpen,
  MessagesSquare,
  Newspaper,
  Sparkles,
  Target,
} from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

export default function ReviewerHomeScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-5">
          <View className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10" />
          <View className="bg-chart2/20 absolute -bottom-10 -left-6 h-24 w-24 rounded-full" />

          <View className="flex-row items-center gap-2">
            <Sparkles size={16} color={primaryColor} />
            <Text className="text-xs font-black uppercase tracking-[1.8px] text-primary">
              Daily Review System
            </Text>
          </View>

          <Text className="mt-2 text-3xl font-black text-card-foreground">
            Professional Reviewer
          </Text>
          <Text className="mt-2 text-sm leading-6 text-muted-foreground">
            Select one category, start a timed set, and build exam confidence
            through active recall.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <Card className="flex-1">
            <CardContent className="gap-2 px-4 py-4">
              <View className="flex-row items-center gap-2">
                <Clock3 size={14} color={primaryColor} />
                <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                  Pacing
                </Text>
              </View>
              <Text className="text-sm font-black text-card-foreground">
                25 to 60 min
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                Match your available study window.
              </Text>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardContent className="gap-2 px-4 py-4">
              <View className="flex-row items-center gap-2">
                <Target size={14} color={primaryColor} />
                <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                  Focus
                </Text>
              </View>
              <Text className="text-sm font-black text-card-foreground">
                Goal-driven
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                Track weak areas and improve fast.
              </Text>
            </CardContent>
          </Card>
        </View>

        <View className="gap-3">
          <Text className="text-lg font-extrabold text-foreground">
            Quick Access
          </Text>

          <View className="flex-row flex-wrap gap-3">
            <Pressable
              className="w-[48%] rounded-2xl"
              onPress={() => router.push("/learn")}
            >
              <Card>
                <CardContent className="gap-2 px-4 py-4">
                  <BookOpenText size={18} color={primaryColor} />
                  <Text className="text-base font-bold text-card-foreground">
                    Learning Path
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    Move from foundation to mastery.
                  </Text>
                </CardContent>
              </Card>
            </Pressable>

            <Pressable
              className="w-[48%] rounded-2xl"
              onPress={() => router.push("/community")}
            >
              <Card>
                <CardContent className="gap-2 px-4 py-4">
                  <MessagesSquare size={18} color={primaryColor} />
                  <Text className="text-base font-bold text-card-foreground">
                    Community
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    Ask questions and learn from peers.
                  </Text>
                </CardContent>
              </Card>
            </Pressable>

            <Pressable
              className="w-[48%] rounded-2xl"
              onPress={() => router.push("/news")}
            >
              <Card>
                <CardContent className="gap-2 px-4 py-4">
                  <Newspaper size={18} color={primaryColor} />
                  <Text className="text-base font-bold text-card-foreground">
                    Latest News
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    See new materials and releases.
                  </Text>
                </CardContent>
              </Card>
            </Pressable>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-lg font-extrabold text-foreground">
            Quiz Categories
          </Text>

          {CATEGORIES.map((category) => (
            <Pressable
              key={category.id}
              className="rounded-2xl"
              onPress={() =>
                router.push({
                  pathname: "/mode",
                  params: { categoryId: category.id },
                })
              }
            >
              <Card>
                <CardContent className="gap-2 px-4 py-4">
                  <View className="flex-row items-start gap-2">
                    <FolderOpen size={18} color={primaryColor} />
                    <Text className="flex-1 text-lg font-extrabold leading-6 text-card-foreground">
                      {category.title}
                    </Text>
                  </View>
                  <Text className="text-sm leading-5 text-muted-foreground">
                    {category.description}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-1">
                    <Text className="text-[13px] font-bold uppercase tracking-wide text-primary">
                      Start Timed Review
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
