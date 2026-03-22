export type LearningLesson = {
  id: string
  markdownSlug: string
  title: string
  stage: "Foundation" | "Build" | "Mastery"
  level: "Beginner" | "Intermediate" | "Advanced"
  duration: string
  summary: string
  exampleTitle: string
  exampleScenario: string
  exampleTakeaway: string
  lessonSections: {
    title: string
    body: string
  }[]
  appliedExample: {
    situation: string
    analysis: string
    action: string
  }
  objectives: string[]
  practice: string[]
}

export const LEARNING_CENTER_INTRO = {
  title: "Professional Learning Center",
  subtitle:
    "A focused route path that moves from concepts to application and exam-ready reasoning.",
}

export const LEARNING_LESSONS: LearningLesson[] = [
  {
    id: "exam-framework",
    markdownSlug: "exam-framework-and-strategy",
    title: "Exam Framework and Strategy",
    stage: "Foundation",
    level: "Beginner",
    duration: "25 min",
    summary:
      "Understand board-style question patterns, pacing targets, and a repeatable answering strategy.",
    exampleTitle: "Example: 3-pass answering loop",
    exampleScenario:
      "Pass 1 answers direct recall items immediately. Pass 2 handles medium-difficulty items with elimination. Pass 3 revisits flagged items only if time remains.",
    exampleTakeaway:
      "The goal is to protect momentum first, not to solve every hard item on first contact.",
    lessonSections: [
      {
        title: "What this lesson teaches",
        body: "This lesson trains you to stop treating every question equally. Real exam performance improves when you separate easy, medium, and expensive questions the moment you read them.",
      },
      {
        title: "How to apply it in a timed set",
        body: "Use Pass 1 for direct recall only. Mark anything that needs reconstruction. On Pass 2, eliminate obvious distractors and answer only when your reasoning is stable. Pass 3 is for remaining flagged items if time still protects accuracy.",
      },
    ],
    appliedExample: {
      situation:
        "You start a 20-question set and miss two difficult items early. Anxiety rises and you begin rereading every stem too slowly.",
      analysis:
        "The real problem is not the two misses. The real problem is loss of pacing control and emotional carryover into easier questions.",
      action:
        "Skip the next expensive item, answer the direct recall questions first, then return only after rebuilding momentum.",
    },
    objectives: [
      "Map the question categories you need to master",
      "Build a 3-pass answering method",
      "Set daily and weekly progress targets",
    ],
    practice: [
      "Run one 10-question warmup quiz",
      "Flag two weak topics for follow-up",
      "Write your personal pacing target",
    ],
  },
  {
    id: "laws-and-programs",
    markdownSlug: "laws-policies-and-program-recall",
    title: "Laws, Policies, and Program Recall",
    stage: "Build",
    level: "Intermediate",
    duration: "35 min",
    summary:
      "Train active recall for major social welfare laws, government programs, and intervention priorities.",
    exampleTitle: "Example: law-to-purpose mapping",
    exampleScenario:
      "You create a review table with three columns: law, protected group, and primary purpose. During drills, you hide the last two columns and try to reconstruct them from memory.",
    exampleTakeaway:
      "This reduces confusion between similar distractors because you memorize function, not just law numbers.",
    lessonSections: [
      {
        title: "What strong recall looks like",
        body: "Strong recall means you can identify a law by purpose, target group, and common distractors, not only by memorizing a law number. This is what makes your answers stable under pressure.",
      },
      {
        title: "What to review each time",
        body: "For each law or program, review: who is protected, what problem it addresses, what agency implements it, and which answer choices are usually used as traps.",
      },
    ],
    appliedExample: {
      situation:
        "A question asks which law applies when violence is committed against a woman and her child by an intimate partner.",
      analysis:
        "Before looking at the choices, identify the protected relationship first. That narrows the field and stops confusion with broader child protection items.",
      action:
        "Match the relationship and protected group before matching the law number.",
    },
    objectives: [
      "Differentiate high-frequency laws and purposes",
      "Link agencies to specific mandates",
      "Avoid common distractor options",
    ],
    practice: [
      "Create a 10-item law-to-purpose flash deck",
      "Take one timed set from policy category",
      "Review all misses and annotate why",
    ],
  },
  {
    id: "case-analysis",
    markdownSlug: "case-analysis-and-ethical-decisioning",
    title: "Case Analysis and Ethical Decisioning",
    stage: "Mastery",
    level: "Advanced",
    duration: "40 min",
    summary:
      "Apply ethics and evidence-based thinking to scenario questions under time pressure.",
    exampleTitle: "Example: scenario breakdown",
    exampleScenario:
      "A client disclosure raises confidentiality concerns and possible harm. You identify the ethical issue, rank immediate risks, then choose the option that best balances safety, law, and professional duty.",
    exampleTakeaway:
      "Strong answers in case items usually come from a structured lens, not intuition alone.",
    lessonSections: [
      {
        title: "Real-world lesson example",
        body: "A social worker is interviewing a 16-year-old student who discloses repeated physical harm at home and asks that the information remain secret. In exam settings, this is not answered by instinct. You must process duty of care, risk level, confidentiality limits, and legally defensible next steps in order.",
      },
      {
        title: "Framework for analysis",
        body: "First, identify the immediate safety issue. Second, determine whether confidentiality has ethical or legal limits in the case. Third, choose the action that protects the client while staying within professional and legal duties. The best option is often the one that balances safety, documentation, and proper referral, not the one that simply sounds compassionate.",
      },
      {
        title: "How this appears in learning design",
        body: "In the app, this lesson should feel like a guided walkthrough: context, analysis, recommended action, and then a short practice prompt. That structure mirrors how users actually learn difficult case questions.",
      },
    ],
    appliedExample: {
      situation:
        "During intake, a minor reports repeated harm and says, 'Please do not tell anyone at home. It will get worse if they find out.'",
      analysis:
        "The learner should identify a high-risk disclosure, recognize that confidentiality is limited when serious harm is present, and prioritize safety planning and proper reporting channels.",
      action:
        "A strong answer explains the confidentiality limit, documents the disclosure carefully, and escalates through the correct protection and referral process.",
    },
    objectives: [
      "Use a structured case analysis lens",
      "Identify ethical red flags quickly",
      "Defend the best answer with evidence",
    ],
    practice: [
      "Answer 15 mixed scenario questions",
      "Document your rationale for each answer",
      "Re-answer the same set with stricter timing",
    ],
  },
]

export const LEARNING_MILESTONES = [
  "Complete Foundation within 3 days",
  "Reach 80% accuracy in Build stage",
  "Finish one full simulation after Mastery",
]
