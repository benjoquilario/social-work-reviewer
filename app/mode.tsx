import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Clock3, ListChecks } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { CATEGORIES, QUIZ_MODES } from "@/data/reviewer-data";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { THEME } from "@/lib/theme";

export default function ModeSelectionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const iconColor =
    colorScheme === "dark"
      ? THEME.dark.mutedForeground
      : THEME.light.mutedForeground;
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const categoryId = params.categoryId ?? "";
  const category = CATEGORIES.find((item) => item.id === categoryId);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-5 py-6">
        <Text className="text-[28px] font-extrabold text-foreground">
          Select Quiz Mode
        </Text>
        <Text className="text-[15px] leading-6 text-muted-foreground">
          {category
            ? `Category: ${category.title}`
            : "Pick a mode to start your timed review session."}
        </Text>

        <Card>
          <CardContent className="overflow-hidden px-0 py-0">
            {QUIZ_MODES.map((mode) => (
              <Pressable
                key={mode.id}
                className="gap-1 border-b border-border px-4 py-4"
                onPress={() => {
                  if (!category) {
                    return;
                  }

                  router.push({
                    pathname: "/quiz",
                    params: {
                      categoryId: category.id,
                      totalQuestions: String(mode.totalQuestions),
                      minutes: String(mode.minutes),
                    },
                  });
                }}
              >
                <Text className="text-[17px] font-bold text-card-foreground">
                  {mode.totalQuestions} Questions / {mode.minutes} Minutes
                </Text>
                <View className="flex-row items-center gap-2">
                  <ListChecks size={14} color={iconColor} />
                  <Clock3 size={14} color={iconColor} />
                  <Text className="text-[12px] font-semibold text-muted-foreground">
                    Timed reviewer mode
                  </Text>
                </View>
                <Text className="text-[13px] text-muted-foreground">
                  Focus mode for memorization and board-exam style pacing.
                </Text>
              </Pressable>
            ))}
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="h-11"
          onPress={() => router.back()}
        >
          <ChevronLeft size={16} color={iconColor} />
          <Text className="text-sm font-bold">Back to Categories</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
