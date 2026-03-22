export type NewsItemType = "update" | "learning" | "questionnaire"

export type NewsItem = {
  id: string
  title: string
  description: string
  type: NewsItemType
  dateLabel: string
  isNew?: boolean
}

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: "release-2-1",
    title: "Reviewer 2.1 UI Refresh",
    description:
      "Improved navigation, cleaner card hierarchy, and better pacing visuals in quiz sessions.",
    type: "update",
    dateLabel: "Today",
    isNew: true,
  },
  {
    id: "learning-path-v1",
    title: "New Learning Route Path",
    description:
      "A guided path from Foundation to Mastery is now available in the Learning Center tab.",
    type: "learning",
    dateLabel: "Mar 19, 2026",
    isNew: true,
  },
  {
    id: "question-pack-ethics",
    title: "Ethics Case Pack Added",
    description:
      "20 new scenario-based questions focused on confidentiality, informed consent, and beneficence.",
    type: "questionnaire",
    dateLabel: "Mar 18, 2026",
  },
  {
    id: "question-pack-behavior",
    title: "Human Behavior Drill Pack",
    description:
      "Added short-interval drills for developmental stages and biopsychosocial analysis.",
    type: "questionnaire",
    dateLabel: "Mar 15, 2026",
  },
  {
    id: "learn-note-method",
    title: "Study Method Guide Published",
    description:
      "New micro-guide: how to use error logs and retake loops to increase retention.",
    type: "learning",
    dateLabel: "Mar 12, 2026",
  },
]
