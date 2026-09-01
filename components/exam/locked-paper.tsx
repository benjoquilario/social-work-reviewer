import { memo } from "react"
import Crown from "lucide-react-native/icons/crown"
import LockKeyhole from "lucide-react-native/icons/lock-keyhole"
import { View } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

/**
 * A paper with nothing free in it.
 *
 * The honest stop. Before this, a paid paper with no free sample rendered as
 * "0 items available" above a disabled Start button — which reads as a broken
 * screen rather than a locked one, and a member who thinks the app is broken
 * does not subscribe, they leave.
 *
 * So it says what is behind the lock, how much of it there is, and what to do
 * about it. The count comes from the category's own rollup, so it costs
 * nothing to show.
 */

type LockedPaperProps = {
  title: string
  /** Everything in this paper. All of it is paid. */
  questionCount: number
  onUpgrade: () => void
  onBack: () => void
}

export const LockedPaper = memo(function LockedPaper({
  title,
  questionCount,
  onUpgrade,
  onBack,
}: LockedPaperProps) {
  const theme = useThemePalette()

  return (
    <View className="gap-4">
      <Card>
        <CardContent className="items-center gap-4 py-8">
          <View
            className="h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: withOpacity(theme.accent, 0.14) }}
          >
            <LockKeyhole size={26} color={theme.accentText} strokeWidth={2.2} />
          </View>

          <View className="items-center gap-1.5">
            <Text variant="heading" className="text-center">
              {title}
            </Text>

            <Text variant="callout" className="text-center text-muted-foreground">
              {questionCount > 0
                ? `All ${questionCount} items in this paper are part of the membership.`
                : "This paper is part of the membership."}
            </Text>
          </View>

          <Button size="xl" className="w-full" onPress={onUpgrade}>
            <Crown size={16} color={theme.primaryForeground} />
            <Text>See membership</Text>
          </Button>

          <Button variant="ghost" size="sm" onPress={onBack}>
            <Text>Find a free paper</Text>
          </Button>
        </CardContent>
      </Card>
    </View>
  )
})

/**
 * The nudge after a free member finishes their sample.
 *
 * This is the peak moment of the whole flow — they have just done the work and
 * seen a score — so it is the one place a paywall has earned the right to
 * interrupt. It names the number left rather than saying "upgrade for more",
 * because a number is a reason and a slogan is not.
 */
export const SampleFinishedUpsell = memo(function SampleFinishedUpsell({
  hiddenCount,
  onUpgrade,
}: {
  hiddenCount: number
  onUpgrade: () => void
}) {
  const theme = useThemePalette()

  if (hiddenCount <= 0) {
    return null
  }

  return (
    <Card
      style={{
        borderColor: withOpacity(theme.accent, 0.35),
        backgroundColor: withOpacity(theme.accent, 0.08),
        borderWidth: 1,
      }}
    >
      <CardContent className="gap-3">
        <View className="flex-row items-center gap-2">
          <Crown size={16} color={theme.accentText} />
          <Text
            className="text-sm font-extrabold"
            style={{ color: theme.accentText }}
          >
            That was the free sample
          </Text>
        </View>

        <Text variant="callout">
          {hiddenCount} more {hiddenCount === 1 ? "question" : "questions"} in
          this paper, plus every other category and the mistake drill.
        </Text>

        <Button onPress={onUpgrade}>
          <Text>See membership</Text>
        </Button>
      </CardContent>
    </Card>
  )
})
