/**
 * ─── Exam countdown ───────────────────────────────────────────────────────
 *
 * Pure date maths behind the Home countdown card. Kept out of the component so
 * the "how many days left" rule has one definition and can be unit tested
 * without rendering anything.
 */

const DAY_MS = 24 * 60 * 60 * 1000

const EXAM_DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

const EXAM_TIME_FMT = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
})

export type ExamCountdown = {
  /** Whole days remaining. 0 on exam day, negative once it has passed. */
  daysLeft: number
  /** "125", "1", "0" — the headline number. */
  daysLabel: string
  /** "days left", "day left", "Today", "Exam passed". */
  daysCaption: string
  /** "Nov 20, 2025 · 8:00 AM" */
  scheduleLabel: string
  isToday: boolean
  isPast: boolean
}

/**
 * Midnight-to-midnight difference, so "1 day left" flips at the start of the
 * day rather than at the exam's clock time. An exam at 08:00 tomorrow reads
 * "1 day left" all of today, which is how a learner counts it.
 */
function wholeDaysBetween(from: Date, to: Date) {
  const fromMidnight = Date.UTC(
    from.getFullYear(),
    from.getMonth(),
    from.getDate()
  )
  const toMidnight = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())

  return Math.round((toMidnight - fromMidnight) / DAY_MS)
}

export function parseExamDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function buildExamCountdown(
  examDate: string | null | undefined,
  now: Date = new Date()
): ExamCountdown | null {
  const parsed = parseExamDate(examDate)

  if (!parsed) {
    return null
  }

  const daysLeft = wholeDaysBetween(now, parsed)
  const isToday = daysLeft === 0
  const isPast = daysLeft < 0

  return {
    daysLeft,
    daysLabel: isPast ? "—" : String(daysLeft),
    daysCaption: isPast
      ? "Exam passed"
      : isToday
        ? "Today — good luck!"
        : daysLeft === 1
          ? "day left"
          : "days left",
    scheduleLabel: `${EXAM_DATE_FMT.format(parsed)} · ${EXAM_TIME_FMT.format(parsed)}`,
    isToday,
    isPast,
  }
}

/** Local-midnight ISO string for a calendar day, for storing a picked date. */
export function toExamDateIso(
  year: number,
  monthIndex: number,
  day: number,
  hour = 8,
  minute = 0
) {
  return new Date(year, monthIndex, day, hour, minute, 0, 0).toISOString()
}
