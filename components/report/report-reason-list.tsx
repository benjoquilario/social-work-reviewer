import { memo } from "react"
import { View } from "react-native"

import type { ReportReason } from "@/lib/moderation"
import { ReportReasonOption } from "./report-reason-option"

/**
 * The preset reasons for one kind of target.
 *
 * The list itself comes from `lib/moderation` rather than from here, because
 * which reasons apply is a property of what is being reported, not of how the
 * dialog looks. A question report and a post report are different acts.
 */

type ReportReasonListProps = {
  reasons: readonly ReportReason[]
  selected: ReportReason | null
  onSelect: (reason: ReportReason) => void
}

export const ReportReasonList = memo(function ReportReasonList({
  reasons,
  selected,
  onSelect,
}: ReportReasonListProps) {
  return (
    <View className="gap-2" accessibilityRole="radiogroup">
      {reasons.map((reason) => (
        <ReportReasonOption
          key={reason}
          label={reason}
          isSelected={reason === selected}
          onSelect={() => onSelect(reason)}
        />
      ))}
    </View>
  )
})
