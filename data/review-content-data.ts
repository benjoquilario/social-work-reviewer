export type ReviewTopic = {
  id: string
  title: string
  summary: string
  lessonIds: string[]
}

export type ReviewCategoryLibrary = {
  categoryId: string
  overview: string
  topics: ReviewTopic[]
}

export const REVIEW_LIBRARY: ReviewCategoryLibrary[] = [
  {
    categoryId: "human-growth-development",
    overview:
      "Start with lifespan stages, then move into developmental milestones and application in case stems.",
    topics: [
      {
        id: "lifespan-theories",
        title: "Lifespan Theories",
        summary:
          "Erikson, Piaget, and stage-based growth patterns commonly used in board questions.",
        lessonIds: ["exam-framework", "case-analysis"],
      },
      {
        id: "milestones-and-risk",
        title: "Milestones and Risk Signals",
        summary:
          "Recognize expected development, delay indicators, and protective factors.",
        lessonIds: ["exam-framework"],
      },
    ],
  },
  {
    categoryId: "human-behavior-social-environment",
    overview:
      "Use systems thinking to connect the person, family, school, and wider community influences.",
    topics: [
      {
        id: "systems-and-ecology",
        title: "Systems and Ecology",
        summary:
          "Map person-in-environment analysis and ecological influences on functioning.",
        lessonIds: ["case-analysis"],
      },
      {
        id: "resilience-and-protection",
        title: "Resilience and Protective Factors",
        summary:
          "Identify buffers, supports, and social conditions that affect adaptation.",
        lessonIds: ["exam-framework", "case-analysis"],
      },
    ],
  },
  {
    categoryId: "social-welfare-policies-programs",
    overview:
      "Focus on law purpose, protected groups, implementing agencies, and common distractors.",
    topics: [
      {
        id: "high-frequency-laws",
        title: "High-Frequency Laws",
        summary:
          "Review major social welfare laws by target group and policy intent.",
        lessonIds: ["laws-and-programs"],
      },
      {
        id: "agency-and-program-matching",
        title: "Agency and Program Matching",
        summary: "Connect DSWD, LGUs, and national programs to their mandates.",
        lessonIds: ["laws-and-programs", "exam-framework"],
      },
    ],
  },
  {
    categoryId: "social-work-practice-methods",
    overview:
      "Train on assessment, intervention logic, referral decisions, and documentation choices.",
    topics: [
      {
        id: "assessment-to-intervention",
        title: "Assessment to Intervention",
        summary:
          "Sequence intake, assessment, planning, intervention, and evaluation correctly.",
        lessonIds: ["case-analysis", "exam-framework"],
      },
      {
        id: "strengths-and-referral",
        title: "Strengths and Referral Practice",
        summary:
          "Use strengths-based language and proper referral reasoning in scenarios.",
        lessonIds: ["case-analysis"],
      },
    ],
  },
  {
    categoryId: "research-ethics",
    overview:
      "Strengthen question-by-question reasoning on ethics, evidence, validity, and participant protection.",
    topics: [
      {
        id: "ethics-and-confidentiality",
        title: "Ethics and Confidentiality",
        summary:
          "Work through consent, confidentiality, and duty-to-protect scenarios.",
        lessonIds: ["case-analysis"],
      },
      {
        id: "research-logic",
        title: "Research Logic",
        summary:
          "Review sampling, validity, reliability, and evidence-based practice use.",
        lessonIds: ["exam-framework"],
      },
    ],
  },
]

export function getReviewLibraryByCategoryId(categoryId: string) {
  return REVIEW_LIBRARY.find((entry) => entry.categoryId === categoryId)
}
