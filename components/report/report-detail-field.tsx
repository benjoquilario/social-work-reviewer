import { memo } from "react"

import type { ReportableContentType } from "@/lib/moderation"
import { FormField, Input } from "@/components/ui/input"

/**
 * The optional free-text note.
 *
 * The hint changes with the target because what is useful changes with it. On a
 * question, "what the answer should be, and why" is the single sentence that
 * turns a report into a fix; on a post it would be noise.
 */

type ReportDetailFieldProps = {
  contentType: ReportableContentType
  value: string
  onChangeText: (value: string) => void
}

function getHint(contentType: ReportableContentType) {
  return contentType === "question" || contentType === "material"
    ? "Optional. What it should say, and why, saves the most time."
    : "Optional."
}

export const ReportDetailField = memo(function ReportDetailField({
  contentType,
  value,
  onChangeText,
}: ReportDetailFieldProps) {
  return (
    <FormField label="Anything to add?" hint={getHint(contentType)}>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder="A sentence is plenty"
        multiline
      />
    </FormField>
  )
})
