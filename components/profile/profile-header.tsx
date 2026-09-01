import { memo } from "react"
import Camera from "lucide-react-native/icons/camera"
import Settings from "lucide-react-native/icons/settings"
import UserRoundPen from "lucide-react-native/icons/user-round-pen"
import { Pressable, View } from "react-native"

import { getBrandSurfacePalette, type ThemePalette } from "@/lib/theme"
import { BrandSurface } from "@/components/ui/brand-surface"
import { Text } from "@/components/ui/text"
import { CommunityAvatar } from "@/components/community/avatar"

/** Small pill used for the plan chip; white-on-dark, so it takes raw colors. */
function BrandChip({
  label,
  emphasis = "soft",
}: {
  label: string
  emphasis?: "soft" | "gold"
}) {
  const brand = getBrandSurfacePalette()
  const isGold = emphasis === "gold"

  return (
    <View
      className="self-start rounded-full border px-2.5 py-1"
      style={{
        backgroundColor: isGold
          ? "hsl(45 96% 58% / 0.18)"
          : brand.overlayStrong,
        borderColor: isGold ? "hsl(45 96% 58% / 0.45)" : brand.border,
      }}
    >
      <Text
        className="text-2xs font-black uppercase tracking-[1px]"
        style={{ color: isGold ? brand.accent : brand.foreground }}
      >
        {label}
      </Text>
    </View>
  )
}

/**
 * Identity, and nothing else.
 *
 * The old header opened with a two-line marketing headline and a paragraph of
 * body copy above the fold — roughly 200px explaining what a profile is to
 * someone already looking at theirs — then repeated plan, verification and
 * completion across a stat strip and a progress block. This carries the
 * avatar, the name, the plan, and the one action that changes any of it.
 */
export const ProfileHeader = memo(function ProfileHeader({
  theme,
  displayName,
  username,
  memberSince,
  initials,
  avatarSource,
  isPremium,
  onOpenEdit,
  onOpenSettings,
}: {
  theme: ThemePalette
  displayName: string
  username: string
  memberSince: string
  initials: string
  avatarSource: string
  isPremium: boolean
  onOpenEdit: () => void
  onOpenSettings: () => void
}) {
  const brand = getBrandSurfacePalette()

  return (
    <BrandSurface className="gap-4 p-5">
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="label" style={{ color: brand.mutedForeground }}>
          Profile
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          className="h-10 w-10 items-center justify-center rounded-lg border"
          style={{
            backgroundColor: brand.overlayStrong,
            borderColor: brand.border,
          }}
          onPress={onOpenSettings}
        >
          <Settings size={17} color={brand.foreground} />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-4">
        <View>
          <CommunityAvatar
            label={initials}
            sourceUri={avatarSource}
            theme={theme}
            size="xl"
            tone="brand"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            className="absolute -bottom-1.5 -right-1.5 h-8 w-8 items-center justify-center rounded-full border-2 bg-white"
            style={{ borderColor: brand.gradientMid }}
            onPress={onOpenEdit}
          >
            <Camera size={14} color={brand.gradientMid} />
          </Pressable>
        </View>

        <View className="flex-1 gap-1.5">
          <Text className="text-xl font-black leading-7" numberOfLines={1}>
            {displayName}
          </Text>
          <Text
            variant="caption"
            style={{ color: brand.mutedForeground }}
            numberOfLines={1}
          >
            {username} · since {memberSince}
          </Text>
          <BrandChip
            label={isPremium ? "Premium" : "Free plan"}
            emphasis={isPremium ? "gold" : "soft"}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
        className="h-11 flex-row items-center justify-center gap-2 rounded-md bg-white active:opacity-90"
        onPress={onOpenEdit}
      >
        <UserRoundPen size={15} color={brand.gradientMid} />
        <Text className="text-sm font-extrabold text-brand-navy">
          Edit profile
        </Text>
      </Pressable>
    </BrandSurface>
  )
})
