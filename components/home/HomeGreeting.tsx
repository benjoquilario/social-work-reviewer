import { memo } from "react"
import { View } from "react-native"

import { Text } from "@/components/ui/text"

type HomeGreetingProps = {
  firstName: string
  /** "Good morning" / "Good afternoon" / "Good evening". */
  salutation: string
}

/**
 * The screen's opening block: a personal greeting, then the promise.
 *
 * The headline carries the only two-tone text on Home — the second clause sits
 * in `primary` so the eye lands on "Starts Here." first. Everything else on
 * this screen earns attention through size and surface, not colour, which is
 * what keeps that one accent meaningful.
 */
export const HomeGreeting = memo(function HomeGreeting({
  firstName,
  salutation,
}: HomeGreetingProps) {
  return (
    <View className="gap-1">
      <Text variant="callout" className="text-muted-foreground">
        {salutation}, {firstName}! 👋
      </Text>

      {/* One Text, not two stacked lines: this way the clause wraps naturally
          on narrow screens instead of breaking at a hard-coded point. */}
      <Text
        role="heading"
        aria-level="1"
        className="text-3xl font-extrabold leading-10 text-foreground"
      >
        Your Board Exam Success{" "}
        <Text className="text-3xl font-extrabold leading-10 text-primary">
          Starts Here.
        </Text>
      </Text>

      <Text variant="callout" className="mt-1 text-muted-foreground">
        Study smart. Practice more. Pass the board exam.
      </Text>
    </View>
  )
})
