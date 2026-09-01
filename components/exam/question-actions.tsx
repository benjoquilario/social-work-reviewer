import { memo } from "react"
import Bookmark from "lucide-react-native/icons/bookmark"
import Flag from "lucide-react-native/icons/flag"
import { Pressable, View } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

/**
 * The two things you can do to a question that are not answering it.
 *
 * Both are deliberately quiet. They sit under the choices, not above them,
 * because anything competing with the stem during a timed sitting is a cost
 * paid on every question to serve the few where it matters.
 *
 * **Save** is the one members reach for — an item they want to come back to —
 * and it is the whole reason `questionSource: "bookmarked"` exists.
 *
 * **Report** is rarer and worth more. A reviewer app's credibility is its
 * answer key, and the member looking at a wrong one right now is the only
 * person who will ever notice it. Before v3 there was nowhere for them to put
 * it, so it went to a Facebook group or a one-star review.
 */

type QuestionActionsProps = {
  isSaved: boolean
  onToggleSave: () => void
  onReport: () => void
}

export const QuestionActions = memo(function QuestionActions({
  isSaved,
  onToggleSave,
  onReport,
}: QuestionActionsProps) {
  const theme = useThemePalette()

  return (
    <View className="flex-row items-center justify-between gap-2 border-t border-border/60 pt-3">
      <Pressable
        onPress={onToggleSave}
        accessibilityRole="button"
        accessibilityLabel={isSaved ? "Remove from saved" : "Save this question"}
        accessibilityState={{ selected: isSaved }}
        // 44pt of touch target on a control that sits beside the answer
        // choices — a mis-tap here costs an answer.
        className="min-h-[44px] flex-row items-center gap-2 rounded-md px-2.5 py-2 active:opacity-70"
        style={{
          backgroundColor: isSaved
            ? withOpacity(theme.primary, 0.1)
            : "transparent",
        }}
      >
        <Bookmark
          size={16}
          color={isSaved ? theme.primary : theme.mutedForeground}
          strokeWidth={2.2}
          fill={isSaved ? theme.primary : "transparent"}
        />
        <Text
          variant="caption"
          style={{ color: isSaved ? theme.primary : theme.mutedForeground }}
          className={isSaved ? "font-semibold" : undefined}
        >
          {isSaved ? "Saved" : "Save"}
        </Text>
      </Pressable>

      <Pressable
        onPress={onReport}
        accessibilityRole="button"
        accessibilityLabel="Report a problem with this question"
        className="min-h-[44px] flex-row items-center gap-2 rounded-md px-2.5 py-2 active:opacity-70"
      >
        <Flag size={15} color={theme.mutedForeground} strokeWidth={2.2} />
        <Text variant="caption" style={{ color: theme.mutedForeground }}>
          Report
        </Text>
      </Pressable>
    </View>
  )
})
