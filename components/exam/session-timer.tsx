import { memo, useEffect, useRef, useState } from "react"
import Timer from "lucide-react-native/icons/timer"
import { AppState, View } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

/**
 * The countdown.
 *
 * Derived from an absolute end instant rather than decremented by a tick, so
 * backgrounding the app cannot make the clock lose time — an interval stops
 * firing when the OS suspends JavaScript, and a decrementing timer comes back
 * minutes behind. It re-reads the wall clock on every tick and again whenever
 * the app returns to the foreground.
 */

function formatClock(totalSeconds: number) {
  const safe = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

type SessionTimerProps = {
  /** When the sitting ends, in epoch ms. */
  endsAtMs: number
  onExpire: () => void
  /** Turn the clock red under this many seconds. */
  warnUnderSeconds?: number
}

export const SessionTimer = memo(function SessionTimer({
  endsAtMs,
  onExpire,
  warnUnderSeconds = 60,
}: SessionTimerProps) {
  const theme = useThemePalette()
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(Math.round((endsAtMs - Date.now()) / 1000), 0)
  )

  // A ref so the effect below does not restart every time the parent
  // re-creates the callback — restarting it would reset the interval on every
  // keystroke-equivalent render.
  const onExpireRef = useRef(onExpire)
  const hasFiredRef = useRef(false)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    hasFiredRef.current = false

    const read = () => {
      const remaining = Math.max(Math.round((endsAtMs - Date.now()) / 1000), 0)
      setSecondsLeft(remaining)

      if (remaining <= 0 && !hasFiredRef.current) {
        hasFiredRef.current = true
        onExpireRef.current()
      }
    }

    read()

    const interval = setInterval(read, 1000)
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        read()
      }
    })

    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [endsAtMs])

  const isWarning = secondsLeft <= warnUnderSeconds
  const accent = isWarning ? theme.destructive : theme.primary

  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{ backgroundColor: withOpacity(accent, 0.12) }}
      accessibilityRole="timer"
      accessibilityLabel={`${Math.floor(secondsLeft / 60)} minutes remaining`}
    >
      <Timer size={13} color={accent} />
      <Text
        className="font-mono text-xs font-bold"
        style={{ color: accent }}
      >
        {formatClock(secondsLeft)}
      </Text>
    </View>
  )
})
