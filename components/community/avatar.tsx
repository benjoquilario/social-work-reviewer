import { View } from "react-native"

import { THEME, withOpacity } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

type CommunityAvatarProps = {
  label: string
  theme: ThemePalette
  size?: "sm" | "md" | "lg"
  className?: string
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
}: CommunityAvatarProps) {
  const sizeStyle = SIZE_STYLES[size]

  return (
    <View
      className={cn(
        "items-center justify-center border border-border bg-background",
        sizeStyle.container,
        className
      )}
      style={{
        backgroundColor: withOpacity(theme.primary, 0.12),
        borderColor: theme.border,
      }}
    >
      <Text
        className={cn("font-black uppercase text-primary", sizeStyle.text)}
        style={{ color: theme.primary }}
      >
        {label}
      </Text>
    </View>
  )
}
