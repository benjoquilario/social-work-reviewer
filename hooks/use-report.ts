import { useCallback, useState } from "react"
import { Alert } from "react-native"

import { useAuth } from "@/contexts/auth-context"
import {
  reportContent,
  type ReportableContentType,
} from "@/lib/moderation"

/**
 * The report flow, in one place.
 *
 * Three screens file reports now — the feed, a post, and a question mid-session
 * — and each one was about to grow its own copy of the same try/catch, the same
 * two alerts and the same "which item is open" state. The wording of the
 * confirmation is the part worth centralising: it is the only feedback a member
 * ever gets, because `flagged_content` is create-only and nothing on screen
 * changes after a report.
 */

export type ReportTarget = {
  contentType: ReportableContentType
  /** Row `$id` for community content, the **SKU** for a question (gotcha 5). */
  contentId: string
  /** Shown nowhere; kept so a caller can tell which item is open. */
  label?: string
}

export function useReport() {
  const user = useAuth((state) => state.user)
  const [target, setTarget] = useState<ReportTarget | null>(null)

  const open = useCallback((next: ReportTarget) => setTarget(next), [])
  const close = useCallback(() => setTarget(null), [])

  const submit = useCallback(
    async (reason: string) => {
      if (!target || !user?.$id) {
        return
      }

      try {
        const outcome = await reportContent({
          contentType: target.contentType,
          contentId: target.contentId,
          reportedBy: user.$id,
          reason,
        })

        // A duplicate is not a failure. The unique index on
        // `(reportedBy, contentType, contentId)` is the only way the app can
        // ever learn a report already exists — it cannot read the table — so a
        // 409 arrives here as `alreadyReported`, and the member who did exactly
        // the right thing gets told so rather than shown a red error.
        Alert.alert(
          outcome.alreadyReported ? "Already reported" : "Report sent",
          outcome.alreadyReported
            ? "You have already reported this one. It is in the queue."
            : "Thanks — the team will take a look. You will not see a change here."
        )
      } catch (error) {
        Alert.alert(
          "Could not send that report",
          error instanceof Error
            ? error.message
            : "Please try again in a moment."
        )
      }
    },
    [target, user?.$id]
  )

  return {
    target,
    isOpen: target !== null,
    contentType: target?.contentType ?? "post",
    open,
    close,
    submit,
  }
}
