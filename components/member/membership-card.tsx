import { memo } from "react"
import { Crown, ShieldCheck } from "lucide-react-native"
import { View } from "react-native"

import type { Membership } from "@/lib/member/membership"
import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

/**
 * Membership, stated plainly.
 *
 * The wording is the point. A member who turned off auto-renew still has what
 * they paid for until the period ends, so this reads "Access ends 12 Mar" —
 * never "Cancelled", which would suggest they had already lost it.
 */

type MembershipCardProps = {
  membership: Membership
  /**
   * The member's own `subscriptions` row, when it could be read.
   *
   * It wins over `membership.detail` where they disagree, because the profile
   * fields are a cache the server refreshes on a sweep and this row is what the
   * sweep reads. `null` is normal — a member who never subscribed has no row —
   * so the cached line stays the fallback rather than an error state.
   */
  subscriptionDetail?: string | null
  onUpgrade: () => void
  onManage?: () => void
}

export const MembershipCard = memo(function MembershipCard({
  membership,
  subscriptionDetail,
  onUpgrade,
  onManage,
}: MembershipCardProps) {
  const theme = useThemePalette()
  const isPaid = membership.isPremium
  const accent = isPaid ? theme.accentText : theme.mutedForeground

  return (
    <Card>
      <CardContent className="gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              {isPaid ? (
                <Crown size={16} color={theme.accentText} />
              ) : (
                <ShieldCheck size={16} color={theme.mutedForeground} />
              )}
              <Text variant="subheading">
                {membership.planName ?? "Membership"}
              </Text>
            </View>

            <Text variant="caption">
              {subscriptionDetail || membership.detail}
            </Text>
          </View>

          <Badge tone={isPaid ? "accent" : "muted"} size="sm">
            {membership.label}
          </Badge>
        </View>

        {isPaid && membership.daysRemaining !== null ? (
          <View
            className="rounded-md px-3 py-2"
            style={{ backgroundColor: withOpacity(accent, 0.1) }}
          >
            <Text variant="label" style={{ color: accent }}>
              {membership.daysRemaining} days remaining
            </Text>
          </View>
        ) : null}

        <View className="flex-row gap-2">
          {!isPaid ? (
            <Button size="sm" onPress={onUpgrade} className="flex-1">
              <Text>
                {membership.state === "expired" ? "Renew" : "Go premium"}
              </Text>
            </Button>
          ) : null}

          {onManage ? (
            <Button
              size="sm"
              variant="outline"
              onPress={onManage}
              className={isPaid ? "flex-1" : undefined}
            >
              <Text>Manage</Text>
            </Button>
          ) : null}
        </View>
      </CardContent>
    </Card>
  )
})
