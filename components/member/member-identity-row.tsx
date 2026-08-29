import { memo } from "react"
import { Building2, IdCard, UserRound } from "lucide-react-native"
import { View } from "react-native"

import { getMemberTypeDisplay, type MemberProfile } from "@/lib/member/profile"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

/**
 * The three optional facts a member may have given about themselves.
 *
 * Every one of them can be blank, and blank is rendered as "Not said" rather
 * than hidden — an empty profile section reads as a bug, while an explicit
 * "Not said" reads as an invitation to fill it in.
 */

type MemberIdentityRowsProps = {
  profile: MemberProfile | null
}

type RowProps = {
  Icon: typeof UserRound
  label: string
  value: string
}

const Row = memo(function Row({ Icon, label, value }: RowProps) {
  const theme = useThemePalette()

  return (
    <View className="flex-row items-center gap-3 py-2">
      <Icon size={16} color={theme.mutedForeground} />
      <View className="flex-1 gap-0.5">
        <Text variant="label">{label}</Text>
        <Text variant="callout">{value}</Text>
      </View>
    </View>
  )
})

export const MemberIdentityRows = memo(function MemberIdentityRows({
  profile,
}: MemberIdentityRowsProps) {
  return (
    <View className="gap-0.5">
      <Row
        Icon={UserRound}
        label="Member type"
        value={getMemberTypeDisplay(profile)}
      />
      <Row
        Icon={Building2}
        label="School or employer"
        value={profile?.schoolOrEmployer ?? "Not said"}
      />
      <Row
        Icon={IdCard}
        label="PRC licence"
        value={profile?.licenseNumber ?? "Not said"}
      />
    </View>
  )
})
