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
  group: "auth" | "content" | "assessment" | "progress" | "community" | "cms"
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
        label: "Subject ID",
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
        label: "Topic ID",
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
  questions: defineTable({
    tableId: "questions",
    name: "Questions",
    description:
      "Questionnaire items with explanations for practice and exams.",
    group: "assessment",
    fields: [
      {
        key: "topicId",
        label: "Topic ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "subjectId",
        label: "Subject ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "questionText",
        label: "Question Text",
        kind: "richtext",
        required: true,
        size: 7000,
      },
      {
        key: "difficulty",
        label: "Difficulty",
        kind: "enum",
        required: true,
        options: ["easy", "med", "hard"],
        defaultValue: "med",
      },
      {
        key: "type",
        label: "Question Type",
        kind: "enum",
        required: true,
        options: ["MCQ", "true-false"],
        defaultValue: "MCQ",
      },
      {
        key: "explanation",
        label: "Explanation",
        kind: "richtext",
        required: true,
        size: 7000,
      },
      {
        key: "createdBy",
        label: "Created By",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "isPremium",
        label: "Premium Question",
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
  choices: defineTable({
    tableId: "choices",
    name: "Choices",
    description: "Answer options attached to a question.",
    group: "assessment",
    fields: [
      {
        key: "questionId",
        label: "Question ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "choiceText",
        label: "Choice Text",
        kind: "text",
        required: true,
        size: 4000,
      },
      {
        key: "isCorrect",
        label: "Correct Answer",
        kind: "boolean",
        required: true,
        defaultValue: false,
      },
    ],
  }),
  question_tags: defineTable({
    tableId: "question_tags",
    name: "Question Tags",
    description: "Classification tags such as CSWE, Ethics, or Case Analysis.",
    group: "assessment",
    fields: [
      {
        key: "questionId",
        label: "Question ID",
        kind: "string",
        required: true,
        size: 64,
      },
      { key: "tag", label: "Tag", kind: "string", required: true, size: 128 },
    ],
  }),
  exams: defineTable({
    tableId: "exams",
    name: "Exams",
    description: "Mock, practice, and topic-based exams for the reviewer app.",
    group: "assessment",
    fields: [
      {
        key: "title",
        label: "Title",
        kind: "string",
        required: true,
        size: 255,
      },
      {
        key: "subjectId",
        label: "Subject ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "totalItems",
        label: "Total Items",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 9999,
      },
      {
        key: "timeLimit",
        label: "Time Limit (minutes)",
        kind: "integer",
        required: true,
        defaultValue: 180,
        min: 1,
        max: 1440,
      },
      {
        key: "type",
        label: "Exam Type",
        kind: "enum",
        required: true,
        options: ["mock", "practice", "topic"],
        defaultValue: "mock",
      },
      {
        key: "isPremium",
        label: "Premium Exam",
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
  exam_questions: defineTable({
    tableId: "exam_questions",
    name: "Exam Questions",
    description:
      "Question assignment, ordering, and shuffle behavior for each exam.",
    group: "assessment",
    fields: [
      {
        key: "examId",
        label: "Exam ID",
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
        key: "order",
        label: "Order",
        kind: "integer",
        required: true,
        defaultValue: 1,
        min: 1,
        max: 9999,
      },
      {
        key: "shuffle",
        label: "Shuffle",
        kind: "boolean",
        required: true,
        defaultValue: false,
      },
    ],
  }),
  exam_attempts: defineTable({
    tableId: "exam_attempts",
    name: "Exam Attempts",
    description: "User attempts for mock, practice, and topic exams.",
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
        key: "examId",
        label: "Exam ID",
        kind: "string",
        required: true,
        size: 64,
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
        key: "totalItems",
        label: "Total Items",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 9999,
      },
      {
        key: "timeTaken",
        label: "Time Taken (seconds)",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 86400,
      },
      {
        key: "status",
        label: "Status",
        kind: "enum",
        required: true,
        options: ["ongoing", "done"],
        defaultValue: "ongoing",
      },
      {
        key: "startedAt",
        label: "Started At",
        kind: "datetime",
        required: true,
      },
      {
        key: "finishedAt",
        label: "Finished At",
        kind: "datetime",
        required: false,
      },
    ],
  }),
  user_answers: defineTable({
    tableId: "user_answers",
    name: "User Answers",
    description: "Submitted answers linked to an exam attempt and question.",
    group: "progress",
    fields: [
      {
        key: "attemptId",
        label: "Attempt ID",
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
        key: "choiceId",
        label: "Choice ID",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "isCorrect",
        label: "Correct",
        kind: "boolean",
        required: true,
        defaultValue: false,
      },
    ],
  }),
  user_progress: defineTable({
    tableId: "user_progress",
    name: "User Progress",
    description: "Progress summary per student, subject, and topic.",
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
        required: true,
        size: 64,
      },
      {
        key: "topicId",
        label: "Topic ID",
        kind: "string",
        required: true,
        size: 64,
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
export type QuestionDocument = ReviewerTableDocument<"questions">
export type ChoiceDocument = ReviewerTableDocument<"choices">
export type QuestionTagDocument = ReviewerTableDocument<"question_tags">
export type ExamDocument = ReviewerTableDocument<"exams">
export type ExamQuestionDocument = ReviewerTableDocument<"exam_questions">
export type ExamAttemptDocument = ReviewerTableDocument<"exam_attempts">
export type UserAnswerDocument = ReviewerTableDocument<"user_answers">
export type UserProgressDocument = ReviewerTableDocument<"user_progress">
export type PostDocument = ReviewerTableDocument<"posts">
export type CommentDocument = ReviewerTableDocument<"comments">
export type ReplyDocument = ReviewerTableDocument<"replies">
export type PostLikeDocument = ReviewerTableDocument<"post_likes">
export type CommentLikeDocument = ReviewerTableDocument<"comment_likes">
export type AnnouncementDocument = ReviewerTableDocument<"announcements">
export type FlaggedContentDocument = ReviewerTableDocument<"flagged_content">

export type LearningMaterialType =
  ReviewerTableData<"learning_materials">["type"]

export const dashboardGroups = [
  { key: "auth", label: "Users and Access" },
  { key: "content", label: "Subjects and Review Content" },
  { key: "assessment", label: "Questionnaire and Exams" },
  { key: "progress", label: "Answers and Progress" },
  { key: "community", label: "Community" },
  { key: "cms", label: "Admin and Moderation" },
] as const
