export type CmsFieldKind =
  | "string"
  | "text"
  | "richtext"
  | "integer"
  | "float"
  | "boolean"
  | "datetime"
  | "enum"
  | "string[]"

export type CmsFieldDefinition = {
  key: string
  label: string
  kind: CmsFieldKind
  required?: boolean
  description?: string
  placeholder?: string
  size?: number
  min?: number
  max?: number
  array?: boolean
  options?: readonly string[]
  defaultValue?: string | number | boolean
}

export type CmsTableDefinition = {
  tableId: string
  name: string
  description: string
  group:
    | "auth"
    | "content"
    | "assessment"
    | "progress"
    | "achievements"
    | "community"
    | "cms"
  fields: readonly CmsFieldDefinition[]
}

function defineTable<const T extends CmsTableDefinition>(definition: T) {
  return definition
}

export const reviewerCmsSchema = {
  user_profiles: defineTable({
    tableId: "user_profiles",
    name: "User Profiles",
    description:
      "Student profile and premium access metadata from Appwrite Auth.",
    group: "auth",
    fields: [
      {
        key: "userId",
        label: "Appwrite User ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "fullName",
        label: "Full Name",
        kind: "string",
        required: true,
        size: 255,
      },
      {
        key: "email",
        label: "Email",
        kind: "string",
        required: true,
        size: 255,
      },
      {
        key: "avatarUrl",
        label: "Avatar URL",
        kind: "string",
        required: false,
        size: 1024,
      },
      {
        key: "schoolName",
        label: "School Name",
        kind: "string",
        required: false,
        size: 255,
      },
      {
        key: "reviewType",
        label: "Review Type",
        kind: "string",
        required: false,
        size: 128,
      },
      {
        key: "isPremium",
        label: "Premium Access",
        kind: "boolean",
        required: true,
        defaultValue: false,
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: true,
      },
    ],
  }),
  user_roles: defineTable({
    tableId: "user_roles",
    name: "User Roles",
    description: "Application roles used for students, admins, and moderators.",
    group: "auth",
    fields: [
      {
        key: "userId",
        label: "Appwrite User ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "role",
        label: "Role",
        kind: "enum",
        required: true,
        options: ["student", "admin", "moderator"],
        defaultValue: "student",
      },
    ],
  }),
  subjects: defineTable({
    tableId: "subjects",
    name: "Subjects",
    description:
      "Top-level reviewer subjects such as Human Behavior or Ethics.",
    group: "content",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true, size: 255 },
      {
        key: "description",
        label: "Description",
        kind: "text",
        required: false,
        size: 3000,
      },
      {
        key: "iconUrl",
        label: "Icon URL",
        kind: "string",
        required: false,
        size: 1024,
      },
      {
        key: "order",
        label: "Display Order",
        kind: "integer",
        required: true,
        defaultValue: 1,
        min: 1,
        max: 9999,
      },
    ],
  }),
  topics: defineTable({
    tableId: "topics",
    name: "Topics",
    description:
      "Subject-level topics that organize the reviewer lessons and questions.",
    group: "content",
    fields: [
      {
        key: "subjectId",
        label: "Subject",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "title",
        label: "Title",
        kind: "string",
        required: true,
        size: 255,
      },
      {
        key: "description",
        label: "Description",
        kind: "text",
        required: false,
        size: 3000,
      },
      {
        key: "order",
        label: "Display Order",
        kind: "integer",
        required: true,
        defaultValue: 1,
        min: 1,
        max: 9999,
      },
    ],
  }),
  learning_materials: defineTable({
    tableId: "learning_materials",
    name: "Learning Materials",
    description:
      "Review content for each topic, including notes, PDFs, and videos.",
    group: "content",
    fields: [
      {
        key: "topicId",
        label: "Topic",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "title",
        label: "Title",
        kind: "string",
        required: true,
        size: 255,
      },
      {
        key: "type",
        label: "Content Type",
        kind: "enum",
        required: true,
        options: ["pdf", "video", "note"],
        defaultValue: "note",
      },
      {
        key: "fileUrl",
        label: "File URL",
        kind: "string",
        required: false,
        size: 2048,
      },
      {
        key: "content",
        label: "Review Content",
        kind: "richtext",
        required: false,
        size: 20000,
      },
      {
        key: "order",
        label: "Display Order",
        kind: "integer",
        required: true,
        defaultValue: 1,
        min: 1,
        max: 9999,
      },
      {
        key: "isPremium",
        label: "Premium Content",
        kind: "boolean",
        required: true,
        defaultValue: false,
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: true,
      },
    ],
  }),
  learning_history: defineTable({
    tableId: "learning_history",
    name: "Learning History",
    description:
      "Resume state for learning materials so students can continue where they left off.",
    group: "progress",
    fields: [
      {
        key: "userId",
        label: "User ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "subjectId",
        label: "Subject ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "topicId",
        label: "Topic ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "learningMaterialId",
        label: "Learning Material ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "status",
        label: "Status",
        kind: "enum",
        required: true,
        options: ["in_progress", "paused", "completed"],
        defaultValue: "in_progress",
      },
      {
        key: "progressPercent",
        label: "Progress Percent",
        kind: "float",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100,
      },
      {
        key: "lastPosition",
        label: "Last Position",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100000,
      },
      {
        key: "startedAt",
        label: "Started At",
        kind: "datetime",
        required: true,
      },
      {
        key: "lastAccessedAt",
        label: "Last Accessed At",
        kind: "datetime",
        required: true,
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: true,
      },
      {
        key: "completedAt",
        label: "Completed At",
        kind: "datetime",
        required: false,
      },
    ],
  }),
  user_answers: defineTable({
    tableId: "user_answers",
    name: "User Answers",
    description:
      "Submitted answers saved from the mobile app's static questionnaire flows.",
    group: "progress",
    fields: [
      {
        key: "userId",
        label: "User ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "questionId",
        label: "Question ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "sourceQuestionId",
        label: "Source Question ID",
        kind: "integer",
        required: false,
        min: 0,
        max: 999999,
      },
      {
        key: "subjectId",
        label: "Subject ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "topicId",
        label: "Topic ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "questionnaireKey",
        label: "Questionnaire Key",
        kind: "string",
        required: false,
        size: 128,
      },
      {
        key: "sessionId",
        label: "Session ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "setName",
        label: "Set Name",
        kind: "enum",
        required: false,
        options: ["Set A", "Set B", "Set C", "Set D"],
        defaultValue: "Set A",
      },
      {
        key: "selectedAnswerKey",
        label: "Selected Answer Key",
        kind: "string",
        required: true,
        size: 16,
      },
      {
        key: "selectedAnswerText",
        label: "Selected Answer Text",
        kind: "text",
        required: false,
        size: 4000,
      },
      {
        key: "correctAnswerKey",
        label: "Correct Answer Key",
        kind: "string",
        required: false,
        size: 16,
      },
      {
        key: "correctAnswerText",
        label: "Correct Answer Text",
        kind: "text",
        required: false,
        size: 4000,
      },
      {
        key: "isCorrect",
        label: "Correct",
        kind: "boolean",
        required: true,
        defaultValue: false,
      },
      {
        key: "answeredAt",
        label: "Answered At",
        kind: "datetime",
        required: false,
      },
      {
        key: "responseTimeSeconds",
        label: "Response Time Seconds",
        kind: "integer",
        required: false,
        min: 0,
        max: 86400,
      },
    ],
  }),
  user_progress: defineTable({
    tableId: "user_progress",
    name: "User Progress",
    description:
      "Progress summary and resume state for the mobile app's static questionnaire flows.",
    group: "progress",
    fields: [
      {
        key: "userId",
        label: "User ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "subjectId",
        label: "Subject ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "topicId",
        label: "Topic ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "questionnaireKey",
        label: "Questionnaire Key",
        kind: "string",
        required: false,
        size: 128,
      },
      {
        key: "completedMaterials",
        label: "Completed Materials",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 9999,
      },
      {
        key: "averageScore",
        label: "Average Score",
        kind: "float",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100,
      },
      {
        key: "lastStudied",
        label: "Last Studied",
        kind: "datetime",
        required: false,
      },
      {
        key: "lastQuestionId",
        label: "Last Question ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "lastQuestionIndex",
        label: "Last Question Index",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 9999,
      },
      {
        key: "score",
        label: "Score",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 9999,
      },
      {
        key: "answeredCount",
        label: "Answered Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 9999,
      },
      {
        key: "correctCount",
        label: "Correct Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 999999,
      },
      {
        key: "incorrectCount",
        label: "Incorrect Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 999999,
      },
      {
        key: "accuracyRate",
        label: "Accuracy Rate",
        kind: "float",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100,
      },
      {
        key: "lastSourceQuestionId",
        label: "Last Source Question ID",
        kind: "integer",
        required: false,
        min: 0,
        max: 999999,
      },
      {
        key: "answeredQuestionIds",
        label: "Answered Question IDs",
        kind: "string[]",
        required: false,
        size: 64,
      },
      {
        key: "setName",
        label: "Set Name",
        kind: "enum",
        required: false,
        options: ["Set A", "Set B", "Set C", "Set D"],
        defaultValue: "Set A",
      },
      {
        key: "dayStreak",
        label: "Day Streak",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 3650,
      },
      {
        key: "weeklyAverageScore",
        label: "Weekly Average Score",
        kind: "float",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100,
      },
      {
        key: "lastActiveAt",
        label: "Last Active At",
        kind: "datetime",
        required: false,
      },
      {
        key: "totalStudyMinutes",
        label: "Total Study Minutes",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 10000000,
      },
      {
        key: "activeDaysCount",
        label: "Active Days Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 36500,
      },
      {
        key: "achievementsCount",
        label: "Achievements Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 999999,
      },
    ],
  }),
  user_daily_activity: defineTable({
    tableId: "user_daily_activity",
    name: "User Daily Activity",
    description:
      "Per-user daily study and answer metrics used for calendars, reports, and achievement evaluation.",
    group: "progress",
    fields: [
      {
        key: "userId",
        label: "User ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "activityDate",
        label: "Activity Date",
        kind: "string",
        required: true,
        size: 16,
      },
      {
        key: "weekStartDate",
        label: "Week Start Date",
        kind: "string",
        required: true,
        size: 16,
      },
      {
        key: "subjectId",
        label: "Subject ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "topicId",
        label: "Topic ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "questionnaireKey",
        label: "Questionnaire Key",
        kind: "string",
        required: false,
        size: 128,
      },
      {
        key: "setName",
        label: "Set Name",
        kind: "enum",
        required: false,
        options: ["Set A", "Set B", "Set C", "Set D"],
        defaultValue: "Set A",
      },
      {
        key: "answeredCount",
        label: "Answered Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 999999,
      },
      {
        key: "correctCount",
        label: "Correct Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 999999,
      },
      {
        key: "incorrectCount",
        label: "Incorrect Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 999999,
      },
      {
        key: "accuracyRate",
        label: "Accuracy Rate",
        kind: "float",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100,
      },
      {
        key: "averageScore",
        label: "Average Score",
        kind: "float",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100,
      },
      {
        key: "studyMinutes",
        label: "Study Minutes",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 1440,
      },
      {
        key: "completedMaterials",
        label: "Completed Materials",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 9999,
      },
      {
        key: "earnedAchievementsCount",
        label: "Earned Achievements Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 9999,
      },
      {
        key: "firstAnsweredAt",
        label: "First Answered At",
        kind: "datetime",
        required: false,
      },
      {
        key: "lastAnsweredAt",
        label: "Last Answered At",
        kind: "datetime",
        required: false,
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: true,
      },
    ],
  }),
  user_weekly_reports: defineTable({
    tableId: "user_weekly_reports",
    name: "User Weekly Reports",
    description:
      "Per-user weekly rollups used for trend charts, weekly summaries, and milestone monitoring.",
    group: "progress",
    fields: [
      {
        key: "userId",
        label: "User ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "weekStartDate",
        label: "Week Start Date",
        kind: "string",
        required: true,
        size: 16,
      },
      {
        key: "weekEndDate",
        label: "Week End Date",
        kind: "string",
        required: true,
        size: 16,
      },
      {
        key: "subjectId",
        label: "Subject ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "topicId",
        label: "Topic ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "questionnaireKey",
        label: "Questionnaire Key",
        kind: "string",
        required: false,
        size: 128,
      },
      {
        key: "answeredCount",
        label: "Answered Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 999999,
      },
      {
        key: "correctCount",
        label: "Correct Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 999999,
      },
      {
        key: "incorrectCount",
        label: "Incorrect Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 999999,
      },
      {
        key: "accuracyRate",
        label: "Accuracy Rate",
        kind: "float",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100,
      },
      {
        key: "averageScore",
        label: "Average Score",
        kind: "float",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100,
      },
      {
        key: "studyMinutes",
        label: "Study Minutes",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 10080,
      },
      {
        key: "activeDaysCount",
        label: "Active Days Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 7,
      },
      {
        key: "completedMaterials",
        label: "Completed Materials",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 9999,
      },
      {
        key: "earnedAchievementsCount",
        label: "Earned Achievements Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 9999,
      },
      {
        key: "dayStreak",
        label: "Day Streak",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 3650,
      },
      {
        key: "generatedAt",
        label: "Generated At",
        kind: "datetime",
        required: true,
      },
    ],
  }),
  learning_achievements: defineTable({
    tableId: "learning_achievements",
    name: "Learning Achievements",
    description:
      "Badges and snapshots for learning milestones, streaks, and quiz performance.",
    group: "achievements",
    fields: [
      {
        key: "userId",
        label: "User ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "fullName",
        label: "Full Name",
        kind: "string",
        required: false,
        size: 255,
      },
      {
        key: "schoolName",
        label: "School Name",
        kind: "string",
        required: false,
        size: 255,
      },
      {
        key: "reviewType",
        label: "Review Type",
        kind: "string",
        required: false,
        size: 128,
      },
      {
        key: "avatarUrl",
        label: "Avatar URL",
        kind: "string",
        required: false,
        size: 1024,
      },
      {
        key: "subjectId",
        label: "Subject ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "topicId",
        label: "Topic ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "learningMaterialId",
        label: "Learning Material ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "achievementType",
        label: "Achievement Type",
        kind: "enum",
        required: true,
        options: [
          "streak",
          "weekly_average",
          "completion",
          "quiz_completion",
          "consistency",
        ],
        defaultValue: "streak",
      },
      {
        key: "badgeKey",
        label: "Badge Key",
        kind: "string",
        required: false,
        size: 128,
      },
      {
        key: "title",
        label: "Title",
        kind: "string",
        required: true,
        size: 255,
      },
      {
        key: "description",
        label: "Description",
        kind: "text",
        required: false,
        size: 3000,
      },
      {
        key: "metricValue",
        label: "Metric Value",
        kind: "float",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100000,
      },
      {
        key: "thresholdValue",
        label: "Threshold Value",
        kind: "float",
        required: false,
        min: 0,
        max: 100000,
      },
      {
        key: "metricKey",
        label: "Metric Key",
        kind: "string",
        required: false,
        size: 128,
      },
      {
        key: "periodType",
        label: "Period Type",
        kind: "enum",
        required: true,
        options: ["instant", "daily", "weekly", "lifetime"],
        defaultValue: "instant",
      },
      {
        key: "periodStartDate",
        label: "Period Start Date",
        kind: "string",
        required: false,
        size: 16,
      },
      {
        key: "periodEndDate",
        label: "Period End Date",
        kind: "string",
        required: false,
        size: 16,
      },
      {
        key: "dayStreak",
        label: "Day Streak",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 3650,
      },
      {
        key: "weeklyAverageScore",
        label: "Weekly Average Score",
        kind: "float",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100,
      },
      {
        key: "earnedAt",
        label: "Earned At",
        kind: "datetime",
        required: true,
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: true,
      },
    ],
  }),
  posts: defineTable({
    tableId: "posts",
    name: "Posts",
    description: "Community questions, discussions, and tips posted by users.",
    group: "community",
    fields: [
      {
        key: "userId",
        label: "User ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "title",
        label: "Title",
        kind: "string",
        required: true,
        size: 255,
      },
      {
        key: "content",
        label: "Content",
        kind: "richtext",
        required: true,
        size: 12000,
      },
      {
        key: "category",
        label: "Category",
        kind: "enum",
        required: true,
        options: ["question", "discussion", "tip"],
        defaultValue: "discussion",
      },
      {
        key: "subjectId",
        label: "Subject ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "photoUrl",
        label: "Photo URL",
        kind: "string",
        required: false,
        size: 2048,
      },
      {
        key: "likesCount",
        label: "Likes Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100000,
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: true,
      },
    ],
  }),
  comments: defineTable({
    tableId: "comments",
    name: "Comments",
    description: "Comments attached to a community post.",
    group: "community",
    fields: [
      {
        key: "postId",
        label: "Post ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "userId",
        label: "User ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "content",
        label: "Content",
        kind: "text",
        required: true,
        size: 4000,
      },
      {
        key: "likesCount",
        label: "Likes Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100000,
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: true,
      },
    ],
  }),
  replies: defineTable({
    tableId: "replies",
    name: "Replies",
    description: "Replies attached to a comment thread.",
    group: "community",
    fields: [
      {
        key: "commentId",
        label: "Comment ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "userId",
        label: "User ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "content",
        label: "Content",
        kind: "text",
        required: true,
        size: 4000,
      },
      {
        key: "likesCount",
        label: "Likes Count",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 100000,
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: true,
      },
    ],
  }),
  post_likes: defineTable({
    tableId: "post_likes",
    name: "Post Likes",
    description: "User likes recorded on posts.",
    group: "community",
    fields: [
      {
        key: "postId",
        label: "Post ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "userId",
        label: "User ID",
        kind: "string",
        required: true,
        size: 64,
      },
    ],
  }),
  comment_likes: defineTable({
    tableId: "comment_likes",
    name: "Comment Likes",
    description:
      "User likes recorded on a comment or reply. Fill one target field.",
    group: "community",
    fields: [
      {
        key: "commentId",
        label: "Comment ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "replyId",
        label: "Reply ID",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "userId",
        label: "User ID",
        kind: "string",
        required: true,
        size: 64,
      },
    ],
  }),
  announcements: defineTable({
    tableId: "announcements",
    name: "Announcements",
    description: "Admin announcements shown to users by role or audience.",
    group: "cms",
    fields: [
      {
        key: "title",
        label: "Title",
        kind: "string",
        required: true,
        size: 255,
      },
      {
        key: "content",
        label: "Content",
        kind: "richtext",
        required: true,
        size: 12000,
      },
      {
        key: "targetRole",
        label: "Target Role",
        kind: "enum",
        required: true,
        options: ["all", "student", "admin", "moderator"],
        defaultValue: "all",
      },
      {
        key: "publishedAt",
        label: "Published At",
        kind: "datetime",
        required: true,
      },
      {
        key: "expiresAt",
        label: "Expires At",
        kind: "datetime",
        required: false,
      },
    ],
  }),
  flagged_content: defineTable({
    tableId: "flagged_content",
    name: "Flagged Content",
    description: "Moderation queue for reported posts, comments, and replies.",
    group: "cms",
    fields: [
      {
        key: "contentType",
        label: "Content Type",
        kind: "enum",
        required: true,
        options: ["post", "comment", "reply"],
        defaultValue: "post",
      },
      {
        key: "contentId",
        label: "Content ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "reportedBy",
        label: "Reported By",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "reason",
        label: "Reason",
        kind: "text",
        required: true,
        size: 4000,
      },
      {
        key: "status",
        label: "Status",
        kind: "enum",
        required: true,
        options: ["pending", "reviewing", "resolved", "dismissed"],
        defaultValue: "pending",
      },
    ],
  }),
} as const

