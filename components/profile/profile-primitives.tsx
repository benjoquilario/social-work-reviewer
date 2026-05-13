import { memo, type ReactNode } from "react"
import { Pressable, TextInput, View } from "react-native"

import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Text } from "@/components/ui/text"

export type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

export type ProfileDetailCard = {
  key: string
  icon: ReactNode
  label: string
  value: string
}

export type ProfileRecentActivityItem = {
  id: string
  title: string
  kindLabel: string
  metric: string
  statusText: string
  tone: string
}

export const ProfileInput = memo(function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  multiline?: boolean
}) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light

  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedForeground}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className="rounded-2xl border px-4 py-3 text-sm text-foreground"
        style={{
          minHeight: multiline ? 96 : 52,
          borderColor: theme.border,
          backgroundColor: theme.input,
          fontFamily: "PlusJakartaSans_500Medium",
          color: theme.foreground,
        }}
      />
    </View>
  )
})

export const ProfileSummaryCard = memo(function ProfileSummaryCard({
  label,
  value,
  helper,
  backgroundColor,
  borderColor,
}: {
  label: string
  value: string
  helper: string
  backgroundColor: string
  borderColor: string
}) {
  return (
    <View
      className="flex-1 rounded-[24px] border px-3.5 py-3.5"
      style={{
        backgroundColor,
        borderColor,
      }}
    >
      <View
        className="mb-2 h-1.5 w-10 rounded-full"
        style={{ backgroundColor: withOpacity(borderColor, 0.7) }}
      />
      <Text className="text-[10px] font-black uppercase tracking-[1.15px] text-muted-foreground">
        {label}
      </Text>
      <Text
        className="mt-1 text-[20px] font-black text-card-foreground"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {value}
      </Text>
      <Text className="mt-1 text-[11px] leading-4 text-muted-foreground">
        {helper}
      </Text>
    </View>
  )
})

export const TabButton = memo(function TabButton({
  label,
  active,
  onPress,
  theme,
}: {
  label: string
  active: boolean
  onPress: () => void
  theme: ThemePalette
}) {
  return (
    <Pressable
      className="min-w-0 flex-1 items-center rounded-[18px] px-2.5 py-3.5"
      onPress={onPress}
      style={{
        backgroundColor: active
          ? theme.primary
          : withOpacity(theme.primary, 0.04),
        borderWidth: 1,
        borderColor: active ? theme.primary : withOpacity(theme.border, 0.7),
      }}
    >
      <Text
        className="text-[12px] font-black uppercase"
        numberOfLines={1}
        style={{
          color: active ? theme.primaryForeground : theme.mutedForeground,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
})
