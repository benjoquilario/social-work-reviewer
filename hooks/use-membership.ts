import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"

import { toContentViewer, type ContentViewer } from "@/lib/content/access"
import {
  describeSubscription,
  getCurrentSubscription,
  getMembership,
  type Membership,
} from "@/lib/member/membership"
import { queryKeys } from "@/lib/query-keys"

/**
 * ─── Can this member open paid content? ───────────────────────────────────
 *
 * The single answer, and the only one any screen should ask.
 *
 * It exists because `profile.isPremium` on its own is the **wrong** answer.
 * That field is a cache the server maintains, and it stays `true` from the
 * moment a subscription lapses until a sweep gets round to flipping it — so a
 * screen reading it directly keeps serving paid content to somebody who has
 * stopped paying, for hours. `hasActivePremium` checks `premiumUntil` as well
 * as the flag, so access ends when the period does (section 6).
 *
 * Every screen that used to write `profile?.isPremium === true` now calls this.
 */
export function useMembership(): {
  membership: Membership
  /** The paywall answer: flag **and** date. */
  isPremium: boolean
  /** The same answer, shaped for the content layer. */
  viewer: ContentViewer
} {
  const profile = useAuth((state) => state.profile)

  return useMemo(() => {
    const membership = getMembership(profile)

    return {
      membership,
      isPremium: membership.isPremium,
      viewer: toContentViewer(profile),
    }
  }, [profile])
}

/** Shorthand for the common case: "may this member open paid content?" */
export function useIsPremium() {
  return useMembership().isPremium
}

/**
 * The member's own `subscriptions` row — the truth, not the cache.
 *
 * Only the membership screen should call this. Everything else keeps reading
 * `useIsPremium()`, because the cached fields on the profile are already loaded
 * and one screen needing an exact renewal date is not a reason to put an extra
 * query behind every paywall check.
 *
 * `null` is a normal answer, not an error: a member who has never subscribed
 * has no row, and rows written before v3 granted the member no read permission,
 * so an old account can come back empty too.
 */
export function useSubscription() {
  const userId = useAuth((state) => state.user?.$id) ?? ""

  const query = useQuery({
    queryKey: queryKeys.member.subscription(userId),
    enabled: Boolean(userId),
    queryFn: () => getCurrentSubscription(userId),
    staleTime: 5 * 60 * 1000,
  })

  const subscription = query.data ?? null

  return {
    subscription,
    description: subscription ? describeSubscription(subscription) : null,
    isLoading: query.isLoading,
  }
}
