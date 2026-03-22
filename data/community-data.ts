export type CommunityUser = {
  id: string
  name: string
  role: string
  avatarSeed: string
}

export type CommunityReply = {
  id: string
  author: CommunityUser
  content: string
  createdAtLabel: string
}

export type CommunityComment = {
  id: string
  author: CommunityUser
  content: string
  createdAtLabel: string
  replies: CommunityReply[]
}

export type CommunityThread = {
  id: string
  topic: string
  title: string
  content: string
  author: CommunityUser
  createdAtLabel: string
  status: "Open" | "Answered"
  isPinned?: boolean
  comments: CommunityComment[]
}

export const COMMUNITY_TOPICS = [
  "Board Strategy",
  "Social Work Law",
  "Case Analysis",
  "Human Behavior",
  "Research Ethics",
] as const

export const COMMUNITY_GUIDELINES = [
  "Ask one clear question per post so replies stay useful.",
  "Share context, your current answer, and what is still confusing.",
  "Respect peers and correct ideas without attacking people.",
  "Do not post private client details or real case identifiers.",
]

export const COMMUNITY_STATS = {
  activeLearners: "1.2k",
  openTopics: 48,
  answeredToday: 19,
}

export const COMMUNITY_CURRENT_USER: CommunityUser = {
  id: "demo-student",
  name: "Andrea Cruz",
  role: "Reviewee",
  avatarSeed: "AC",
}

const MODERATOR: CommunityUser = {
  id: "mentor-1",
  name: "Prof. Elise Ramos",
  role: "Community Mentor",
  avatarSeed: "ER",
}

const STUDENT_ONE: CommunityUser = {
  id: "student-1",
  name: "Miguel Santos",
  role: "3rd Review Week",
  avatarSeed: "MS",
}

const STUDENT_TWO: CommunityUser = {
  id: "student-2",
  name: "Jessa Lim",
  role: "First-Time Taker",
  avatarSeed: "JL",
}

export const COMMUNITY_THREADS: CommunityThread[] = [
  {
    id: "thread-1",
    topic: "Board Strategy",
    title:
      "How do you recover after missing 4 questions in a row during a timed set?",
    content:
      "I notice my pacing collapses after a bad streak. What is your reset routine so you do not carry the mistake into the next five items?",
    author: STUDENT_ONE,
    createdAtLabel: "12 min ago",
    status: "Answered",
    isPinned: true,
    comments: [
      {
        id: "comment-1",
        author: MODERATOR,
        content:
          "Pause for one breath cycle, skip any item that needs heavy reconstruction, then rebuild momentum with the next direct question. Protect pacing first, then review misses after the set.",
        createdAtLabel: "8 min ago",
        replies: [
          {
            id: "reply-1",
            author: STUDENT_ONE,
            content:
              "That pacing-first rule helps. I was trying to solve everything immediately.",
            createdAtLabel: "5 min ago",
          },
        ],
      },
    ],
  },
  {
    id: "thread-2",
    topic: "Social Work Law",
    title:
      "When differentiating RA 9262 from child protection items, what cue do you use first?",
    content:
      "I get trapped by similar distractors. I need a faster way to identify when the question is centered on the woman-child protection relationship versus broader child welfare law.",
    author: STUDENT_TWO,
    createdAtLabel: "34 min ago",
    status: "Open",
    comments: [
      {
        id: "comment-2",
        author: MODERATOR,
        content:
          "Start with the protected relationship. If the stem frames violence against a woman or her child within an intimate relationship, RA 9262 is usually the first check.",
        createdAtLabel: "20 min ago",
        replies: [],
      },
      {
        id: "comment-3",
        author: STUDENT_ONE,
        content:
          "I also underline the actor and the protected party before reading the choices. It cuts my confusion by half.",
        createdAtLabel: "15 min ago",
        replies: [],
      },
    ],
  },
]
