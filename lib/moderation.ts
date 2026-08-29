import { tryCreateRow } from "./db"
import type { FlaggedContentDocument } from "./schema"

/**
 * ─── Reporting ────────────────────────────────────────────────────────────
 *
 * The one thing the app may do with `flagged_content`.
 *
 * The table is `member_submit`: **create only, with no read at all** and row
 * security switched off. That shape is deliberate — a member must not be able
 * to see what has been reported, including their own reports, because a
 * readable moderation queue tells a bad actor exactly which of their posts got
 * through.
 *
 * Three consequences fall straight out of it:
 *
 *   • The create carries **no permissions**. Appwrite rejects a create that
 *     sends them to a table with row security off, so `createRow` drops them —
 *     `tableNeedsRowPermissions("flagged_content")` is false.
 *   • The app cannot check whether a report already exists before filing one.
 *   • So the unique index on `(reportedBy, contentType, contentId)` is the only
 *     channel that can tell it. A 409 means *already reported*, and the honest
 *     thing to show for that is the same thank-you as a first report — see
 *     gotcha 10.
 *
 * New in v3: `question` and `material` joined the community content types.
 * That is a small change with a large consequence. A reviewer app's whole
 * credibility is its answer key, and until now a member who found a wrong one
 * had nowhere to put it — so it went to a Facebook group, or a one-star review,
 * or nowhere, while the item stayed wrong for everybody who reached it next.
 */

export type ReportableContentType = FlaggedContentDocument["contentType"]

export type ReportContentInput = {
  contentType: ReportableContentType
  /**
   * The row `$id` for community content — but a question's **SKU**.
   *
   * Row IDs are reissued when the CMS re-imports a sheet, so a report filed
   * against `$id` points at nothing after the next upload, which is precisely
   * when somebody would be acting on it. The SKU is also the identity an
   * encoder can search for (gotcha 5).
   */
  contentId: string
  /** The signed-in member filing the report. */
  reportedBy: string
  reason: string
}

export type ReportOutcome = {
  /**
   * True when this member had already reported this item.
   *
   * Worth surfacing as reassurance ("you have already reported this") rather
   * than as an error, and never worth blocking on.
   */
  alreadyReported: boolean
}

// ─── Reasons ────────────────────────────────────────────────────────────────
//
// The presets are the app's, not the schema's — `reason` is free text. They
// exist so the queue is triageable at a glance instead of being a wall of
// prose, which is what decides whether reports actually get worked.
//
// A question report wants different reasons from a post report. Offering
// "Harassment or bullying" against an exam item, or "The answer is wrong"
// against a forum post, trains people to pick whichever is nearest and the
// preset stops meaning anything.

/** Reporting a post, comment or reply. */
export const COMMUNITY_REPORT_REASONS = [
  "Harassment or bullying",
  "Spam or advertising",
  "Wrong or misleading information",
  "Exam content shared without permission",
  "Something else",
] as const

/**
 * Reporting a question or a learning material.
 *
 * "The answer is wrong" is first because it is the one that matters: it is the
 * report that protects the product, and burying it under softer options is how
 * you end up never hearing it.
 */
export const CONTENT_REPORT_REASONS = [
  "The answer is wrong",
  "The explanation does not match the answer",
  "There is a typo or formatting problem",
  "The question is unclear",
  "Something else",
] as const

export type CommunityReportReason = (typeof COMMUNITY_REPORT_REASONS)[number]
export type ContentReportReason = (typeof CONTENT_REPORT_REASONS)[number]
export type ReportReason = CommunityReportReason | ContentReportReason

/** Which preset list belongs to this kind of target. */
export function getReportReasons(
  contentType: ReportableContentType
): readonly ReportReason[] {
  return contentType === "question" || contentType === "material"
    ? CONTENT_REPORT_REASONS
    : COMMUNITY_REPORT_REASONS
}

/** What the dialog calls itself, and what it promises will happen. */
export function getReportCopy(contentType: ReportableContentType) {
  switch (contentType) {
    case "question":
      return {
        title: "Report this question",
        description:
          "Goes straight to the team that writes the items. Tell us what looks wrong and they will check it against the source.",
      }
    case "material":
      return {
        title: "Report this lesson",
        description:
          "Goes straight to the team that writes the lessons. Tell us what looks wrong and they will check it.",
      }
    default:
      return {
        title: "Report this post",
        description:
          "The team reviews reports privately. The author is not told who reported them.",
      }
  }
}

export async function reportContent(
  input: ReportContentInput
): Promise<ReportOutcome> {
  const reason = input.reason.trim()

  if (!reason) {
    throw new Error("Tell us what looks wrong.")
  }

  if (!input.reportedBy) {
    throw new Error("You need to be signed in to report something.")
  }

  // `createdAt` is required as of v3 and `newRowDefaults` fills it with now —
  // the queue is worked oldest first, and it needs an ordering column the
  // schema owns because no index in `schema.ts` can reference `$createdAt`.
  const created = await tryCreateRow("flagged_content", {
    contentType: input.contentType,
    contentId: input.contentId,
    reportedBy: input.reportedBy,
    reason,
    // The dashboard moves it on from here.
    status: "pending",
  })

  return { alreadyReported: created === null }
}