export type ReviewerTableKey = keyof typeof reviewerCmsSchema

export const reviewerTableEntries = Object.entries(reviewerCmsSchema) as [
  ReviewerTableKey,
  (typeof reviewerCmsSchema)[ReviewerTableKey],
][]

export function isReviewerTableKey(value: string): value is ReviewerTableKey {
  return value in reviewerCmsSchema
}

export function getReviewerTableDefinition(tableKey: ReviewerTableKey) {
  return reviewerCmsSchema[tableKey]
}

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type CmsFieldValue<F extends CmsFieldDefinition> = F["kind"] extends
  | "string"
  | "text"
  | "richtext"
  | "datetime"
  ? string
  : F["kind"] extends "integer" | "float"
    ? number
    : F["kind"] extends "boolean"
      ? boolean
      : F["kind"] extends "string[]"
        ? string[]
        : F["kind"] extends "enum"
          ? F["options"] extends readonly string[]
            ? F["options"][number]
            : string
          : never

type RequiredCmsFields<T extends CmsTableDefinition> = Extract<
  T["fields"][number],
  { required: true }
>

type OptionalCmsFields<T extends CmsTableDefinition> = Exclude<
  T["fields"][number],
  { required: true }
>

export type AppwriteMeta = {
  $id: string
  $createdAt: string
  $updatedAt: string
}

