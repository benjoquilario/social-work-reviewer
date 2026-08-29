import { Query } from "../appwrite"
import { findFirst, tryCreateRow, updateRow } from "../db"
import { isMemberType, type MemberType, type ReviewerTableDocument } from "../schema"

/**
 * ─── The part of a member other members can see ───────────────────────────
 *
 * New in v4, and the reason it exists is worth stating plainly.
 *
 * `user_profiles` used to be `member_public`, because the forum has to render
 * an author's name. It also carries `email`, `licenseNumber`,
 * `schoolOrEmployer` and `schoolName`. So every signed-in account could read
 * every other member's email address and PRC licence number, in bulk, with one
 * call. Nothing in the app offered it. Nothing had to — the table's access
 * model *is* the privacy, and no amount of the app declining to render a field
 * makes it private.
 *
 * So identity split in two. `user_profiles` went `member_private` and keeps
 * everything real; this table holds the three things a stranger may see.
 *
 * **Adding a column here publishes it to every member of the app.** The
 * question before adding one is not "would a screen show this" but "would we be
 * comfortable with a competitor exporting this column for the whole
 * membership", because that is what the column means. Specifically not here:
 * an email address, a licence number, and anything about payment or membership
 * state — a premium badge on a post is a list of who to phish.
 */

type PublicProfileDocument = ReviewerTableDocument<"user_public_profiles">

export type PublicProfileInput = {
  userId: string
  displayName: string
  avatarUrl?: string | null
  /** Validated before it is stored — an unrecognised value reads as "not said". */
  memberType?: string | null
}

/**
 * `null` rather than a guess, the same rule the private profile follows.
 *
 * Null and not `""`: the column is an optional enum, so a blank string is not
 * one of its values, and "not said" is the absence of an answer rather than an
 * answer of nothing.
 */
function toStoredMemberType(value: unknown): MemberType | null {
  return isMemberType(value) ? value : null
}

/**
 * Creates the public row, or updates the one already there.
 *
 * `userId` is uniquely indexed, so a second create comes back 409. That makes
 * the safe pattern "try to create, and on conflict update what exists" — one
 * request in the common case, two only when the row was already written, and
 * no read-before-write to race.
 */
export async function upsertPublicProfile(
  input: PublicProfileInput
): Promise<void> {
  if (!input.userId || !input.displayName.trim()) {
    return
  }

  const data = {
    userId: input.userId,
    displayName: input.displayName.trim(),
    avatarUrl: input.avatarUrl?.trim() || "",
    memberType: toStoredMemberType(input.memberType),
  }

  const created = await tryCreateRow(
    "user_public_profiles",
    { ...data, createdAt: new Date().toISOString() },
    { ownerId: input.userId }
  )

  if (created) {
    return
  }

  // 409: the row exists. Find it and bring it up to date.
  const existing = await findFirst("user_public_profiles", [
    Query.equal("userId", input.userId),
  ])

  if (existing) {
    await updateRow("user_public_profiles", existing.$id, data)
  }
}

/** The member's own public row, for showing them how they appear to others. */
export async function getPublicProfile(
  userId: string
): Promise<PublicProfileDocument | null> {
  if (!userId) {
    return null
  }

  return findFirst("user_public_profiles", [Query.equal("userId", userId)])
}

/**
 * Whether an edit to the private profile needs to be mirrored publicly.
 *
 * Only three fields are visible to other members, so an edit that changes a
 * licence number or a school should not cost a second write.
 */
export function affectsPublicProfile(changes: {
  fullName?: string | null
  avatarUrl?: string | null
  memberType?: string | null
}): boolean {
  return (
    changes.fullName !== undefined ||
    changes.avatarUrl !== undefined ||
    changes.memberType !== undefined
  )
}
