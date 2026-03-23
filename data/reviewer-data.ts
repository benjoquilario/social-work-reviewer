export type Category = {
  id: string
  title: string
  description: string
  itemCount: number
  topicCount: number
  groupLabel: string
}

export type QuizMode = {
  id: string
  totalQuestions: number
  minutes: number
}

export type FullExamPreset = {
  id: string
  title: string
  totalQuestions: number
  minutes: number
  description: string
}

export type Question = {
  id: string
  categoryId: string
  prompt: string
  choices: string[]
  answerIndex: number
  explanation: string
}

export type DailyTracker = {
  streakDays: number
  targetSessions: number
  completedSessions: number
  focusLabel: string
}

export type PerformanceCategoryMetric = {
  categoryId: string
  accuracy: number
  answered: number
}

export type PerformanceWindow = "week" | "month" | "year"

export type PerformanceMetric = {
  window: PerformanceWindow
  averageScore: number
  questionsAnswered: number
  examSimulations: number
  strongestCategoryId: string
  weakestCategoryId: string
  categories: PerformanceCategoryMetric[]
}

export const CATEGORIES: Category[] = [
  {
    id: "human-growth-development",
    title: "Human Growth and Development",
    description:
      "Review lifespan theories, developmental milestones, and biological to psychosocial growth patterns.",
    itemCount: 14,
    topicCount: 17,
    groupLabel: "Human Development, Diversity, and Behavior",
  },
  {
    id: "human-behavior-social-environment",
    title: "Human Behavior in the Social Environment",
    description:
      "Train on systems theory, social functioning, environment stressors, and adaptive behavior analysis.",
    itemCount: 16,
    topicCount: 13,
    groupLabel: "Human Development, Diversity, and Behavior",
  },
  {
    id: "social-welfare-policies-programs",
    title: "Social Welfare Policies and Programs",
    description:
      "Strengthen recall for Philippine social welfare laws, program mandates, and government services.",
    itemCount: 13,
    topicCount: 12,
    groupLabel: "Social Welfare Policy and Programs",
  },
  {
    id: "social-work-practice-methods",
    title: "Social Work Practice and Helping Methods",
    description:
      "Exercise assessment, intervention planning, case management, and community practice decisions.",
    itemCount: 15,
    topicCount: 14,
    groupLabel: "Social Work Practice",
  },
  {
    id: "research-ethics",
    title: "Social Work Research and Ethics",
    description:
      "Build confidence in evidence-based practice, research logic, ethics, and documentation standards.",
    itemCount: 14,
    topicCount: 11,
    groupLabel: "Research and Ethics",
  },
]

export const QUIZ_MODES: QuizMode[] = [
  { id: "10-5", totalQuestions: 10, minutes: 5 },
  { id: "20-10", totalQuestions: 20, minutes: 10 },
  { id: "30-15", totalQuestions: 30, minutes: 15 },
  { id: "50-25", totalQuestions: 50, minutes: 25 },
]

export const FULL_EXAM_PRESETS: FullExamPreset[] = [
  {
    id: "board-170",
    title: "Full Board Simulation",
    totalQuestions: 170,
    minutes: 180,
    description:
      "A full-length board-style exam that mixes all categories and tests pacing under pressure.",
  },
  {
    id: "mastery-200",
    title: "Mastery Endurance Exam",
    totalQuestions: 200,
    minutes: 210,
    description:
      "Extended mixed exam for endurance, retention, and post-review readiness.",
  },
]

export const DAILY_TRACKER: DailyTracker = {
  streakDays: 9,
  targetSessions: 3,
  completedSessions: 2,
  focusLabel: "Human Growth and Development",
}

