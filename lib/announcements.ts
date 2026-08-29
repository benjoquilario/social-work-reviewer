import { Query } from "./appwrite"
import { buildDeterministicRowId, listAll, listPage, tryCreateRow } from "./db"
import type { MembershipState } from "./member/membership"
import type { ReviewerTableDocument } from "./schema"

/**
 * ─── Announcements ────────────────────────────────────────────────────────
 *
 * The Updates tab, backed by the database at last.
 *
 * It used to render `data/news-data.ts` — six items hardcoded in TypeScript,
 * with date labels reading "Today" and "Mar 19, 2026" that could only ever
 * change in an app release. Meanwhile `announcements` sat in the schema,
 * readable, with an `audience` enum that already modelled exactly the right
 * targets, and not one line of app code touched it.
 *
 * **`audience` is a targeting hint, not a secret.** The table is `app_readonly`,
 * so every member can read every row whatever its audience — a free member can
 * read the premium announcement if they go looking. The filtering below is
 * about relevance, never privacy, and the backend writes announcements on that
 * understanding (section 19, item 9).
 */

type AnnouncementDocument = ReviewerTableDocument<"announcements">

export type AnnouncementAudience = AnnouncementDocument["audience"]

export type Announcement = {
  id: string
  title: string
  content: string
  audience: AnnouncementAudience
  publishedAt: string
  expiresAt: string | null
}

function toAnnouncement(row: AnnouncementDocument): Announcement {
  return {
    id: row.$id,
    title: row.title ?? "",
    content: row.content ?? "",
    audience: row.audience ?? "all",
    publishedAt: row.publishedAt ?? "",
    expiresAt: row.expiresAt || null,
  }
}

export type AnnouncementViewer = {
  membershipState: MembershipState
  isPremium: boolean
  /** Blank when the member has not said. */
  memberType: string
}

/**
 * Whether this announcement is meant for this member.
 *
 * The first four options read membership; the rest read `memberType`. An
 * unset `memberType` matches only the membership-based audiences, which is
 * right — somebody who never told us they are a retaker should not be shown
 * a message written for retakers.
 */
export function matchesAudience(
  audience: AnnouncementAudience,
  viewer: AnnouncementViewer
): boolean {
  switch (audience) {
    case "all":
      return true
    case "premium":
      return viewer.isPremium
    case "free":
      // Somebody whose membership lapsed is not "free" — there is a separate
      // audience for them, and it is the one worth the most.
      return !viewer.isPremium && viewer.membershipState !== "expired"
    case "expired":
      return viewer.membershipState === "expired"
    default:
      return viewer.memberType === audience
  }
}

/**
 * Everything published, not expired, and aimed at this member — newest first.
 *
 * Publication is a date window, not a flag: there is no `isPublished` column,
 * so a row scheduled for next week is excluded by `publishedAt <= now` and one
 * that has run its course is dropped by `expiresAt`. Appwrite cannot express
 * "expiresAt is blank OR in the future" in a single query, so that half is
 * filtered here.
 */
export async function listAnnouncements(params: {
  viewer: AnnouncementViewer
  limit?: number
}): Promise<Announcement[]> {
  const now = new Date().toISOString()

  const { rows } = await listPage(
    "announcements",
    [
      Query.lessThanEqual("publishedAt", now),
      // Ordering stands on `idx_ann_published`. Without that index this is an
      // error rather than a slow read (section 15).
      Query.orderDesc("publishedAt"),
    ],
    params.limit ?? 50
  )

  return rows
    .map(toAnnouncement)
    .filter((announcement) => {
      if (announcement.expiresAt && announcement.expiresAt <= now) {
        return false
      }

      return matchesAudience(announcement.audience, params.viewer)
    })
}

// ─── The unread dot ─────────────────────────────────────────────────────────
//
// The badge on Home has to be able to *clear*, otherwise it is decoration: a
// dot that is always on teaches people to ignore it, and then it cannot do its
// one job when something genuinely lands.

export function getUnreadAnnouncementIds(
  announcements: readonly Announcement[],
  seenIds: readonly string[]
): string[] {
  const seen = new Set(seenIds)

  return announcements
    .filter((announcement) => !seen.has(announcement.id))
    .map((announcement) => announcement.id)
}

export function hasUnreadAnnouncements(
  announcements: readonly Announcement[],
  seenIds: readonly string[]
): boolean {
  return getUnreadAnnouncementIds(announcements, seenIds).length > 0
}

/**
 * A published date, said the way somebody scanning a list wants to read it.
 *
 * Relative for the first week because "3 days ago" answers *is this new* in one
 * glance, and absolute after that because "37 days ago" does not.
 */
export function formatAnnouncementDate(
  value: string,
  now: Date = new Date()
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000)

  if (days <= 0) {
    return "Today"
  }

  if (days === 1) {
    return "Yesterday"
  }

  if (days < 7) {
    return `${days} days ago`
  }

  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date)
}

// ─── Which ones they have read ──────────────────────────────────────────────
//
// New in v4. The badge used to be backed by a local preference, which meant it
// came back on a reinstall and disagreed across two devices — every old
// announcement arriving as "new" on a fresh phone. `announcement_reads` is
// `member_private`, one row per (member, announcement), unique so marking twice
// is a no-op.
//
// The local preference stays as the offline answer: an unread dot is not worth
// a spinner, and a failed read here should leave the badge as it was rather
// than lighting it up again.

/** One row per (member, announcement), so marking twice costs nothing. */
function buildReadRowId(userId: string, announcementId: string) {
  return buildDeterministicRowId("rd", [userId, announcementId])
}

export async function listReadAnnouncementIds(
  userId: string
): Promise<Set<string>> {
  if (!userId) {
    return new Set()
  }

  try {
    const rows = await listAll<"announcement_reads">(
      "announcement_reads",
      [Query.equal("userId", userId)],
      { label: "announcement reads", maxRows: 500 }
    )

    return new Set(rows.map((row) => row.announcementId))
  } catch {
    return new Set()
  }
}

export async function markAnnouncementsRead(params: {
  userId: string
  announcementIds: readonly string[]
}): Promise<void> {
  if (!params.userId || params.announcementIds.length === 0) {
    return
  }

  // One create per announcement, in parallel. A 409 means it was already read,
  // which `tryCreateRow` returns as null rather than throwing (gotcha 10).
  await Promise.all(
    params.announcementIds.map((announcementId) =>
      tryCreateRow(
        "announcement_reads",
        {
          userId: params.userId,
          announcementId,
          readAt: new Date().toISOString(),
        },
        {
          rowId: buildReadRowId(params.userId, announcementId),
          ownerId: params.userId,
        }
      ).catch(() => null)
    )
  )
}
