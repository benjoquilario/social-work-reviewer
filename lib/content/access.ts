import { hasActivePremium } from "../schema"

/**
 * ─── Who may open what ────────────────────────────────────────────────────
 *
 * Section 9 of the notes, in one place. Three flags decide it and they stack
 * rather than override each other:
 *
 *   exam_categories.isPremium    the whole category is paid
 *   learning_materials.isPremium that one material is paid
 *   questions.isFree             an opt-in free sample INSIDE a paid category
 *
 * Everything here is UX. The server checks again on every read that matters,
 * and these tables have no public read permission by design — a client-side
 * check decides what to draw, never what is allowed.
 */

/** The only thing content needs to know about the person reading it. */
export type ContentViewer = {
  /** Already through `hasActivePremium` — flag *and* date. */
  isPremium: boolean
}

/**
 * The viewer, resolved from a profile row.
 *
 * Goes through `hasActivePremium` rather than reading `isPremium` directly, so
 * a subscription that lapsed an hour ago stops granting access immediately
 * instead of waiting for the nightly sweep to flip the cached flag.
 */
export function toContentViewer(
  profile:
    | { isPremium?: boolean | null; premiumUntil?: string | null }
    | null
    | undefined,
  now?: Date
): ContentViewer {
  return { isPremium: profile ? hasActivePremium(profile, now) : false }
}

export const ANONYMOUS_VIEWER: ContentViewer = { isPremium: false }

export function canOpenCategory(
  category: { isPremium: boolean },
  viewer: ContentViewer
) {
  return !category.isPremium || viewer.isPremium
}

/**
 * A question is open when its category is free, the member pays, or the CMS
 * marked this specific item as a free sample.
 */
export function canOpenQuestion(
  question: { isFree: boolean },
  category: { isPremium: boolean },
  viewer: ContentViewer
) {
  return !category.isPremium || question.isFree || viewer.isPremium
}

export function canOpenMaterial(
  material: { isPremium: boolean },
  viewer: ContentViewer
) {
  return !material.isPremium || viewer.isPremium
}

export type LockReason = "none" | "premium_category" | "premium_material"

export function describeCategoryLock(
  category: { isPremium: boolean },
  viewer: ContentViewer
): LockReason {
  return canOpenCategory(category, viewer) ? "none" : "premium_category"
}
