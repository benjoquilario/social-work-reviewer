import type { ReactNode } from "react"
import { View, type ViewProps } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { cn } from "@/lib/utils"

/**
 * ─── A bar pinned to the bottom of a screen ───────────────────────────────
 *
 * `edgeToEdgeEnabled` is on, so the app draws *underneath* the Android system
 * navigation, and a bar with hardcoded bottom padding ends up beneath the
 * gesture pill or the three-button bar. The fix is not a magic number: the
 * inset is 0 on a tablet with no system bar, roughly 24dp under gesture
 * navigation, and roughly 48dp under three-button navigation — on the same
 * Android version, decided by a setting the user can change at any time.
 *
 * So the padding is read at render from `useSafeAreaInsets()` and floored at
 * `minInset`, because a bar flush against the screen edge reads as clipped even
 * where nothing would overlap it.
 *
 * `left`/`right` matter too: in landscape on a notched phone the cutout eats
 * one side, and a full-bleed bar puts its first control underneath it.
 *
 * The parent screen must NOT also claim the bottom edge. Pair this with
 * `<SafeAreaView edges={["top", "left", "right"]}>` so the bar paints its own
 * background all the way down; otherwise the inset is applied twice and a strip
 * of page background shows through beneath the bar.
 */

type BottomBarProps = ViewProps & {
  children: ReactNode
  /**
   * Floor for the bottom padding, in px. Raise it for bars whose controls sit
   * right on the edge; the default suits a bar with its own vertical padding.
   */
  minInset?: number
  /** Set false for a floating bar that should not draw a divider. */
  bordered?: boolean
}

export function BottomBar({
  children,
  className,
  style,
  minInset = 12,
  bordered = true,
  ...props
}: BottomBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        {
          paddingBottom: Math.max(insets.bottom, minInset),
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
      className={cn(
        "bg-background px-4 pt-3",
        bordered && "border-t border-border/70",
        className
      )}
      {...props}
    >
      {children}
    </View>
  )
}
