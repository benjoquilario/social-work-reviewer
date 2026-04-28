import { useEffect, useMemo, useState } from "react"
import { Image, View } from "react-native"

import { THEME, withOpacity } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

type CommunityAvatarProps = {
  label: string
  theme: ThemePalette
  size?: "sm" | "md" | "lg"
  className?: string
  sourceUri?: string | null
}

const SIZE_STYLES = {
  sm: {
    container: "h-9 w-9 rounded-2xl",
    text: "text-[11px]",
  },
  md: {
    container: "h-11 w-11 rounded-[18px]",
    text: "text-xs",
  },
  lg: {
    container: "h-12 w-12 rounded-[20px]",
    text: "text-sm",
  },
} as const

export function CommunityAvatar({
  label,
  theme,
  size = "md",
  className,
  sourceUri,
}: CommunityAvatarProps) {
  const sizeStyle = SIZE_STYLES[size]
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
        backgroundColor: withOpacity(theme.primary, 0.12),
        borderColor: theme.border,
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
          className={cn("font-black uppercase text-primary", sizeStyle.text)}
          style={{ color: theme.primary }}
        >
          {label}
        </Text>
      )}
    </View>
  )
}
