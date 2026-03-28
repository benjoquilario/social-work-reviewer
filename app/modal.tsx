import { Link } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { THEME } from "@/lib/theme";

export default function ModalScreen() {
  const colorScheme = useColorScheme();
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-3 px-5 py-6"
      >
        <Text className="text-3xl font-black text-foreground">
          Imports Glossary
        </Text>

        <Card>
          <CardContent className="gap-2 px-4 py-4">
            <Text className="text-sm font-bold text-card-foreground">
              import {"{ useState }"} from &apos;react&apos;
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              Stores local state in a functional component.
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-2 px-4 py-4">
            <Text className="text-sm font-bold text-card-foreground">
              import {"{ View, Text, Pressable }"} from &apos;react-native&apos;
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              Core building blocks: layout containers, text rendering, and touch
              interactions.
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gap-2 px-4 py-4">
            <Text className="text-sm font-bold text-card-foreground">
              import {"{ Stack, Tabs, Link }"} from &apos;expo-router&apos;
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              Expo Router primitives for file-based navigation and screen
              transitions.
            </Text>
          </CardContent>
        </Card>

        <Link href="/explore" dismissTo asChild>
          <Button className="mt-2 h-12">
            <ArrowLeft size={16} color={primaryColor} />
            <Text className="font-bold text-primary-foreground">
              Back to Learn tab
            </Text>
          </Button>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