export const PERFORMANCE_METRICS: PerformanceMetric[] = [
  {
    window: "week",
    averageScore: 78,
    questionsAnswered: 245,
    examSimulations: 3,
    strongestCategoryId: "social-welfare-policies-programs",
    weakestCategoryId: "research-ethics",
    categories: [
      { categoryId: "human-growth-development", accuracy: 76, answered: 48 },
      {
        categoryId: "human-behavior-social-environment",
        accuracy: 74,
        answered: 52,
      },
      {
        categoryId: "social-welfare-policies-programs",
        accuracy: 84,
        answered: 51,
      },
      {
        categoryId: "social-work-practice-methods",
        accuracy: 79,
        answered: 47,
      },
      { categoryId: "research-ethics", accuracy: 69, answered: 47 },
    ],
  },
  {
    window: "month",
    averageScore: 81,
    questionsAnswered: 980,
    examSimulations: 11,
    strongestCategoryId: "social-work-practice-methods",
    weakestCategoryId: "human-behavior-social-environment",
    categories: [
      { categoryId: "human-growth-development", accuracy: 80, answered: 190 },
      {
        categoryId: "human-behavior-social-environment",
        accuracy: 75,
        answered: 206,
      },
      {
        categoryId: "social-welfare-policies-programs",
        accuracy: 83,
        answered: 192,
      },
      {
        categoryId: "social-work-practice-methods",
        accuracy: 86,
        answered: 196,
      },
      { categoryId: "research-ethics", accuracy: 79, answered: 196 },
    ],
  },
  {
    window: "year",
    averageScore: 84,
    questionsAnswered: 6420,
    examSimulations: 54,
    strongestCategoryId: "social-work-practice-methods",
    weakestCategoryId: "human-growth-development",
    categories: [
      { categoryId: "human-growth-development", accuracy: 80, answered: 1240 },
      {
        categoryId: "human-behavior-social-environment",
        accuracy: 82,
        answered: 1300,
      },
      {
        categoryId: "social-welfare-policies-programs",
        accuracy: 85,
        answered: 1280,
      },
      {
        categoryId: "social-work-practice-methods",
        accuracy: 88,
        answered: 1310,
      },
      { categoryId: "research-ethics", accuracy: 84, answered: 1290 },
    ],
  },
]

