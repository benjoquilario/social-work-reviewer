import { NEWS_ITEMS, type NewsItemType } from "@/data/news-data"
import { Megaphone } from "lucide-react-native"
import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

const TYPE_LABELS: Record<NewsItemType, string> = {
  update: "Product Update",
  learning: "Learning Material",
  questionnaire: "Questionnaire",
}

export default function NewsScreen() {
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-5">
        <View className="rounded-3xl border border-border bg-card px-5 py-5">
          <View className="flex-row items-center gap-2">
            <Megaphone size={16} color={primaryColor} />
            <Text className="text-xs font-black uppercase tracking-[1.8px] text-primary">
              What is New
            </Text>
          </View>
          <Text className="mt-2 text-2xl font-black text-card-foreground">
            News and Releases
          </Text>
          <Text className="mt-2 text-sm leading-6 text-muted-foreground">
            Stay updated with new reviewer content, learning materials, and
            question packs.
          </Text>
        </View>

        {NEWS_ITEMS.map((item) => (
          <Card key={item.id}>
            <CardContent className="gap-2 px-4 py-4">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                  {TYPE_LABELS[item.type]}
                </Text>
                <Text className="text-xs font-semibold text-muted-foreground">
                  {item.dateLabel}
                </Text>
              </View>

              <Text className="text-base font-black leading-6 text-card-foreground">
                {item.title}
              </Text>
              <Text className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </Text>

              {item.isNew ? (
                <View className="mt-1 self-start rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1">
                  <Text className="text-[10px] font-black uppercase tracking-wide text-primary">
                    New
                  </Text>
                </View>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
