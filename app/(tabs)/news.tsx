import { useCallback } from "react"
import { NEWS_ITEMS, type NewsItemType } from "@/data/news-data"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { AppShellHeader } from "@/components/app-shell-header"

const TYPE_LABELS: Record<NewsItemType, string> = {
  update: "Product Update",
  learning: "Learning Material",
  questionnaire: "Questionnaire",
}

function getNewsTone(
  type: NewsItemType,
  theme: (typeof THEME)["light"] | (typeof THEME)["dark"]
) {
  switch (type) {
    case "learning":
      return theme.chart2
    case "questionnaire":
      return theme.chart4
    default:
      return theme.accent
  }
}

export default function NewsScreen() {
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light

  const renderNewsItem = useCallback(
    ({ item }: ListRenderItemInfo<(typeof NEWS_ITEMS)[number]>) => {
      const tone = getNewsTone(item.type, theme)

      return (
        <Card style={{ borderColor: withOpacity(tone, 0.18) }}>
          <CardContent className="gap-3 px-4 py-4">
            <View className="flex-row items-center justify-between gap-2">
              <Badge
                variant="outline"
                className="border-transparent"
                style={{ backgroundColor: withOpacity(tone, 0.12) }}
              >
                <Text
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: tone }}
                >
                  {TYPE_LABELS[item.type]}
                </Text>
              </Badge>
              <Text className="text-xs font-semibold text-muted-foreground">
                {item.dateLabel}
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-base font-black leading-6 text-card-foreground">
                {item.title}
              </Text>
              <Text className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </Text>
            </View>

            {item.isNew ? (
              <Badge variant="default" className="mt-1">
                <Text className="text-[10px] font-black uppercase tracking-wide">
                  New
                </Text>
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      )
    },
    [theme]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlashList
        data={NEWS_ITEMS}
        extraData={theme}
        keyExtractor={(item) => item.id}
        renderItem={renderNewsItem}
        ListHeaderComponent={
          <View className="px-4 pb-4 pt-4">
            <AppShellHeader
              compact
              eyebrow="What Is New"
              title="News and Releases"
              subtitle="Stay updated with fresh reviewer content, learning materials, and question packs in a cleaner, easier-to-scan feed."
            />
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-4" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 128 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}