export const QUESTION_BANK: Question[] = [
  {
    id: "hgd-1",
    categoryId: "human-growth-development",
    prompt: "Erikson's main developmental task during adolescence is:",
    choices: [
      "Industry versus Inferiority",
      "Identity versus Role Confusion",
      "Generativity versus Stagnation",
      "Trust versus Mistrust",
    ],
    answerIndex: 1,
    explanation:
      "Adolescence is centered on identity formation. Erikson describes this stage as Identity versus Role Confusion, where the person develops a coherent sense of self.",
  },
  {
    id: "hgd-2",
    categoryId: "human-growth-development",
    prompt: "A developmental milestone is best understood as:",
    choices: [
      "A fixed law that applies equally to every child at the same age",
      "An expected pattern of growth used to monitor development",
      "A diagnosis of delayed functioning",
      "A measure of academic intelligence only",
    ],
    answerIndex: 1,
    explanation:
      "Milestones are expected patterns used to monitor whether growth is generally tracking as expected. They guide observation, not automatic diagnosis.",
  },
  {
    id: "hgd-3",
    categoryId: "human-growth-development",
    prompt:
      "Which theory emphasizes cognitive development through stages such as preoperational and concrete operational?",
    choices: [
      "Piaget's theory",
      "Freud's theory",
      "Maslow's theory",
      "Skinner's theory",
    ],
    answerIndex: 0,
    explanation:
      "Jean Piaget's theory explains cognitive development through structured stages, including preoperational and concrete operational thinking.",
  },
  {
    id: "hbs-1",
    categoryId: "human-behavior-social-environment",
    prompt:
      "The ecological perspective in social work highlights the relationship between:",
    choices: [
      "Only internal emotions and symptoms",
      "The person and the environment",
      "Genes and medical treatment only",
      "Income and political preference",
    ],
    answerIndex: 1,
    explanation:
      "The ecological perspective looks at how a person functions within interacting systems, including family, community, institutions, and environment.",
  },
  {
    id: "hbs-2",
    categoryId: "human-behavior-social-environment",
    prompt: "A protective factor is something that:",
    choices: [
      "Increases vulnerability to harm",
      "Helps reduce risk and supports healthy functioning",
      "Replaces social support systems",
      "Guarantees absence of stress",
    ],
    answerIndex: 1,
    explanation:
      "Protective factors reduce the effect of risks and support adaptation, such as supportive caregivers, safe schools, and healthy peer relationships.",
  },
  {
    id: "hbs-3",
    categoryId: "human-behavior-social-environment",
    prompt: "Systems theory is useful because it helps the worker:",
    choices: [
      "Ignore context and focus only on symptoms",
      "See how different systems influence behavior",
      "Replace assessment with intuition",
      "Treat all clients in exactly the same way",
    ],
    answerIndex: 1,
    explanation:
      "Systems theory guides the worker to examine how family, school, work, community, and institutions interact to affect client behavior and functioning.",
  },
  {
    id: "swp-1",
    categoryId: "social-welfare-policies-programs",
    prompt:
      "Which Philippine government agency primarily handles social welfare and development services?",
    choices: ["DOH", "DSWD", "DepEd", "DILG"],
    answerIndex: 1,
    explanation:
      "The Department of Social Welfare and Development is the lead agency for many welfare, protection, and social assistance programs in the Philippines.",
  },
  {
    id: "swp-2",
    categoryId: "social-welfare-policies-programs",
    prompt: "The 4Ps program is intended to:",
    choices: [
      "Replace public education services",
      "Provide conditional cash assistance to reduce poverty",
      "Fund private hospitals only",
      "Serve as a labor recruitment program",
    ],
    answerIndex: 1,
    explanation:
      "Pantawid Pamilyang Pilipino Program uses conditional cash grants to improve health, nutrition, and education outcomes among low-income households.",
  },
  {
    id: "swp-3",
    categoryId: "social-welfare-policies-programs",
    prompt: "A core principle of social welfare policy is to prioritize:",
    choices: [
      "Most vulnerable sectors",
      "Only urban populations",
      "Private corporations",
      "Foreign visitors",
    ],
    answerIndex: 0,
    explanation:
      "Social welfare policy is designed to respond first to vulnerable, marginalized, and at-risk groups who need protection and support.",
  },
  {
    id: "swm-1",
    categoryId: "social-work-practice-methods",
    prompt:
      "A good case management process usually includes assessment, planning, intervention, and:",
    choices: [
      "Monitoring and evaluation",
      "Political campaigning",
      "Punishment",
      "Automatic discharge",
    ],
    answerIndex: 0,
    explanation:
      "Case management is a structured helping process. Monitoring and evaluation are necessary to know whether services are working and need adjustment.",
  },
  {
    id: "swm-2",
    categoryId: "social-work-practice-methods",
    prompt: "A strengths-based approach focuses on:",
    choices: [
      "Deficits only",
      "Punishment and control",
      "Capacities, resources, and resilience",
      "Removing client participation",
    ],
    answerIndex: 2,
    explanation:
      "A strengths-based approach identifies what the client, family, or community can already use or build on, rather than focusing only on problems.",
  },
  {
    id: "swm-3",
    categoryId: "social-work-practice-methods",
    prompt: "A referral is appropriate when the worker needs to:",
    choices: [
      "Withhold resources from the client",
      "Connect the client to a service beyond current scope",
      "Avoid documentation",
      "Replace informed consent",
    ],
    answerIndex: 1,
    explanation:
      "Referral is a professional step used to connect the client with a more appropriate service, specialist, or institution when needed.",
  },
  {
    id: "res-1",
    categoryId: "research-ethics",
    prompt: "Informed consent means participants should:",
    choices: [
      "Join under pressure",
      "Understand risks and agree voluntarily",
      "Receive guaranteed success",
      "Avoid asking questions",
    ],
    answerIndex: 1,
    explanation:
      "Informed consent requires understanding, voluntariness, and adequate information about risks, benefits, and participation conditions.",
  },
  {
    id: "res-2",
    categoryId: "research-ethics",
    prompt: "Sampling bias happens when:",
    choices: [
      "The sample is representative",
      "The sample is not representative of the population",
      "Data is reviewed carefully",
      "Participants are anonymized",
    ],
    answerIndex: 1,
    explanation:
      "Sampling bias appears when the selected sample does not reflect the population well, which weakens the validity of conclusions.",
  },
  {
    id: "res-3",
    categoryId: "research-ethics",
    prompt: "Confidentiality may be ethically limited when:",
    choices: [
      "There is serious risk of harm",
      "A client arrives late",
      "The office is busy",
      "A report is lengthy",
    ],
    answerIndex: 0,
    explanation:
      "Confidentiality is essential, but it may be limited when there is a serious threat to safety or where law and ethical duty require protective action.",
  },
]

export function getQuestionsByCategory(categoryId: string): Question[] {
  if (categoryId === "all-categories") {
    return QUESTION_BANK
  }

  return QUESTION_BANK.filter((question) => question.categoryId === categoryId)
}

export function getCategoryById(categoryId: string) {
  return CATEGORIES.find((category) => category.id === categoryId)
}

export function getFullExamById(examId: string) {
  return FULL_EXAM_PRESETS.find((exam) => exam.id === examId)
}

function shuffleArray<T>(items: T[]): T[] {
  const clone = [...items]

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = clone[index]

    clone[index] = clone[randomIndex]
    clone[randomIndex] = current
  }

  return clone
}

export function buildQuizQuestions(
  categoryId: string,
  totalQuestions: number
): Question[] {
  const source = getQuestionsByCategory(categoryId)

  if (source.length === 0) {
    return []
  }

  const selected: Question[] = []

  while (selected.length < totalQuestions) {
    const chunk = shuffleArray(source).map((question, chunkIndex) => ({
      ...question,
      id: `${question.id}-attempt-${selected.length + chunkIndex + 1}`,
    }))

    selected.push(...chunk)
  }

  return selected.slice(0, totalQuestions)
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
