// ─── Home screen sections, top to bottom ────────────────────────────────────
export { HomeTopBar } from "./HomeTopBar"
export { HomeGreeting } from "./HomeGreeting"
export { ExamCountdownCard } from "./ExamCountdownCard"
export { StudyProgressCard } from "./StudyProgressCard"
export { QuickActionsSection, type QuickAction } from "./QuickActionsSection"
export {
  SubjectProgressSection,
  type SubjectRailItem,
} from "@/components/study/subject-progress-section"
export {
  RecentActivitySection,
  RecentActivityRow,
  type RecentActivityItem,
} from "@/components/study/recent-activity"

// ─── Shared pieces ──────────────────────────────────────────────────────────
export { QuickActionTile, type QuickActionIcon } from "./QuickActionTile"

// ─── Superseded by the sections above ───────────────────────────────────────
// Kept so nothing that still imports them breaks, and because HomeSubjectRow
// has never been committed — deleting it would not be recoverable from git.
// Safe to remove once you have confirmed the new Home covers everything you
// need from them.
export { BoardExamsSection } from "./BoardExamsSection"
export { HomeHeroSection } from "./HomeHeroSection"
export { HomeSubjectRow } from "./HomeSubjectRow"
export { PracticeAreasSection } from "./PracticeAreasSection"
export { ResumeAnsweringSection } from "./ResumeAnsweringSection"
export { TrackingPulseSection } from "./TrackingPulseSection"
