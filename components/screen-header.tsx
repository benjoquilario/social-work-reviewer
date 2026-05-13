import { type ReactNode } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { useRouter } from "expo-router"
import { ArrowLeft } from "lucide-react-native"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Text } from "@/components/ui/text"

type ScreenHeaderProps = {
  /** The screen title displayed next to the back arrow */
  title: string
  /** Optional trailing element (search icon, etc.) */
  trailing?: ReactNode
  /** Override the default router.back() behavior */
  onBack?: () => void
}

/**
 * Consistent screen header: ← Title [trailing]
 * Used across all detail screens for a uniform navigation pattern.
 */
export function ScreenHeader({ title, trailing, onBack }: ScreenHeaderProps) {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light

  return (
    <View className="flex-row items-center justify-between px-1.5 py-3">
      <View className="flex-1 flex-row items-center gap-1.5">
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-2xl"
          onPress={onBack ?? (() => router.back())}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={theme.foreground} strokeWidth={2.4} />
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          <Text className="text-[17px] font-black text-foreground" numberOfLines={1}>
            {title}
          </Text>
        </ScrollView>
      </View>
      {trailing ?? null}
    </View>
  )
}
