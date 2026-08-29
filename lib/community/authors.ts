import { Query } from "../appwrite"
import { listAll } from "../db"
import { getMemberTypeLabel, isMemberType } from "../schema"
import type { ReviewerTableDocument } from "../schema"

/**
 * ─── Who wrote this ───────────────────────────────────────────────────────
 *
 * New in v4, and it replaces something that was quietly broken.
 *
 * The feed used to build an empty `profileMap` and then read `authorName`,
 * `authorSubtitle` and `authorAvatarUrl` off the post row — columns that have
 * never existed in the schema. Both halves resolved to nothing, so every byline
 * in the community rendered as `User 68a3f2` / "Community member". Nobody
 * noticed because it never threw.
 *
 * v4 gives it a real answer, and a private one. `user_profiles` went
 * `member_private`, because it carries an email address, a PRC licence number
 * and an employer, and being `member_public` meant every signed-in account
 * could read all three for the whole membership in one call. What other members
 * are allowed to see now lives in `user_public_profiles`, and that is the only
 * table this module touches (section 20).
 *
 * **Adding a column to that table publishes it to every member of the app.**
 * There is no halfway. This module deliberately reads three fields and asks for
 * nothing else.
 */

type PublicProfileDocument = ReviewerTableDocument<"user_public_profiles">

export type CommunityAuthor = {
  id: string
  name: string
  subtitle: string
  avatarSeed: string
  avatarUrl: string | null
}

export function toAvatarSeed(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "RV"
  )
}

/**
 * The author of a row, from whatever the public table could tell us.
 *
 * A member with no public profile row is invisible in the forum rather than
 * broken — their posts render under a neutral name. That happens to accounts
 * created before the v4 migration and to any sign-up where the second write
 * failed, which is why sign-up does both writes together.
 */
export function toCommunityAuthor(
  userId: string,
  profile?: PublicProfileDocument
): CommunityAuthor {
  const name = profile?.displayName?.trim() || "Community member"

  return {
    id: userId,
    name,
    // Who somebody is, not what they are allowed to do. Blank is a normal
    // answer — plenty of members never say — so this falls through to a
    // neutral label rather than guessing (section 14).
    subtitle: isMemberType(profile?.memberType)
      ? getMemberTypeLabel(profile.memberType)
      : "Community member",
    avatarSeed: toAvatarSeed(name),
    avatarUrl: profile?.avatarUrl?.trim() || null,
  }
}

/** Appwrite rejects an `equal` with an empty array, and 100 is its ceiling. */
const AUTHOR_CHUNK_SIZE = 100

/**
 * Every author on a page, in as few requests as possible.
 *
 * One query per 100 distinct authors, never one per post. A 20-post feed with
 * 20 different authors is one request here; the naive version is twenty, and it
 * is the difference between a feed that opens and a feed that stutters.
 *
 * `Query.equal` takes an array and reads as `IN`. The explicit limit matters —
 * gotcha 2 still applies, and a page with more than 25 distinct authors would
 * otherwise silently lose the rest, which shows up as *some* bylines being
 * right and the others saying "Community member".
 */
export async function getAuthorsByIds(
  userIds: readonly string[]
): Promise<Map<string, CommunityAuthor>> {
  const unique = [...new Set(userIds.filter(Boolean))]
  const authors = new Map<string, CommunityAuthor>()

  if (unique.length === 0) {
    return authors
  }

  const chunks: string[][] = []
  for (let index = 0; index < unique.length; index += AUTHOR_CHUNK_SIZE) {
    chunks.push(unique.slice(index, index + AUTHOR_CHUNK_SIZE))
  }

  const pages = await Promise.all(
    chunks.map((chunk) =>
      listAll<"user_public_profiles">(
        "user_public_profiles",
        [Query.equal("userId", chunk)],
        { label: "post authors", maxRows: AUTHOR_CHUNK_SIZE }
      ).catch(() => {
        // A byline is not worth failing a feed over. An unreadable author
        // table costs names; an exception costs the whole screen.
        return [] as PublicProfileDocument[]
      })
    )
  )

  for (const row of pages.flat()) {
    authors.set(row.userId, toCommunityAuthor(row.userId, row))
  }

  // Anyone the table had nothing for still needs an author object, or the
  // renderer has to handle undefined at every call site.
  for (const userId of unique) {
    if (!authors.has(userId)) {
      authors.set(userId, toCommunityAuthor(userId))
    }
  }

  return authors
}

/** One author, for a screen that renders a single row. */
export async function getAuthor(userId: string): Promise<CommunityAuthor> {
  const authors = await getAuthorsByIds([userId])
  return authors.get(userId) ?? toCommunityAuthor(userId)
}
