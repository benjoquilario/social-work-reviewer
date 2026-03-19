import { useRouter } from "expo-router";
import { ArrowRight, FolderOpen } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES } from "@/data/reviewer-data";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { THEME } from "@/lib/theme";

export default function ReviewerHomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-5 px-5 py-6">
        <View className="gap-2 py-1">
          <Text className="text-3xl font-black text-foreground">
            Professional Reviewer
          </Text>
          <Text className="text-[15px] leading-6 text-muted-foreground">
            Choose a category, pick a timed mode, and train your memory through
            focused recall.
          </Text>
        </View>

        <View className="gap-1">
          <Text className="text-xl font-extrabold text-foreground">
            Categories
          </Text>
          <Text className="text-[13px] text-muted-foreground">
            Tap one category to continue to Question Mode.
          </Text>
        </View>

        <View className="gap-3">
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
                      Enter Question Mode
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
  );
}
