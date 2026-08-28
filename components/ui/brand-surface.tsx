import { type ReactNode } from "react"
import { StyleSheet, View, type ViewProps } from "react-native"
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg"

import { getBrandSurfacePalette } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { TextClassContext } from "@/components/ui/text"

/**
 * The logo's own surface, as a panel.
 *
 * The mark is neon on ink, so this retraces how the artwork reads: ink at the
 * edges, navy through the middle, teal where the figures glow, with a cyan
 * bloom in the top-right standing in for the logo's light source. It stays
 * dark in BOTH color schemes — a printed logo does not invert — which is why
 * everything inside it is light-on-dark and `TextClassContext` pins the text
 * to white rather than `foreground`.
 *
 * `className` lands on the INNER view, not the outer one, and that is
 * deliberate: Yoga sizes an absolutely-positioned child against its parent's
 * *content* box while anchoring it to the *border* box, so a `p-5` on the
 * same view as the gradient canvas left a 40px band down the right edge and
 * across the bottom unpainted — white text on the white page. Padding lives
 * one level in from the canvas so it cannot shrink it. The outer view also
 * carries a flat navy, so even a mismeasured canvas can only ever look
 * duller, never illegible.
 */
function BrandSurface({
  children,
  className,
  style,
  ...props
}: ViewProps & { children?: ReactNode }) {
  const brand = getBrandSurfacePalette()

  return (
    <TextClassContext.Provider value="text-white">
      <View
        className="overflow-hidden rounded-2xl"
        style={[{ backgroundColor: brand.gradientMid }, style]}
        {...props}
      >
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id="brandBase" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={brand.gradientStart} />
              <Stop offset="0.55" stopColor={brand.gradientMid} />
              <Stop offset="1" stopColor={brand.gradientEnd} />
            </LinearGradient>
            {/* The logo's outer glow, anchored where the mark's light sits. */}
            <RadialGradient id="brandGlow" cx="0.85" cy="0.1" r="0.9">
              <Stop offset="0" stopColor={brand.glow} stopOpacity={0.45} />
              <Stop offset="1" stopColor={brand.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#brandBase)" />
          <Rect x="0" y="0" width="100" height="100" fill="url(#brandGlow)" />
        </Svg>

        <View className={cn(className)}>{children}</View>
      </View>
    </TextClassContext.Provider>
  )
}

/**
 * A frosted panel meant to sit on top of `BrandSurface`.
 * Uses white overlays rather than theme tokens, since the surface underneath
 * is dark regardless of the active color scheme.
 */
function BrandGlassPanel({
  className,
  style,
  ...props
}: ViewProps & { children?: ReactNode }) {
  const brand = getBrandSurfacePalette()

  return (
    <View
      className={cn("rounded-md border px-4 py-3", className)}
      style={[
        {
          backgroundColor: brand.overlayStrong,
          borderColor: brand.border,
        },
        style,
      ]}
      {...props}
    />
  )
}

export { BrandGlassPanel, BrandSurface }
