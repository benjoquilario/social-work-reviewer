import { NEWS_ITEMS, type NewsItemType } from "@/data/news-data"
import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { AppShellHeader } from "@/components/app-shell-header"

const TYPE_LABELS: Record<NewsItemType, string> = {
  update: "Product Update",
  learning: "Learning Material",
  questionnaire: "Questionnaire",
}

export default function NewsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-5">
        <AppShellHeader
          compact
          eyebrow="What Is New"
          title="News and Releases"
          subtitle="Stay updated with new reviewer content, learning materials, and question packs."
          stats={[
            { label: "Items", value: String(NEWS_ITEMS.length) },
            {
              label: "New",
              value: String(NEWS_ITEMS.filter((item) => item.isNew).length),
            },
            {
              label: "Learning",
              value: String(
                NEWS_ITEMS.filter((item) => item.type === "learning").length
              ),
            },
          ]}
        />

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