export type ReviewerTableData<K extends ReviewerTableKey> = Prettify<
  {
    [F in RequiredCmsFields<
      (typeof reviewerCmsSchema)[K]
    > as F["key"]]: CmsFieldValue<F>
  } & {
    [F in OptionalCmsFields<
      (typeof reviewerCmsSchema)[K]
    > as F["key"]]?: CmsFieldValue<F> | null
  }
>

export type ReviewerTableDocument<K extends ReviewerTableKey> = AppwriteMeta &
  ReviewerTableData<K>

export type ReviewerCreateInput<K extends ReviewerTableKey> =
  ReviewerTableData<K>

export type ReviewerUpdateInput<K extends ReviewerTableKey> = Partial<
  ReviewerCreateInput<K>
>

export type UserProfileDocument = ReviewerTableDocument<"user_profiles">
export type UserRoleDocument = ReviewerTableDocument<"user_roles">
export type SubjectDocument = ReviewerTableDocument<"subjects">
export type TopicDocument = ReviewerTableDocument<"topics">
export type LearningMaterialDocument =
  ReviewerTableDocument<"learning_materials">
export type UserAnswerDocument = ReviewerTableDocument<"user_answers">
export type UserProgressDocument = ReviewerTableDocument<"user_progress">
export type UserDailyActivityDocument =
  ReviewerTableDocument<"user_daily_activity">
