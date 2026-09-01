import { memo } from "react"
import Crown from "lucide-react-native/icons/crown"
import { View } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"

/**
 * What a free member is not seeing, and what to do about it.
 *
 * Says the number rather than hiding it. Which items make up the free sample
 * is an editorial choice stored on the rows themselves (`questions.isFree`),
 * so the sample is a representative spread — worth saying, because a member who
 * thinks they have seen the whole paper will not subscribe.
 */

type PaywallNoticeProps = {
  hiddenCount: number
  onUpgrade: () => void
  /** Shown above the count — "Set A", "History and CO Drill". */
  contextLabel?: string
}

export const PaywallNotice = memo(function PaywallNotice({
  hiddenCount,
  onUpgrade,
  contextLabel,
}: PaywallNoticeProps) {
  const theme = useThemePalette()

  if (hiddenCount <= 0) {
    return null
  }

  return (
    <View
      className="gap-3 rounded-lg border px-4 py-4"
      style={{
        borderColor: withOpacity(theme.accent, 0.35),
        backgroundColor: withOpacity(theme.accent, 0.1),
      }}
    >
      <View className="flex-row items-center gap-2">
        <Crown size={16} color={theme.accentText} />
        <Text
          className="text-sm font-extrabold"
          style={{ color: theme.accentText }}
        >
          {hiddenCount} more {hiddenCount === 1 ? "question" : "questions"}
          {contextLabel ? ` in ${contextLabel}` : ""}
        </Text>
      </View>

      <Text variant="caption">
        You are seeing the free sample. A membership opens the rest of this
        paper, every other category, and the mistake drill.
      </Text>

      <Button onPress={onUpgrade} size="sm" className="self-start">
        <Text>See membership</Text>
      </Button>
    </View>
  )
})
