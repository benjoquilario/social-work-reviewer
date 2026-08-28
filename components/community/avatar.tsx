import { useEffect, useMemo, useState } from "react"
import { Image, View } from "react-native"

import { THEME, withOpacity } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

type CommunityAvatarProps = {
  label: string
  theme: ThemePalette
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  sourceUri?: string | null
  /**
   * `brand` renders for the always-dark brand surface. The default tints the
   * avatar with `primary`, which in light mode is a deep teal — legible on a
   * card, invisible on the hero's ink gradient.
   */
  tone?: "default" | "brand"
}

const SIZE_STYLES = {
  sm: {
    container: "h-9 w-9 rounded-md",
    text: "text-2xs",
  },
  md: {
    container: "h-11 w-11 rounded-lg",
    text: "text-xs",
  },
  lg: {
    container: "h-12 w-12 rounded-lg",
    text: "text-sm",
  },
  /** Profile header. Large enough that the corner radius reads as a squircle. */
  xl: {
    container: "h-[72px] w-[72px] rounded-2xl",
    text: "text-xl",
  },
} as const

export function CommunityAvatar({
  label,
  theme,
  size = "md",
  className,
  sourceUri,
  tone = "default",
}: CommunityAvatarProps) {
  const sizeStyle = SIZE_STYLES[size]
  const isBrand = tone === "brand"
  const [imageFailed, setImageFailed] = useState(false)
  const normalizedSourceUri = useMemo(
    () => sourceUri?.trim() || null,
    [sourceUri]
  )
  const shouldRenderImage = Boolean(normalizedSourceUri) && !imageFailed

  useEffect(() => {
    setImageFailed(false)
  }, [normalizedSourceUri])

  return (
    <View
      className={cn(
        "items-center justify-center overflow-hidden border border-border bg-background",
        sizeStyle.container,
        className
      )}
      style={{
        backgroundColor: isBrand
          ? "hsl(0 0% 100% / 0.16)"
          : withOpacity(theme.primary, 0.12),
        borderColor: isBrand ? "hsl(0 0% 100% / 0.24)" : theme.border,
      }}
    >
      {shouldRenderImage ? (
        <Image
          source={{ uri: normalizedSourceUri as string }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text
          className={cn("font-black uppercase", sizeStyle.text)}
          style={{ color: isBrand ? "#ffffff" : theme.primary }}
        >
          {label}
        </Text>
      )}
    </View>
  )
}
