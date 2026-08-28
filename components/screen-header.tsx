import { type ReactNode } from "react"
import { useRouter } from "expo-router"
import { ArrowLeft } from "lucide-react-native"
import { ScrollView, View } from "react-native"

import { useThemePalette } from "@/hooks/use-theme"
import { IconButton } from "@/components/ui/icon-button"
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
  const theme = useThemePalette()

  return (
    <View className="flex-row items-center justify-between px-1.5 py-3">
      <View className="flex-1 flex-row items-center gap-1.5">
        <IconButton
          label="Go back"
          size="sm"
          onPress={onBack ?? (() => router.back())}
        >
          <ArrowLeft size={20} color={theme.foreground} strokeWidth={2.4} />
        </IconButton>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          <Text variant="title" numberOfLines={1}>
            {title}
          </Text>
        </ScrollView>
      </View>
      {trailing ?? null}
    </View>
  )
}
