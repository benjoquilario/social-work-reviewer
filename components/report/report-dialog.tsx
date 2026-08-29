import { memo, useCallback, useState } from "react"

import {
  getReportCopy,
  getReportReasons,
  type ReportableContentType,
  type ReportReason,
} from "@/lib/moderation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Text } from "@/components/ui/text"
import { ReportDetailField } from "./report-detail-field"
import { ReportReasonList } from "./report-reason-list"

/**
 * Reporting anything reportable — a post, comment, reply, question or lesson.
 *
 * There is deliberately no "you already reported this" state shown up front and
 * no list of past reports: `flagged_content` is create-only from a client, so
 * the app genuinely cannot look — and a readable moderation queue would tell
 * somebody exactly which of their posts got through (section 11).
 *
 * This file is the shell: open/close, the selection, and submitting. The
 * reasons, the copy and the hint all come from `lib/moderation`, so adding a
 * reportable kind is one change there rather than a branch in here.
 */

type ReportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Decides the title, the description and the preset reasons. */
  contentType: ReportableContentType
  onSubmit: (reason: string) => Promise<void>
}

export const ReportDialog = memo(function ReportDialog({
  open,
  onOpenChange,
  contentType,
  onSubmit,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const copy = getReportCopy(contentType)
  const reasons = getReportReasons(contentType)

  const close = useCallback(() => {
    setReason(null)
    setDetail("")
    onOpenChange(false)
  }, [onOpenChange])

  const handleSubmit = useCallback(async () => {
    if (!reason) {
      return
    }

    setIsSubmitting(true)

    try {
      // The free-text note rides along with the preset, so the queue stays
      // triageable by reason while keeping whatever context they added.
      await onSubmit(detail.trim() ? `${reason} — ${detail.trim()}` : reason)
      close()
    } finally {
      setIsSubmitting(false)
    }
  }, [close, detail, onSubmit, reason])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <ReportReasonList
          reasons={reasons}
          selected={reason}
          onSelect={setReason}
        />

        <ReportDetailField
          contentType={contentType}
          value={detail}
          onChangeText={setDetail}
        />

        <DialogFooter className="flex-row">
          <Button variant="outline" className="flex-1" onPress={close}>
            <Text>Cancel</Text>
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={!reason || isSubmitting}
            onPress={() => void handleSubmit()}
          >
            <Text>{isSubmitting ? "Sending…" : "Report"}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
