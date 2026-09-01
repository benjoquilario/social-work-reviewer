import { memo } from "react"
import LayoutGrid from "lucide-react-native/icons/layout-grid"
import X from "lucide-react-native/icons/x"
import { View } from "react-native"

import { useThemePalette } from "@/hooks/use-theme"
import { IconButton } from "@/components/ui/icon-button"
import { SessionProgress } from "./session-progress"
import { SessionTimer } from "./session-timer"

/**
 * The persistent bar above a sitting.
 *
 * Everything a member glances up for and nothing else: where they are, how
 * long is left, a way to jump, and a way out. The exit is a plain X rather than
 * a back arrow because leaving mid-paper is a decision, not navigation.
 */

type SessionTopBarProps = {
  position: number
  total: number
  answeredCount: number
  endsAtMs: number | null
  onExpire: () => void
  onOpenMap: () => void
  onExit: () => void
}

export const SessionTopBar = memo(function SessionTopBar({
  position,
  total,
  answeredCount,
  endsAtMs,
  onExpire,
  onOpenMap,
  onExit,
}: SessionTopBarProps) {
  const theme = useThemePalette()

  return (
    <View className="gap-2.5 border-b border-border/70 bg-background px-4 pb-3 pt-2">
      <View className="flex-row items-center gap-2">
        <IconButton label="Leave this sitting" size="sm" onPress={onExit}>
          <X size={19} color={theme.foreground} strokeWidth={2.4} />
        </IconButton>

        <View className="flex-1" />

        {endsAtMs ? (
          <SessionTimer endsAtMs={endsAtMs} onExpire={onExpire} />
        ) : null}

        <IconButton label="Jump to a question" size="sm" onPress={onOpenMap}>
          <LayoutGrid size={18} color={theme.foreground} strokeWidth={2.2} />
        </IconButton>
      </View>

      <SessionProgress
        position={position}
        total={total}
        answeredCount={answeredCount}
      />
    </View>
  )
})
