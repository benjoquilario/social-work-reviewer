import { memo } from "react"
import {
  BookOpen,
  FileQuestion,
  FolderOpen,
  Layers,
  Lock,
  type LucideIcon,
} from "lucide-react-native"
import { Pressable, View } from "react-native"

import type { SearchResult, SearchResultKind } from "@/lib/content/search"
import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

/**
 * One search hit.
 *
 * The icon carries the kind, so the row does not need a label saying
 * "Question" above a question — five words of chrome per result, on a screen
 * whose whole job is scanning.
 *
 * A locked result is still shown. Hiding it would answer "we have nothing on
 * the Social Work Law" when the truth is "we have eleven, behind the
 * membership" — and the second answer is both honest and the one that sells.
 */

const KIND_ICON: Record<SearchResultKind, LucideIcon> = {
  question: FileQuestion,
  material: BookOpen,
  subject: FolderOpen,
  topic: Layers,
  category: FolderOpen,
}

type SearchResultRowProps = {
  result: SearchResult
  onPress: (result: SearchResult) => void
}

export const SearchResultRow = memo(function SearchResultRow({
  result,
  onPress,
}: SearchResultRowProps) {
  const theme = useThemePalette()
  const Icon = KIND_ICON[result.kind]

  return (
    <Pressable
      onPress={() => onPress(result)}
      accessibilityRole="button"
      className="min-h-[56px] flex-row items-center gap-3 rounded-lg px-3 py-2.5 active:opacity-80"
      style={{ backgroundColor: theme.card }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
      >
        <Icon size={16} color={theme.primary} strokeWidth={2.2} />
      </View>

      <View className="flex-1 gap-0.5">
        <Text variant="callout" className="font-semibold" numberOfLines={2}>
          {result.title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {result.subtitle}
        </Text>
      </View>

      {result.isLocked ? (
        <Lock size={14} color={theme.mutedForeground} strokeWidth={2.2} />
      ) : null}
    </Pressable>
  )
})
