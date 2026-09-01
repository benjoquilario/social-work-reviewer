import { Query } from "../appwrite"
import { findFirst } from "../db"
import { formatMoney, hasActivePremium } from "../schema"
import type { MemberProfile } from "./profile"

/**
 * ─── Membership ───────────────────────────────────────────────────────────
 *
 * Section 6, and its one rule: **`subscriptions` decides access, the profile
 * only caches the answer.** The app never writes any of it.
 *
 * The subtlety worth reading twice: **cancelling is not losing access.** A
 * member who turned off auto-renew paid for the period and keeps it until
 * `premiumUntil`. Only `expired` or a refund cuts it off. An app that hides
 * content the moment somebody cancels is taking back something already paid
 * for — so the copy below says "Access ends" rather than "Cancelled".
 */

export type MembershipState =
  | "free"
  | "active"
  | "lifetime"
  | "ending"
  | "expired"
  | "pending"

export type Membership = {
  /** The paywall answer. Checks the date as well as the cached flag. */
  isPremium: boolean
  state: MembershipState
  /** Short label for a badge: "Premium", "Free", "Expired". */
  label: string
  /** One line for a card: "Renews 12 Mar 2026", "Access ends 12 Mar 2026". */
  detail: string
  planName: string | null
  premiumUntil: string | null
  /** Days left, or null for a free or lifetime membership. */
  daysRemaining: number | null
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function formatDate(value: string | null) {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date)
}

function daysBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000)
}

export function getMembership(
  profile: Pick<
    MemberProfile,
    "isPremium" | "premiumUntil" | "planName" | "subscriptionStatus"
  > | null,
  now: Date = new Date()
): Membership {
  if (!profile) {
    return {
      isPremium: false,
      state: "free",
      label: "Free",
      detail: "Sign in to see your membership.",
      planName: null,
      premiumUntil: null,
      daysRemaining: null,
    }
  }

  const isPremium = hasActivePremium(profile, now)
  const planName = profile.planName?.trim() || null
  const premiumUntil = profile.premiumUntil ?? null

  if (!isPremium) {
    if (profile.subscriptionStatus === "pending") {
      return {
        isPremium: false,
        state: "pending",
        label: "Pending",
        detail: "We are confirming your purchase with Google Play.",
        planName,
        premiumUntil,
        daysRemaining: null,
      }
    }

    const hasLapsed =
      profile.subscriptionStatus === "expired" ||
      profile.subscriptionStatus === "cancelled" ||
      Boolean(premiumUntil)

    return {
      isPremium: false,
      state: hasLapsed ? "expired" : "free",
      label: hasLapsed ? "Expired" : "Free",
      detail: hasLapsed
        ? `Your access ended ${formatDate(premiumUntil) || "recently"}.`
        : "Free plan — sample items only in premium categories.",
      planName,
      premiumUntil,
      daysRemaining: null,
    }
  }

  // Blank `premiumUntil` on an active membership means lifetime.
  if (!premiumUntil) {
    return {
      isPremium: true,
      state: "lifetime",
      label: "Premium",
      detail: planName ? `${planName} — lifetime access.` : "Lifetime access.",
      planName,
      premiumUntil: null,
      daysRemaining: null,
    }
  }

  const until = new Date(premiumUntil)
  const daysRemaining = Math.max(daysBetween(now, until), 0)
  const isEnding = profile.subscriptionStatus === "cancelled"

  return {
    isPremium: true,
    state: isEnding ? "ending" : "active",
    label: "Premium",
    detail: isEnding
      ? `Access ends ${formatDate(premiumUntil)}.`
      : `Renews ${formatDate(premiumUntil)}.`,
    planName,
    premiumUntil,
    daysRemaining,
  }
}

/**
 * The stored price, for a plan card before Play answers.
 *
 * Play's `getFormattedPrice()` is the amount actually charged — localized and
 * subject to regional pricing — so it wins the moment it arrives. This is the
 * placeholder, and the admin's own reporting number.
 */
export function formatPlanPrice(amount: number, currency = "PHP") {
  return formatMoney(amount, currency)
}

// ─── The member's own subscription row ──────────────────────────────────────
//
// New in v3. `subscriptions` is `server_private`: the table grants nothing, and
// the only rows reachable are the ones a grant names. The server now grants the
// owning member `read` on every row it writes, so one screen can finally show
// the truth instead of the cache.
//
// Read and nothing else, deliberately — a member who could write here could
// extend their own membership. `subscriptions` stays on the *never written by
// the app* list in section 10.
//
// Everything else in the app keeps gating on `hasActivePremium(profile)`. One
// screen needing the truth is not a reason to make every screen pay for the
// extra query.

