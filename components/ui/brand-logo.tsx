import { Image } from "expo-image"
import { View, type ViewProps } from "react-native"

import { cn } from "@/lib/utils"

/**
 * ─── The brand marks ──────────────────────────────────────────────────────
 *
 * Every one of these artworks sits in a **square canvas with its ink floating
 * in the middle**, and the amount of empty space differs wildly between them:
 * the wordmark's type occupies 47px of a 192px canvas — 24% of the height —
 * while the mark takes 64% and the lockup 63%.
 *
 * That is why `contentFit="contain"` cannot be used directly. Contain fits the
 * whole *canvas* into the box, so asking for a 20pt-tall wordmark renders the
 * canvas at 20×20 and the type inside it at 5pt: a blue smudge. Which is
 * exactly what shipped, and exactly what this file now exists to prevent.
 *
 * So each artwork declares the rectangle its ink actually occupies, measured
 * off the file rather than eyeballed, and `InkImage` maps that rectangle onto
 * the requested box. Sizes below are therefore **the height of the visible
 * ink**, which is the only number a layout cares about.
 */

const MARK = require("@/assets/images/sure-win-image.png")
const WORDMARK = require("@/assets/images/sure-win-image-text.png")
const LOCKUP = require("@/assets/images/logo-512x512.png")

type BrandLogoSize = "sm" | "md" | "lg" | "xl"
type BrandLogoVariant = "mark" | "wordmark" | "lockup"

/**
 * Where the ink lives inside each square canvas, as fractions of it.
 *
 * Measured by scanning each file for pixels with alpha > 20:
 *   mark      192px canvas, ink 170×122 at (11, 35)
 *   wordmark  192px canvas, ink 176×47  at (7, 73)
 *   lockup    512px canvas, ink 386×320 at (62, 96)
 *
 * If an artwork is ever re-exported, re-measure. A changed crop shows up as a
 * logo that is subtly off-centre, which is the kind of thing everyone sees and
 * nobody reports.
 */
const ARTWORK: Record<
  BrandLogoVariant,
  { src: number; x: number; y: number; w: number; h: number }
> = {
  mark: { src: MARK, x: 11 / 192, y: 35 / 192, w: 170 / 192, h: 122 / 192 },
  wordmark: { src: WORDMARK, x: 7 / 192, y: 73 / 192, w: 176 / 192, h: 47 / 192 },
  lockup: { src: LOCKUP, x: 62 / 512, y: 96 / 512, w: 386 / 512, h: 320 / 512 },
}

/** Height of the visible ink, in pt. Width follows from the artwork's ratio. */
const INK_HEIGHT: Record<BrandLogoVariant, Record<BrandLogoSize, number>> = {
  // Ratio 1.39:1 — wider than tall, so 24pt of ink is 33pt across.
  mark: { sm: 24, md: 44, lg: 66, xl: 110 },
  // Two lines of type. Below about 22pt "Social Work" stops being letterforms
  // and becomes texture, so `sm` is only for a caption-height slot.
  wordmark: { sm: 18, md: 24, lg: 34, xl: 48 },
  lockup: { sm: 44, md: 76, lg: 112, xl: 168 },
}

const RADIUS_CLASS: Record<BrandLogoSize, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-2xl",
}

/**
 * Draws an artwork so its *ink* fills the box exactly.
 *
 * The canvas is scaled up until the ink rectangle matches the box, then offset
 * so the ink's top-left lands on the box's, with the overflow clipped away.
 */
function InkImage({
  art,
  height,
}: {
  art: (typeof ARTWORK)[BrandLogoVariant]
  height: number
}) {
  const width = height * (art.w / art.h)
  // How big the whole canvas has to be drawn for `art.w` of it to span `width`.
  const canvas = width / art.w

  return (
    <View style={{ width, height, overflow: "hidden" }}>
      <Image
        source={art.src}
        contentFit="fill"
        style={{
          position: "absolute",
          left: -art.x * canvas,
          top: -art.y * canvas,
          width: canvas,
          height: canvas,
        }}
      />
    </View>
  )
}

type BrandLogoProps = ViewProps & {
  size?: BrandLogoSize
  variant?: BrandLogoVariant
  /**
   * Paint the brand ink tile behind the mark, and square the box off.
   *
   * Off by default: the artwork is drawn for a light ground — its book cover is
   * the deep brand navy — so on near-black the outer rim merges into the
   * backdrop. Use it only where the mark has to sit on a busy surface.
   */
  tile?: boolean
}

export function BrandLogo({
  size = "md",
  variant = "mark",
  tile = false,
  className,
  style,
  ...props
}: BrandLogoProps) {
  const art = ARTWORK[variant]
  const height = INK_HEIGHT[variant][size]

  if (tile && variant === "mark") {
    // A square tile with the mark inset, rather than the ink's own 1.39:1 box.
    const box = height * 1.9

    return (
      <View
        className={cn(
          "items-center justify-center overflow-hidden bg-brand-ink",
          RADIUS_CLASS[size],
          className
        )}
        accessibilityRole="image"
        accessibilityLabel="Social Work Sure Win"
        {...props}
        style={[{ width: box, height: box }, style]}
      >
        <InkImage art={art} height={height} />
      </View>
    )
  }

  return (
    <View
      className={cn("items-center justify-center", className)}
      accessibilityRole="image"
      accessibilityLabel="Social Work Sure Win"
      {...props}
      style={style}
    >
      <InkImage art={art} height={height} />
    </View>
  )
}

export type { BrandLogoProps, BrandLogoSize, BrandLogoVariant }
