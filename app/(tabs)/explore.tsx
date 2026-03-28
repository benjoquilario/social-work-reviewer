import { Link } from "expo-router";
import { BookOpenText } from "lucide-react-native";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { THEME } from "@/lib/theme";

export default function LearnScreen() {
  const colorScheme = useColorScheme();
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-5 py-6"
      >
        <Text className="text-3xl font-black text-foreground">
          Learn By Doing
        </Text>
        <Text className="text-[15px] leading-6 text-muted-foreground">
          This tab explains how the reviewer app is built using Expo Router and
          React Native core components.
        </Text>

        <Card>
          <CardContent className="gap-2 px-4 py-4">
            <Text className="text-lg font-bold text-card-foreground">
              Routing system in this project
            </Text>
            <Text className="text-[15px] leading-6 text-muted-foreground">
              1. app/_layout.tsx sets the root Stack.
            </Text>
            <Text className="text-[15px] leading-6 text-muted-foreground">
              2. app/(tabs)/_layout.tsx defines the tab navigator.
            </Text>
            <Text className="text-[15px] leading-6 text-muted-foreground">
              3. app/(tabs)/index.tsx is the Reviewer screen.
            </Text>
            <Text className="text-[15px] leading-6 text-muted-foreground">
              4. app/(tabs)/explore.tsx is this Learn screen.
            </Text>
            <Text className="text-[15px] leading-6 text-muted-foreground">
              5. app/modal.tsx is a modal route for import notes.
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-2 px-4 py-4">
            <Text className="text-lg font-bold text-card-foreground">
              Why this matters
            </Text>
            <Text className="text-[15px] leading-6 text-muted-foreground">
              File-based routing lets you navigate by organizing files. It is
              predictable, easy to scale, and ideal for learning because folder
              structure becomes your mental model.
            </Text>
          </CardContent>
        </Card>

        <Link href="/modal" asChild>
          <Button className="h-12">
            <BookOpenText size={16} color={primaryColor} />
            <Text className="font-bold text-primary-foreground">
              Open Imports Glossary (Modal)
            </Text>
          </Button>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