export type MemberSubscription = {
  id: string
  planName: string | null
  status: string
  startsAt: string | null
  endsAt: string | null
  /** Decides "Renews on" versus "Access ends" — see below. */
  autoRenew: boolean
  source: string | null
  amountPaid: number
  currency: string
}

export async function getCurrentSubscription(
  userId: string
): Promise<MemberSubscription | null> {
  if (!userId) {
    return null
  }

  // Newest first: a renewal writes a new row, and the latest one is the one
  // that describes the access they have now.
  const row = await findFirst("subscriptions", [
    Query.equal("userId", userId),
    Query.orderDesc("startsAt"),
  ])

  if (!row) {
    return null
  }

  return {
    id: row.$id,
    planName: row.planName?.trim() || null,
    status: row.status ?? "pending",
    startsAt: row.startsAt ?? null,
    endsAt: row.endsAt ?? null,
    autoRenew: Boolean(row.autoRenew),
    source: row.source ?? null,
    amountPaid: row.amountPaid ?? 0,
    currency: row.currency || "PHP",
  }
}

const SOURCE_LABELS: Record<string, string> = {
  google_play: "Google Play",
  access_code: "Access code",
  promo: "Free promo",
  manual: "Granted by the team",
}

/**
 * What the membership screen says, from the row rather than the cache.
 *
 * `autoRenew` is what separates the two states that look identical in
 * `status: "active"` and are not: one bills again, the other stops. Reading it
 * off `status` alone produces "Cancelled" for somebody who still has three
 * weeks of paid access — which is both wrong and the fastest way to make them
 * stop opening the app for those three weeks.
 */
export function describeSubscription(subscription: MemberSubscription): {
  headline: string
  detail: string
  isEnding: boolean
} {
  const ends = formatDate(subscription.endsAt)
  const source = subscription.source
    ? (SOURCE_LABELS[subscription.source] ?? subscription.source)
    : null

  if (subscription.status === "refunded") {
    return {
      headline: "Refunded",
      detail: "This purchase was refunded, so access ended with it.",
      isEnding: false,
    }
  }

  if (subscription.status === "expired") {
    return {
      headline: "Expired",
      detail: ends ? `Access ended ${ends}.` : "Access has ended.",
      isEnding: false,
    }
  }

  if (subscription.status === "pending") {
    return {
      headline: "Confirming",
      detail: "We are confirming this purchase with Google Play.",
      isEnding: false,
    }
  }

  // ─── Play's payment-failure states (v5) ───────────────────────────────────
  //
  // Google does not cancel on a declined card. It retries for up to 30 days
  // with the member still subscribed (`in_grace_period`), and only stops when
  // it gives up (`on_hold`). `paused` is the member's own doing, from Play.
  //
  // Grace period is the one worth getting right: they have not cancelled, have
  // done nothing wrong, and still have everything they paid for. Falling
  // through to the "Renews on…" line below would be worse than useless — it
  // would tell somebody whose card just expired that everything is fine, and
  // the first they would hear of it is losing access a month later.

  if (subscription.status === "in_grace_period") {
    return {
      headline: subscription.planName ?? "Premium",
      detail: ends
        ? `We could not charge your card. Access continues until ${ends} — update your payment method in Play.`
        : "We could not charge your card. Update your payment method in Play.",
      isEnding: true,
    }
  }

  if (subscription.status === "on_hold") {
    return {
      headline: "On hold",
      detail:
        "Your subscription is on hold. Update your payment method in Play to restore access.",
      isEnding: false,
    }
  }

  if (subscription.status === "paused") {
    return {
      headline: "Paused",
      detail: "Your subscription is paused. Resume it in Play.",
      isEnding: false,
    }
  }

  const isEnding = !subscription.autoRenew

  // `cancelled` belongs here with `active`, not with the lapsed states above:
  // auto-renew is off, but the period is paid for and still running. Which of
  // the two lines it gets is decided by `autoRenew`, not by the status.
  if (subscription.status === "active" || subscription.status === "cancelled") {
    return {
      headline: subscription.planName ?? "Premium",
      detail: [
        ends ? (isEnding ? `Access ends ${ends}` : `Renews ${ends}`) : "Lifetime access",
        source ? `via ${source}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      isEnding,
    }
  }

  // A status this build has never heard of. Play adds notification types over
  // time and the server maps them straight through, so this will happen to a
  // shipped app eventually. State the date and stop — claiming "Renews" for an
  // unknown state is how a lapsed membership ends up reassuring somebody.
  return {
    headline: subscription.planName ?? "Membership",
    detail: ends ? `Access through ${ends}.` : "Check your membership in Play.",
    isEnding: false,
  }
}