export type UserWeeklyReportDocument =
  ReviewerTableDocument<"user_weekly_reports">
export type LearningHistoryDocument = ReviewerTableDocument<"learning_history">
export type PostDocument = ReviewerTableDocument<"posts">
export type CommentDocument = ReviewerTableDocument<"comments">
export type ReplyDocument = ReviewerTableDocument<"replies">
export type PostLikeDocument = ReviewerTableDocument<"post_likes">
export type CommentLikeDocument = ReviewerTableDocument<"comment_likes">
export type LearningAchievementDocument =
  ReviewerTableDocument<"learning_achievements">
export type AnnouncementDocument = ReviewerTableDocument<"announcements">
export type FlaggedContentDocument = ReviewerTableDocument<"flagged_content">

export type LearningMaterialType =
  ReviewerTableData<"learning_materials">["type"]

export const dashboardGroups = [
  { key: "auth", label: "Users and Access" },
  { key: "content", label: "Subjects and Review Content" },
  { key: "progress", label: "Answers and Progress" },
  { key: "achievements", label: "Learning Achievements" },
  { key: "community", label: "Community" },
  { key: "cms", label: "Admin and Moderation" },
] as const

export type QuestionnaireOption = {
  key: string
  text: string
}

export type QuestionnaireAnswer = {
  key: string
  text: string
}

export type QuestionnaireQuestionType = "multiple_choice"

export type QuestionnaireQuestion = {
  id: number
  type: QuestionnaireQuestionType
  question: string
  options: QuestionnaireOption[]
  answer: QuestionnaireAnswer
}

export type QuestionnaireDocument = {
  questionnaire: string
  set: string
  questionCount: number
  questions: QuestionnaireQuestion[]
}
