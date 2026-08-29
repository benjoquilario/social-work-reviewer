import {
  getMemberTypeLabel,
  isMemberType,
  type MemberType,
  type SubscriptionStatus,
  type UserProfileDocument,
} from "../schema"
import { resolveCmsAssetUrl } from "../db"

/**
 * ─── Who the member is ────────────────────────────────────────────────────
 *
 * Section 14. Two different things wear the word "role" and only one of them
 * belongs to the app.
 *
 * `user_roles.role` is a **dashboard job** — encoder, moderator, admin. The app
 * never reads it, never branches on it, and never unlocks anything with it. An
 * admin who opens this app gets exactly the screens anyone else gets, with
 * exactly the same paywall.
 *
 * `user_profiles.memberType` is **who somebody is** — a student, a graduate
 * sitting the board, a retaker, a licensed social worker doing CPD. It is ours,
 * it is optional, and it grants nothing. It shapes copy and announcement
 * targeting, never access.
 *
 * Premium is the only thing that gates a screen, and it comes from
 * `isPremium` / `premiumUntil` — see `./membership`.
 */

export type MemberProfile = {
  $id: string
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null

  /** Optional, blank is a normal answer. Never a permission. */
  memberType: MemberType | null
  /** The BSSW school, or the agency. Free text. */
  schoolOrEmployer: string | null
  /** PRC licence, only when they volunteer it. */
  licenseNumber: string | null

  /**
   * The four cached membership fields. **Read-only to the app** — the server
   * writes them from verified Play data or an access code redemption.
   */
  isPremium: boolean
  premiumUntil: string | null
  planName: string | null
  subscriptionStatus: SubscriptionStatus | "none"

  lastActiveAt: string | null
  createdAt: string
}

/**
 * `schoolName` is the older column and some rows still only have it.
 * `schoolOrEmployer` is what the notes name and what new writes use, so reads
 * prefer it and fall back — no migration window needed.
 */
function resolveSchool(row: UserProfileDocument) {
  return (
    row.schoolOrEmployer?.trim() ||
    row.schoolName?.trim() ||
    null
  )
}

export function toMemberProfile(row: UserProfileDocument): MemberProfile {
  return {
    $id: row.$id,
    userId: row.userId,
    fullName: row.fullName ?? "Reviewer",
    email: row.email ?? "",
    avatarUrl: resolveCmsAssetUrl(row.avatarUrl),
    memberType: isMemberType(row.memberType) ? row.memberType : null,
    schoolOrEmployer: resolveSchool(row),
    licenseNumber: row.licenseNumber?.trim() || null,
    isPremium: row.isPremium === true,
    premiumUntil: row.premiumUntil ?? null,
    planName: row.planName?.trim() || null,
    subscriptionStatus: row.subscriptionStatus ?? "none",
    lastActiveAt: row.lastActiveAt ?? null,
    createdAt: row.createdAt ?? row.$createdAt,
  }
}

/** "Licensed social worker", or "Not said" when they skipped the question. */
export function getMemberTypeDisplay(profile: MemberProfile | null) {
  return getMemberTypeLabel(profile?.memberType)
}

/** First name, for greetings. Falls back to the whole string, then "there". */
export function getFirstName(profile: MemberProfile | null) {
  const first = profile?.fullName?.trim().split(/\s+/)[0]
  return first || "there"
}

export function getInitials(profile: MemberProfile | null) {
  const parts = profile?.fullName?.trim().split(/\s+/).filter(Boolean) ?? []

  if (parts.length === 0) {
    return "SW"
  }

  const [first, last] = [parts[0], parts[parts.length - 1]]

  return (
    first.charAt(0) + (parts.length > 1 ? last.charAt(0) : "")
  ).toUpperCase()
}

/**
 * The fields the app is allowed to change on a profile.
 *
 * Deliberately does not include `isPremium`, `premiumUntil`, `planName` or
 * `subscriptionStatus` — a client that can write those can grant itself
 * access.
 */
export type MemberProfileEdit = {
  fullName: string
  memberType?: MemberType | null
  schoolOrEmployer?: string | null
  licenseNumber?: string | null
  avatarUrl?: string | null
}

/**
 * The snapshot copied onto a badge or an achievement row.
 *
 * `reviewType` on `learning_achievements` is a display string, not the
 * profile's `memberType` value — it stores the *label* as it read at the time
 * the badge was earned, so a student who graduates in June does not retitle a
 * certificate issued in March.
 */
export function toAchievementSnapshot(profile: MemberProfile | null) {
  if (!profile) {
    return undefined
  }

  return {
    fullName: profile.fullName,
    schoolName: profile.schoolOrEmployer,
    reviewType: profile.memberType ? getMemberTypeLabel(profile.memberType) : null,
    avatarUrl: profile.avatarUrl,
  }
}

/**
 * The one-line descriptor under a member's name in the community.
 *
 * Falls through rather than printing "Not said" — under a post, an unanswered
 * optional question should show the next useful thing instead of announcing
 * its own absence.
 */
export function getMemberByline(
  profile: Pick<
    MemberProfile,
    "memberType" | "schoolOrEmployer" | "email"
  > | null,
  fallback = "Community member"
) {
  if (!profile) {
    return fallback
  }

  return (
    (profile.memberType ? getMemberTypeLabel(profile.memberType) : null) ??
    profile.schoolOrEmployer ??
    profile.email ??
    fallback
  )
}
