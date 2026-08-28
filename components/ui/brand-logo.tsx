import { Image } from "expo-image"
import { View, type ViewProps } from "react-native"

import { cn } from "@/lib/utils"

const MARK = require("@/assets/images/logo-mark.png")
const LOCKUP = require("@/assets/images/sure-win-image-text.png")

type BrandLogoSize = "sm" | "md" | "lg" | "xl"

/**
 * Two artworks, drawn for opposite backdrops.
 *
 * `mark` is the 512×512 symbol as neon on near-black. It needs the ink tile —
 * that is the surface it was drawn for.
 *
 * `lockup` is the "Social Work Sure Win!" wordmark, transparent, and it is
 * drawn straight onto whatever is behind it in both schemes — no tile. Its
 * "Sure" is set in the deep brand navy, so on the dark theme that word reads
 * as a dark silhouette rather than as type; "Social Work", "Win!" and the
 * exclamation dot carry the mark there.
 *
 * The full 1536×1024 `logo.png` is deliberately not used here. Its wordmark is
 * embossed low-contrast and turns to texture below about 80px, and at 1.3MB it
 * decodes to roughly 6MB of RGBA for what is a 40pt header element.
 */
type BrandLogoVariant = "mark" | "lockup"

const SIZE_CLASS: Record<BrandLogoSize, string> = {
  sm: "h-10 w-10 rounded-sm",
  md: "h-16 w-16 rounded-md",
  lg: "h-24 w-24 rounded-lg",
  xl: "h-40 w-40 rounded-2xl",
}

/** Height of the wordmark's ink, in pt. Width follows from LOCKUP_ASPECT. */
const LOCKUP_HEIGHT: Record<BrandLogoSize, number> = {
  sm: 26,
  md: 34,
  lg: 48,
  xl: 72,
}

/*
 * The lockup file centres a 176×47 wordmark inside a 192×192 canvas, so three
 * quarters of it is empty. Letterboxing that padding would draw the type at a
 * quarter of the box height — the reason the header mark used to read as a
 * speck. Instead the box is cut to the ink's own ratio and the artwork is
 * scaled past it and clipped, which is the same trick the mark uses to sit
 * tight to its glow.
 */
const LOCKUP_ASPECT = 176 / 47
/** 192/47 ≈ 4.09 fills the box exactly; 4 leaves the antialiased edge intact. */
const LOCKUP_OVERSCAN = 4

type BrandLogoProps = ViewProps & {
  size?: BrandLogoSize
  variant?: BrandLogoVariant
  /**
   * Drop the tile and render the bare artwork. `mark` only — the lockup is
   * always bare.
   */
  bare?: boolean
}

/**
 * The app logo.
 *
 * The mark's tile keeps its backdrop constant across colour schemes, the way a
 * printed logo does, rather than being recoloured per theme. Screens
 * previously stood in a generic `BookOpenText` lucide glyph on a primary
 * square wherever the brand belonged.
 */
export function BrandLogo({
  size = "md",
  variant = "mark",
  bare = false,
  className,
  style,
  ...props
}: BrandLogoProps) {
  if (variant === "lockup") {
    const height = LOCKUP_HEIGHT[size]

    return (
      <View
        className={cn(
          "items-center justify-center overflow-hidden",
          className
        )}
        accessibilityRole="image"
        accessibilityLabel="Social Work Sure Win"
        {...props}
        style={[{ height, width: height * LOCKUP_ASPECT }, style]}
      >
        <Image
          source={LOCKUP}
          contentFit="contain"
          style={{
            width: height * LOCKUP_OVERSCAN,
            height: height * LOCKUP_OVERSCAN,
          }}
        />
      </View>
    )
  }

  return (
    <View
      className={cn(
        "items-center justify-center overflow-hidden",
        SIZE_CLASS[size],
        !bare && "bg-brand-ink",
        className
      )}
      accessibilityRole="image"
      accessibilityLabel="Social Work Sure Win"
      style={style}
      {...props}
    >
      <Image
        source={MARK}
        contentFit="contain"
        // The mark ships tight to its glow, so nudging past the tile edge keeps
        // the artwork optically filling it.
        style={{ width: "112%", height: "112%" }}
      />
    </View>
  )
}

export type { BrandLogoProps, BrandLogoSize, BrandLogoVariant }
