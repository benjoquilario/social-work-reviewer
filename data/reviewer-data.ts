export type Category = {
  id: string;
  title: string;
  description: string;
};

export type QuizMode = {
  id: string;
  totalQuestions: number;
  minutes: number;
};

export type Question = {
  id: string;
  categoryId: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
};

export const CATEGORIES: Category[] = [
  {
    id: "social-work-policies",
    title: "Social Work Policies and Programs",
    description:
      "Master core social welfare laws, rights-based programs, and field practice standards.",
  },
  {
    id: "human-behavior",
    title: "Human Behavior and Development",
    description:
      "Review lifespan development, behavior theories, and psychosocial foundations.",
  },
  {
    id: "research-and-ethics",
    title: "Research Methods and Professional Ethics",
    description:
      "Train on evidence-based practice, ethics, and responsible social work decisions.",
  },
];

export const QUIZ_MODES: QuizMode[] = [
  { id: "10-5", totalQuestions: 10, minutes: 5 },
  { id: "20-10", totalQuestions: 20, minutes: 10 },
  { id: "30-15", totalQuestions: 30, minutes: 15 },
  { id: "50-25", totalQuestions: 50, minutes: 25 },
  { id: "100-60", totalQuestions: 100, minutes: 60 },
];

export const QUESTION_BANK: Question[] = [
  {
    id: "sw-1",
    categoryId: "social-work-policies",
    prompt: "Refers to acts that include bodily or physical harm.",
    choices: [
      "Physical Violence",
      "Mauling",
      "Physical Injury",
      "Threat to Life",
    ],
    answerIndex: 0,
  },
  {
    id: "sw-2",
    categoryId: "social-work-policies",
    prompt:
      "Which law in the Philippines is known as the Anti-Violence Against Women and Their Children Act?",
    choices: ["RA 7610", "RA 9262", "RA 9344", "RA 10364"],
    answerIndex: 1,
  },
  {
    id: "sw-3",
    categoryId: "social-work-policies",
    prompt:
      "Which agency is the lead government body for social welfare and development programs?",
    choices: ["DOH", "DSWD", "DepEd", "DILG"],
    answerIndex: 1,
  },
  {
    id: "sw-4",
    categoryId: "social-work-policies",
    prompt: "A core principle of social protection programs is to prioritize:",
    choices: [
      "Only urban residents",
      "Most vulnerable sectors",
      "Private companies",
      "Foreign workers",
    ],
    answerIndex: 1,
  },
  {
    id: "sw-5",
    categoryId: "social-work-policies",
    prompt: "4Ps is primarily designed to:",
    choices: [
      "Provide free housing to all citizens",
      "Reduce poverty through conditional cash grants",
      "Replace public schools",
      "Subsidize private hospitals",
    ],
    answerIndex: 1,
  },
  {
    id: "sw-6",
    categoryId: "social-work-policies",
    prompt:
      "Which approach focuses on empowering clients and communities to use their strengths?",
    choices: [
      "Deficit approach",
      "Punitive approach",
      "Strengths-based approach",
      "Exclusion approach",
    ],
    answerIndex: 2,
  },
  {
    id: "sw-7",
    categoryId: "social-work-policies",
    prompt:
      "Case management in social work includes assessment, planning, intervention, and:",
    choices: [
      "Punishment",
      "Monitoring and evaluation",
      "Media promotion",
      "Legal prosecution",
    ],
    answerIndex: 1,
  },
  {
    id: "sw-8",
    categoryId: "social-work-policies",
    prompt: "Child labor laws primarily aim to:",
    choices: [
      "Increase factory output",
      "Protect children from exploitation",
      "Reduce school budgets",
      "Encourage migration",
    ],
    answerIndex: 1,
  },
  {
    id: "sw-9",
    categoryId: "social-work-policies",
    prompt: "A referral system in social work is important because it:",
    choices: [
      "Limits support services",
      "Connects clients to appropriate resources",
      "Eliminates client participation",
      "Replaces assessments",
    ],
    answerIndex: 1,
  },
  {
    id: "sw-10",
    categoryId: "social-work-policies",
    prompt: "Confidentiality may be broken ethically when:",
    choices: [
      "A client requests snacks",
      "There is risk of serious harm",
      "A worker is busy",
      "A report is delayed",
    ],
    answerIndex: 1,
  },
  {
    id: "hb-1",
    categoryId: "human-behavior",
    prompt: "Erikson's stage focused on adolescent identity formation is:",
    choices: [
      "Trust vs. Mistrust",
      "Identity vs. Role Confusion",
      "Integrity vs. Despair",
      "Autonomy vs. Shame",
    ],
    answerIndex: 1,
  },
  {
    id: "hb-2",
    categoryId: "human-behavior",
    prompt: "Maslow's hierarchy places physiological needs as:",
    choices: [
      "Top priority",
      "Second level",
      "Foundation level",
      "Optional level",
    ],
    answerIndex: 2,
  },
  {
    id: "hb-3",
    categoryId: "human-behavior",
    prompt: "The social learning theory emphasizes learning through:",
    choices: [
      "Dream analysis",
      "Observation and imitation",
      "Genetic testing",
      "Punishment only",
    ],
    answerIndex: 1,
  },
  {
    id: "hb-4",
    categoryId: "human-behavior",
    prompt: "Which factor is part of the biopsychosocial perspective?",
    choices: [
      "Biological factors",
      "Meteorological factors",
      "Astrological factors",
      "Architectural style",
    ],
    answerIndex: 0,
  },
  {
    id: "hb-5",
    categoryId: "human-behavior",
    prompt: "Resilience refers to the capacity to:",
    choices: [
      "Avoid all stress",
      "Recover and adapt despite adversity",
      "Depend fully on others",
      "Ignore social support",
    ],
    answerIndex: 1,
  },
  {
    id: "hb-6",
    categoryId: "human-behavior",
    prompt: "Attachment theory highlights the significance of:",
    choices: [
      "Early caregiver-child relationships",
      "School uniforms",
      "Income tax",
      "Voting behavior",
    ],
    answerIndex: 0,
  },
  {
    id: "hb-7",
    categoryId: "human-behavior",
    prompt: "Cognitive distortions are best described as:",
    choices: [
      "Healthy coping habits",
      "Inaccurate or biased thought patterns",
      "Physical reflexes",
      "Legal definitions",
    ],
    answerIndex: 1,
  },
  {
    id: "hb-8",
    categoryId: "human-behavior",
    prompt: "A protective factor for youth development is:",
    choices: [
      "Chronic neglect",
      "Supportive family environment",
      "School dropout",
      "Substance misuse",
    ],
    answerIndex: 1,
  },
  {
    id: "hb-9",
    categoryId: "human-behavior",
    prompt: "Developmental milestones are used to:",
    choices: [
      "Label children negatively",
      "Track expected growth patterns",
      "Replace medical care",
      "Ban school participation",
    ],
    answerIndex: 1,
  },
  {
    id: "hb-10",
    categoryId: "human-behavior",
    prompt: "Trauma-informed care emphasizes:",
    choices: [
      "Blaming clients",
      "Safety, trust, and empowerment",
      "Forced disclosure",
      "Ignoring context",
    ],
    answerIndex: 1,
  },
  {
    id: "re-1",
    categoryId: "research-and-ethics",
    prompt:
      "In evidence-based practice, decisions should integrate best research, practitioner expertise, and:",
    choices: [
      "Client values and preferences",
      "Social media trends",
      "Personal bias",
      "Random guessing",
    ],
    answerIndex: 0,
  },
  {
    id: "re-2",
    categoryId: "research-and-ethics",
    prompt: "Informed consent requires that participants:",
    choices: [
      "Are forced to join",
      "Understand risks and agree voluntarily",
      "Skip all questions",
      "Receive guaranteed benefits",
    ],
    answerIndex: 1,
  },
  {
    id: "re-3",
    categoryId: "research-and-ethics",
    prompt: "Plagiarism in academic writing means:",
    choices: [
      "Citing sources correctly",
      "Presenting another's work as your own",
      "Using peer review",
      "Paraphrasing with citation",
    ],
    answerIndex: 1,
  },
  {
    id: "re-4",
    categoryId: "research-and-ethics",
    prompt: "A reliable measurement tool is one that:",
    choices: [
      "Changes results every time",
      "Produces consistent results",
      "Has no instructions",
      "Uses complex words only",
    ],
    answerIndex: 1,
  },
  {
    id: "re-5",
    categoryId: "research-and-ethics",
    prompt: "Conflicts of interest should be:",
    choices: [
      "Hidden from readers",
      "Disclosed transparently",
      "Ignored in reports",
      "Added after publication",
    ],
    answerIndex: 1,
  },
  {
    id: "re-6",
    categoryId: "research-and-ethics",
    prompt:
      "A key principle of professional ethics is beneficence, which means:",
    choices: [
      "Doing good and promoting well-being",
      "Avoiding all documentation",
      "Prioritizing profits",
      "Sharing confidential data",
    ],
    answerIndex: 0,
  },
  {
    id: "re-7",
    categoryId: "research-and-ethics",
    prompt: "Quantitative research primarily focuses on:",
    choices: [
      "Numerical data and statistical analysis",
      "Personal journals only",
      "Artwork interpretation",
      "Rumor verification",
    ],
    answerIndex: 0,
  },
  {
    id: "re-8",
    categoryId: "research-and-ethics",
    prompt: "Sampling bias occurs when:",
    choices: [
      "All groups are equally represented",
      "The sample is not representative",
      "Participants are anonymous",
      "Data is double-checked",
    ],
    answerIndex: 1,
  },
  {
    id: "re-9",
    categoryId: "research-and-ethics",
    prompt: "Which action best protects participant privacy?",
    choices: [
      "Publishing full names",
      "Using anonymized identifiers",
      "Sharing raw records publicly",
      "Skipping data security",
    ],
    answerIndex: 1,
  },
  {
    id: "re-10",
    categoryId: "research-and-ethics",
    prompt: "Peer review in research is valuable because it:",
    choices: [
      "Guarantees no errors",
      "Improves quality through expert feedback",
      "Eliminates ethical duties",
      "Replaces data collection",
    ],
    answerIndex: 1,
  },
];

export function getQuestionsByCategory(categoryId: string): Question[] {
  return QUESTION_BANK.filter((question) => question.categoryId === categoryId);
}

function shuffleArray<T>(items: T[]): T[] {
  const clone = [...items];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = clone[index];

    clone[index] = clone[randomIndex];
    clone[randomIndex] = current;
  }

  return clone;
}

export function buildQuizQuestions(
  categoryId: string,
  totalQuestions: number,
): Question[] {
  const source = getQuestionsByCategory(categoryId);

  if (source.length === 0) {
    return [];
  }

  const selected: Question[] = [];

  while (selected.length < totalQuestions) {
    const chunk = shuffleArray(source).map((question, chunkIndex) => ({
      ...question,
      id: `${question.id}-attempt-${selected.length + chunkIndex + 1}`,
    }));

    selected.push(...chunk);
  }

  return selected.slice(0, totalQuestions);
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
