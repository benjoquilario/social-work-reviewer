import Award from "lucide-react-native/icons/award"
import BookOpen from "lucide-react-native/icons/book-open"
import CheckCircle2 from "lucide-react-native/icons/circle-check"
import Flame from "lucide-react-native/icons/flame"
import Star from "lucide-react-native/icons/star"
import type { ActivityAchievement } from "@/lib/progress"
import type { Tone } from "@/lib/tone"

type AchievementIconName = "flame" | "check" | "book" | "star" | "award"

export type AchievementBadgeMeta = {
  badgeName: string
  icon: AchievementIconName
  tone: Tone
}

/**
 * Thresholds per achievement type, richest tier first. Reading the tiers off a
 * table rather than a stack of nested `if`s keeps the naming scheme visible:
 * one row per badge, and adding a tier is one line.
 */
const BADGE_TIERS: Record<
  string,
  { min: number; badgeName: string; icon: AchievementIconName; tone: Tone }[]
> = {
  streak: [
    { min: 100, badgeName: "Century Scholar", icon: "flame", tone: "warning" },
    {
      min: 60,
      badgeName: "Discipline Vanguard",
      icon: "flame",
      tone: "success",
    },
    { min: 30, badgeName: "Monthly Momentum", icon: "flame", tone: "primary" },
    { min: 0, badgeName: "Streak Builder", icon: "flame", tone: "accent" },
  ],
  consistency: [
    { min: 100, badgeName: "Perfect Ace", icon: "star", tone: "warning" },
    { min: 85, badgeName: "Silver Strategist", icon: "check", tone: "success" },
    {
      min: 0,
      badgeName: "Bronze Breakthrough",
      icon: "check",
      tone: "primary",
    },
  ],
  quiz_completion: [
    { min: 50, badgeName: "Grand Examiner", icon: "award", tone: "warning" },
    { min: 25, badgeName: "Exam Pathfinder", icon: "award", tone: "success" },
    { min: 10, badgeName: "Quiz Specialist", icon: "check", tone: "primary" },
    { min: 0, badgeName: "Quiz Cadet", icon: "check", tone: "accent" },
  ],
  completion: [
    { min: 50, badgeName: "Master of Modules", icon: "book", tone: "warning" },
    {
      min: 25,
      badgeName: "Curriculum Conqueror",
      icon: "book",
      tone: "success",
    },
    { min: 10, badgeName: "Study Architect", icon: "book", tone: "primary" },
    { min: 0, badgeName: "Lesson Explorer", icon: "book", tone: "accent" },
  ],
  weekly_average: [
    { min: 90, badgeName: "Elite Accuracy", icon: "award", tone: "warning" },
    {
      min: 0,
      badgeName: "Strong Weekly Average",
      icon: "award",
      tone: "success",
    },
  ],
}

const FALLBACK_BADGE: AchievementBadgeMeta = {
  badgeName: "Milestone Unlocked",
  icon: "award",
  tone: "primary",
}

export function getAchievementBadgeMeta(
  achievement: ActivityAchievement
): AchievementBadgeMeta {
  const tiers = BADGE_TIERS[achievement.achievementType]

  if (!tiers) {
    return FALLBACK_BADGE
  }

  const metric = Math.round(achievement.metricValue)

  return tiers.find((tier) => metric >= tier.min) ?? FALLBACK_BADGE
}

export function AchievementBadgeIcon({
  icon,
  color,
  size = 13,
}: {
  icon: AchievementIconName
  color: string
  size?: number
}) {
  if (icon === "flame") return <Flame size={size} color={color} />
  if (icon === "check") return <CheckCircle2 size={size} color={color} />
  if (icon === "book") return <BookOpen size={size} color={color} />
  if (icon === "star") return <Star size={size} color={color} />
  return <Award size={size} color={color} />
}
