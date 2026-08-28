import type { ReactNode } from "react"

import type { Tone } from "@/lib/tone"

/** One row in the Details tab's identity list. */
export type ProfileDetailCard = {
  key: string
  icon: ReactNode
  label: string
  value: string
  /**
   * `true` when `value` is placeholder copy ("Add your school…") rather than
   * something the learner actually filled in — the row renders it muted so a
   * prompt never looks like data.
   */
  isPlaceholder: boolean
}

/** One row in the Activity tab's timeline. */
export type ProfileRecentActivityItem = {
  id: string
  title: string
  kindLabel: string
  metric: string
  statusText: string
  /**
   * Shared vocabulary from `lib/tone.ts`. This used to be a raw color string
   * resolved at the screen, which meant the timeline could not be styled with
   * the same classes as every other toned surface in the app.
   */
  tone: Tone
}
