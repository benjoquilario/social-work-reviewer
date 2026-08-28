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
  /**
   * Maintained by the system, not by a person.
   *
   * The form shows it as a read-only fact instead of an input, because a field
   * an editor can type into is a field an editor will type into - and a
   * hand-edited question count is worse than no question count.
   */
  readOnly?: boolean
  /**
   * Plain-language labels for enum values, keyed by the stored value.
   *
   * The stored value is a machine word (`board_exam`); the person picking it
   * should read "Board exam".
   */
  optionLabels?: Readonly<Record<string, string>>
}

export type CmsIndexType = "key" | "unique" | "fulltext"

export type CmsIndexDefinition = {
  key: string
  type: CmsIndexType
  /** Column keys, in order. Order matters for multi-column indexes. */
  columns: readonly string[]
  orders?: readonly ("ASC" | "DESC")[]
  description?: string
}

export type CmsTableDefinition = {
  tableId: string
  name: string
  description: string
  group:
    | "auth"
    | "billing"
    | "content"
    | "assessment"
    | "progress"
    | "achievements"
    | "community"
    | "cms"
  /**
   * Who writes this table, and therefore what the dashboard offers.
   *
   * - `manage`   the team authors it: create, edit, delete.
   * - `review`   the members generate it: list and delete only. There is no
   *   create form, because a hand-typed answer or study session is not data
   *   collected from anyone - it is data invented about them.
   * - `readonly` nobody writes it through the dashboard: the audit trail is
   *   only worth keeping if it cannot be edited by the people it records.
   * - `hidden`   not in the dashboard at all: a member's own settings, and
   *   the join tables behind likes.
   *
   * Defaults to `manage` so a new table has to opt out deliberately.
   *
   * This is one half of what the dashboard allows; the other half is
   * `domain`, which decides *who* may do it. A table permits an action only
   * when both agree.
   */
  access?: CmsTableAccess
  /**
   * Which area of the product this table belongs to, for permission checks.
   *
   * Roles are granted per domain rather than per table, so adding a table to
   * an area everyone already has access to needs no role change anywhere.
   */
  domain: CmsPermissionDomain
  fields: readonly CmsFieldDefinition[]
  /**
   * Indexes this table needs to function.
   *
   * Kept here rather than in a console checklist so the migration script can
   * create them and so a missing one is a diff, not something you discover
   * from a slow query months later.
   */
  indexes?: readonly CmsIndexDefinition[]
}

function defineTable<const T extends CmsTableDefinition>(definition: T) {
  return definition
}

/* -------------------------------------------------------------------------- *
 * Dashboard access control
 *
 * IMPORTANT FOR THE MOBILE APP: none of this applies to it. Roles and
 * permissions decide what the team can do in the web dashboard and nothing
 * else. Every signed-in account is an ordinary member in the app - including
 * the team's own - and the app must never read `user_roles` to decide what a
 * screen shows. Somebody with no row there is a member; a member who is also
 * an admin is still, in the app, just a member.
 *
 * What kind of person a member is - an undergraduate, a graduate sitting the
 * board, a retaker, a licensed social worker, an instructor, a review centre -
 * is `user_profiles.memberType`. That is a fact about them, not a permission:
 * it grants nothing and gates nothing.
 * -------------------------------------------------------------------------- */

/** An area of the product. Permissions are granted per area, not per table. */
export type CmsPermissionDomain =
  | "content"
  | "questions"
  | "announcements"
  | "members"
  | "billing"
  | "community"
  | "staff"

/**
 * Everything a person can be allowed to do in the dashboard.
 *
 * Permissions - not roles - are what the code checks. A role is only a named
 * bundle of these, which is what makes it safe to add or rename a role later:
 * the checks scattered through actions, pages, and API routes never change.
 *
 * The key reads `domain.action`. The value is the sentence shown to whoever is
 * handing the permission out, so it is written for them, not for us.
 */
export const cmsPermissionCatalog = {
  "dashboard.view": "Sign in to the dashboard",

  "content.view": "See subjects, topics, and learning materials",
  "content.create": "Add subjects, topics, and learning materials",
  "content.edit": "Edit review content",
  "content.delete": "Delete review content",
  "content.publish": "Publish or unpublish review content",

  "questions.view": "See exam categories, sets, and questions",
  "questions.create": "Add exam categories, sets, and questions",
  "questions.edit": "Edit exam categories, sets, and questions",
  "questions.delete": "Delete exam content",
  "questions.import": "Upload a filled-in Excel or CSV of questions",
  "questions.publish": "Publish or unpublish exam content",

  "members.view": "See member accounts and the activity collected from them",
  "members.delete": "Permanently delete collected member records",

  "billing.view": "See plans, subscriptions, and Google Play purchases",
  "billing.edit": "Change plans and access codes",

  "community.view": "See posts, comments, and reports",
  "community.moderate": "Remove community content and clear reports",

  "announcements.send": "Send push, email, and SMS announcements",

  "media.upload": "Upload images and files",
  "media.delete": "Delete uploaded files",

  "staff.view": "See who has dashboard access",
  "staff.manage": "Grant and revoke dashboard access",
} as const

export type CmsPermission = keyof typeof cmsPermissionCatalog

export const cmsPermissionKeys = Object.keys(
  cmsPermissionCatalog
) as CmsPermission[]

/**
 * A role someone can hold.
 *
 * The ladder has two rungs at the bottom and four above it. `student` and
 * `member` are both rank 0: neither grants a single dashboard permission, and
 * the pair exists because the audience is not one kind of person. `student` is
 * the default and the common case; `member` is everybody else in the audience
 * - the graduate sitting the board, the licensed social worker, the
 * instructor, the review centre.
 *
 * Because they are the same rank, nothing in the dashboard ever branches on
 * which one somebody holds, and nothing should: swapping a student to a member
 * grants nothing, revokes nothing, and unlocks nothing. Premium access comes
 * from a subscription and only from a subscription.
 *
 * For the finer answer - retaker or first-timer, agency or school - read
 * `user_profiles.memberType`, which is a fact about a person rather than a
 * rung on a ladder.
 */
export type CmsRole =
  | "student"
  | "member"
  | "encoder"
  | "moderator"
  | "admin"
  | "super_admin"

const encoderPermissions: readonly CmsPermission[] = [
  "dashboard.view",
  "content.view",
  "content.create",
  "content.edit",
  "questions.view",
  "questions.create",
  "questions.edit",
  "questions.import",
  "media.upload",
]

const moderatorPermissions: readonly CmsPermission[] = [
  ...encoderPermissions,
  "content.delete",
  "content.publish",
  "questions.delete",
  "questions.publish",
  "members.view",
  "billing.view",
  "community.view",
  "community.moderate",
  "media.delete",
  "staff.view",
]

/**
 * Everything except erasing the records we have collected about members.
 *
 * That one stays with the super admin because it is the only action in the
 * dashboard that destroys something the member cannot get back and we cannot
 * recreate.
 */
const adminPermissions: readonly CmsPermission[] = cmsPermissionKeys.filter(
  (permission) => permission !== "members.delete"
)

/**
 * The roles, in order of rank.
 *
 * `rank` is not decoration - it is what stops privilege escalation. Someone
 * may only hand out a role below their own, so an admin can build a team of
 * encoders and moderators but cannot mint another admin, and nobody can
 * promote themselves.
 */
export const cmsRoleDefinitions = {
  student: {
    label: "Student",
    rank: 0,
    summary:
      "Studying for the board exam. The default for a new account, and no dashboard access at all.",
    permissions: [] as readonly CmsPermission[],
  },
  member: {
    label: "Member",
    rank: 0,
    summary:
      "Everybody else who uses the app - a graduate sitting the board, a licensed social worker, an instructor, a review centre. Exactly the same access as a Student, which is none.",
    permissions: [] as readonly CmsPermission[],
  },
  encoder: {
    label: "Encoder",
    rank: 10,
    summary:
      "Types and uploads questions and review material. Cannot publish, delete, or see anything about members.",
    permissions: encoderPermissions,
  },
  moderator: {
    label: "Moderator",
    rank: 20,
    summary:
      "Checks an encoder's work, publishes it, and keeps the community clean. Reads member and billing data without changing it.",
    permissions: moderatorPermissions,
  },
  admin: {
    label: "Admin",
    rank: 30,
    summary:
      "Runs the platform day to day - announcements, plans, and access for encoders and moderators.",
    permissions: adminPermissions,
  },
  super_admin: {
    label: "Super Admin",
    rank: 40,
    summary:
      "The owner. The only role that can appoint admins or erase collected member records.",
    permissions: cmsPermissionKeys as readonly CmsPermission[],
  },
} as const

/** Lowest rank first, so a picker reads as a ladder. */
export const cmsRoleOrder: readonly CmsRole[] = [
  "student",
  "member",
  "encoder",
  "moderator",
  "admin",
  "super_admin",
]

export function isCmsRole(value: unknown): value is CmsRole {
  return typeof value === "string" && value in cmsRoleDefinitions
}

/**
 * An unknown or missing role reads as `student`, which grants nothing.
 *
 * Falling back to the bottom of the ladder rather than throwing is deliberate:
 * a role nobody recognises must never be treated as a role somebody does.
 */
export function toCmsRole(value: unknown): CmsRole {
  return isCmsRole(value) ? value : "student"
}

/**
 * What kind of member somebody is, for a label or a segment.
 *
 * Deliberately separate from `CmsRole`: an instructor and a retaker have
 * exactly the same rights, and a licensed social worker who buys a
 * subscription is a customer, not a member of staff. Conflating the two is how
 * an "instructor" role ends up quietly able to edit questions.
 */
export type MemberType =
  | "student"
  | "graduate"
  | "retaker"
  | "professional"
  | "instructor"
  | "institution"
  | "other"

export const memberTypeLabels: Record<MemberType, string> = {
  student: "Student",
  graduate: "Graduate",
  retaker: "Retaker",
  professional: "Licensed social worker",
  instructor: "Instructor",
  institution: "School or review centre",
  other: "Other",
}

export const memberTypeOrder: readonly MemberType[] = [
  "student",
  "graduate",
  "retaker",
  "professional",
  "instructor",
  "institution",
  "other",
]

export function isMemberType(value: unknown): value is MemberType {
  return typeof value === "string" && value in memberTypeLabels
}

/** Blank is the common case, so it reads as "not said" rather than "other". */
export function getMemberTypeLabel(value: unknown) {
  return isMemberType(value) ? memberTypeLabels[value] : "Not said"
}

export function getRoleDefinition(role: CmsRole) {
  return cmsRoleDefinitions[role]
}

export function getRoleLabel(role: CmsRole) {
  return cmsRoleDefinitions[role].label
}

export function getRoleRank(role: CmsRole) {
  return cmsRoleDefinitions[role].rank
}

export function getRolePermissions(role: CmsRole): readonly CmsPermission[] {
  return cmsRoleDefinitions[role].permissions
}

export function roleHasPermission(role: CmsRole, permission: CmsPermission) {
  return cmsRoleDefinitions[role].permissions.includes(permission)
}

/** Anyone who belongs in the dashboard at all. */
export function isStaffRole(role: CmsRole) {
  return roleHasPermission(role, "dashboard.view")
}

/**
 * The rungs that are not a job: `student` and `member`.
 *
 * Derived from the permission list rather than named, so a role added later
 * with no permissions joins them automatically instead of being quietly
 * counted as staff.
 */
export function isAudienceRole(role: CmsRole) {
  return !isStaffRole(role)
}

export const audienceRoles: readonly CmsRole[] = cmsRoleOrder.filter(
  (role) => !cmsRoleDefinitions[role].permissions.length
)

/** What a revoked staff member goes back to being. */
export const DEFAULT_ROLE: CmsRole = "student"

/**
 * May `actor` set someone's role to `target`?
 *
 * Strictly below your own rank, with one exception: a super admin may appoint
 * another super admin. Without that exception the owner role could never be
 * handed over or shared, and a platform with exactly one person able to
 * recover it is one lost password away from being unrecoverable.
 */
export function canGrantRole(actor: CmsRole, target: CmsRole) {
  if (!roleHasPermission(actor, "staff.manage")) {
    return false
  }

  if (actor === "super_admin") {
    return true
  }

  return getRoleRank(target) < getRoleRank(actor)
}

/**
 * May `actor` touch the staff row of someone who currently holds `subject`?
 *
 * Checked as well as `canGrantRole`, because demotion is an attack too: an
 * admin who could edit a super admin's row could demote the owner and take
 * the platform.
 */
export function canManageStaffMember(actor: CmsRole, subject: CmsRole) {
  if (!roleHasPermission(actor, "staff.manage")) {
    return false
  }

  if (actor === "super_admin") {
    return true
  }

  return getRoleRank(subject) < getRoleRank(actor)
}

/** What each domain's four table actions require. `null` means nobody may. */
const domainTablePermissions: Record<
  CmsPermissionDomain,
  Record<CmsTableAction, CmsPermission | null>
> = {
  content: {
    view: "content.view",
    create: "content.create",
    edit: "content.edit",
    delete: "content.delete",
  },
  questions: {
    view: "questions.view",
    create: "questions.create",
    edit: "questions.edit",
    delete: "questions.delete",
  },
  // Member data is collected, never authored: there is nothing to create or
  // edit, only rows to read and - rarely, deliberately - to erase.
  members: {
    view: "members.view",
    create: null,
    edit: null,
    delete: "members.delete",
  },
  // Reading one is ordinary content; writing one speaks to every member at
  // once, which is a different thing from writing a review note.
  announcements: {
    view: "content.view",
    create: "announcements.send",
    edit: "announcements.send",
    delete: "announcements.send",
  },
  billing: {
    view: "billing.view",
    create: "billing.edit",
    edit: "billing.edit",
    delete: "billing.edit",
  },
  community: {
    view: "community.view",
    create: "community.moderate",
    edit: "community.moderate",
    delete: "community.moderate",
  },
  staff: {
    view: "staff.view",
    create: "staff.manage",
    edit: "staff.manage",
    delete: "staff.manage",
  },
}

export type CmsTableAccess = "manage" | "review" | "readonly" | "hidden"

export type CmsTableAction = "view" | "create" | "edit" | "delete"

export const reviewerCmsSchema = {
  user_profiles: defineTable({
    tableId: "user_profiles",
    domain: "members",
    access: "review",
    name: "User Profiles",
    description:
      "One row per person who uses the app - students, graduates sitting the board, retakers, practising social workers, instructors. Profile and premium access, from Appwrite Auth.",
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
        key: "memberType",
        label: "Who they are",
        kind: "enum",
        required: false,
        options: [
          "student",
          "graduate",
          "retaker",
          "professional",
          "instructor",
          "institution",
          "other",
        ],
        optionLabels: {
          student: "Student - still taking the BSSW degree",
          graduate: "Graduate - finished, first time sitting the board",
          retaker: "Retaker - has sat the board exam before",
          professional: "Licensed social worker - CPD or a refresher",
          instructor: "Instructor - teaches or runs a review class",
          institution: "School or review centre - on a bulk plan",
          other: "Other",
        },
        description:
          "Who the member is, asked once at sign-up. It grants nothing and gates nothing - it is here so an announcement can be aimed at retakers, and so you can see who is actually paying. Blank is fine and common.",
      },
      {
        key: "schoolOrEmployer",
        label: "School or employer",
        kind: "string",
        required: false,
        size: 160,
        description:
          "Free text. The BSSW school for a student, the agency for a practising social worker.",
      },
      {
        key: "licenseNumber",
        label: "PRC licence number",
        kind: "string",
        required: false,
        size: 32,
        description:
          "Only licensed members have one, and only if they choose to give it. Never required to buy or use anything.",
      },
      // --- Cached membership state -----------------------------------------
      //
      // The `subscriptions` table decides who is premium. These four are a
      // cached answer so the app can gate a screen without querying it, and
      // `syncMembershipFromSubscriptions` is the only thing that writes them.
      {
        key: "isPremium",
        label: "Premium access",
        kind: "boolean",
        required: true,
        readOnly: true,
        defaultValue: false,
        description:
          "Cached from the member's subscriptions. Grant access by adding a subscription, not by flipping this.",
      },
      {
        key: "premiumUntil",
        label: "Premium until",
        kind: "datetime",
        required: false,
        readOnly: true,
        description:
          "When access lapses. Blank while on a lifetime plan or with no subscription at all.",
      },
      {
        key: "planName",
        label: "Current plan",
        kind: "string",
        required: false,
        readOnly: true,
        size: 120,
      },
      {
        key: "subscriptionStatus",
        label: "Membership",
        kind: "enum",
        required: false,
        readOnly: true,
        options: ["none", "pending", "active", "expired", "cancelled"],
        optionLabels: {
          none: "Free - never subscribed",
          pending: "Waiting for payment",
          active: "Subscribed",
          expired: "Lapsed",
          cancelled: "Cancelled",
        },
        defaultValue: "none",
      },
      {
        key: "lastActiveAt",
        label: "Last seen",
        kind: "datetime",
        required: false,
        description: "Written by the app when the member opens it.",
      },
      {
        key: "createdAt",
        label: "Joined",
        kind: "datetime",
        required: true,
      },
    ],
    indexes: [
      {
        key: "idx_profile_user",
        type: "unique",
        columns: ["userId"],
        description:
          "One profile per Appwrite account. Two would split a member's membership between them.",
      },
      {
        key: "idx_profile_premium",
        type: "key",
        columns: ["isPremium", "premiumUntil"],
        orders: ["ASC", "ASC"],
        description: "Backs subscriber lists and the lapse sweep.",
      },
    ],
  }),
  user_roles: defineTable({
    tableId: "user_roles",
    domain: "staff",
    name: "Staff Access",
    description:
      "Who can sign in to this dashboard, and as what. One row per person. Anybody without a row here is an ordinary member, which is the normal case - this table lists the team, not the customers. It has no effect on the mobile app.",
    group: "auth",
    fields: [
      {
        key: "userId",
        label: "Appwrite User ID",
        kind: "string",
        required: true,
        size: 64,
        description:
          "From Appwrite Auth. The person has to have signed in once before they can be given a role.",
      },
      {
        key: "role",
        label: "Role",
        kind: "enum",
        required: true,
        options: [
          "student",
          "member",
          "encoder",
          "moderator",
          "admin",
          "super_admin",
        ],
        optionLabels: {
          student: "Student - studying for the board, no dashboard access",
          member: "Member - any other app user, no dashboard access",
          encoder: "Encoder - writes questions and material",
          moderator: "Moderator - reviews, publishes, moderates",
          admin: "Admin - runs the platform",
          super_admin: "Super Admin - the owner",
        },
        defaultValue: "student",
        description:
          "You can only grant a role below your own. Setting someone back to Student or Member is how access is revoked - the two are the same thing as far as the dashboard is concerned.",
      },
      {
        key: "email",
        label: "Email",
        kind: "string",
        required: false,
        size: 320,
        description:
          "Copied at the time access was granted, so the staff list is readable without looking every ID up.",
      },
      {
        key: "name",
        label: "Name",
        kind: "string",
        required: false,
        size: 128,
      },
      {
        key: "grantedBy",
        label: "Granted by",
        kind: "string",
        required: false,
        size: 320,
        readOnly: true,
        description: "Who last changed this row.",
      },
      {
        key: "grantedAt",
        label: "Granted at",
        kind: "datetime",
        required: false,
        readOnly: true,
      },
      {
        key: "note",
        label: "Note",
        kind: "text",
        required: false,
        size: 500,
        description: "Why this person has access. Useful a year from now.",
      },
    ],
    indexes: [
      {
        key: "user_roles_user_unique",
        type: "unique",
        columns: ["userId"],
        description:
          "One role per person. Two rows would mean two answers to what someone is allowed to do, and the safe reading of that is neither.",
      },
      {
        key: "user_roles_role",
        type: "key",
        columns: ["role"],
        description: "Lists the team by rank, and finds the super admins.",
      },
    ],
  }),
  staff_activity: defineTable({
    tableId: "staff_activity",
    domain: "staff",
    access: "readonly",
    name: "Staff Activity",
    description:
      "An append-only record of what the team did in the dashboard: who granted access to whom, and what was published or deleted. Nothing here can be edited or removed - a log the people it records can rewrite is not a log.",
    group: "auth",
    fields: [
      {
        key: "actorId",
        label: "Who",
        kind: "string",
        required: true,
        size: 64,
        readOnly: true,
      },
      {
        key: "actorEmail",
        label: "Email",
        kind: "string",
        required: false,
        size: 320,
        readOnly: true,
      },
      {
        key: "actorRole",
        label: "Their role at the time",
        kind: "enum",
        required: false,
        options: [
          "student",
          "member",
          "encoder",
          "moderator",
          "admin",
          "super_admin",
        ],
        readOnly: true,
        description:
          "Stored rather than looked up later, because the point of a log is what was true when it happened.",
      },
      {
        key: "action",
        label: "What",
        kind: "enum",
        required: true,
        options: [
          "role_granted",
          "role_changed",
          "role_revoked",
          "record_created",
          "record_updated",
          "record_deleted",
          "questions_imported",
          "announcement_sent",
          "access_denied",
        ],
        optionLabels: {
          role_granted: "Granted dashboard access",
          role_changed: "Changed someone's role",
          role_revoked: "Revoked dashboard access",
          record_created: "Created a record",
          record_updated: "Updated a record",
          record_deleted: "Deleted a record",
          questions_imported: "Imported questions",
          announcement_sent: "Sent an announcement",
          access_denied: "Was refused an action",
        },
        readOnly: true,
      },
      {
        key: "summary",
        label: "Summary",
        kind: "string",
        required: true,
        size: 500,
        readOnly: true,
        description: "One sentence, written to be read a year from now.",
      },
      {
        key: "targetTable",
        label: "Table",
        kind: "string",
        required: false,
        size: 64,
        readOnly: true,
      },
      {
        key: "targetId",
        label: "Record",
        kind: "string",
        required: false,
        size: 64,
        readOnly: true,
      },
      {
        key: "occurredAt",
        label: "When",
        kind: "datetime",
        required: true,
        readOnly: true,
      },
    ],
    indexes: [
      {
        key: "staff_activity_occurred",
        type: "key",
        columns: ["occurredAt"],
        orders: ["DESC"],
        description: "The log is always read newest first.",
      },
      {
        key: "staff_activity_actor",
        type: "key",
        columns: ["actorId", "occurredAt"],
        orders: ["ASC", "DESC"],
        description: "Everything one person did.",
      },
      {
        key: "staff_activity_target",
        type: "key",
        columns: ["targetTable", "targetId"],
        description: "The history of a single record.",
      },
    ],
  }),
  user_settings: defineTable({
    tableId: "user_settings",
    domain: "members",
    access: "hidden",
    name: "Member Settings",
    description:
      "One row per member holding how they want to review. Somebody with no row gets the defaults, so the app works before anything is saved.",
    group: "auth",
    fields: [
      {
        key: "userId",
        label: "Member",
        kind: "string",
        required: true,
        size: 64,
      },
      // --- How answering behaves ------------------------------------------
      {
        key: "feedbackTiming",
        label: "When the answer is revealed",
        kind: "enum",
        required: false,
        options: ["instant", "on_next", "at_end"],
        optionLabels: {
          instant: "Instantly - as soon as a choice is tapped",
          on_next: "On Next - after confirming the answer",
          at_end: "At the end - only on the results screen",
        },
        defaultValue: "instant",
        description:
          "The one that changes the most: instant turns a paper into practice, at_end turns it into a mock exam.",
      },
      {
        key: "showExplanations",
        label: "Show the explanation with the answer",
        kind: "boolean",
        required: false,
        defaultValue: true,
      },
      {
        key: "autoAdvance",
        label: "Move on automatically",
        kind: "boolean",
        required: false,
        defaultValue: false,
        description:
          "Ignored when feedback is at_end, where there is nothing to read before moving on.",
      },
      {
        key: "autoAdvanceSeconds",
        label: "Seconds before moving on",
        kind: "integer",
        required: false,
        defaultValue: 2,
        min: 1,
        max: 30,
      },
      {
        key: "shuffleQuestions",
        label: "Shuffle the questions",
        kind: "boolean",
        required: false,
        defaultValue: false,
        description:
          "Shuffling changes the order shown, never the stored item numbers - a shuffled run must still record answers against the right question.",
      },
      {
        key: "shuffleChoices",
        label: "Shuffle the choices",
        kind: "boolean",
        required: false,
        defaultValue: false,
        description:
          "Reorder for display only. The correct answer is a position in the stored list, so the app has to map back before writing the answer.",
      },
      {
        key: "allowSkip",
        label: "Allow skipping",
        kind: "boolean",
        required: false,
        defaultValue: true,
      },
      {
        key: "questionSource",
        label: "Which questions to serve",
        kind: "enum",
        required: false,
        options: ["all", "unanswered", "incorrect", "bookmarked"],
        optionLabels: {
          all: "Everything in the paper",
          unanswered: "Only ones not answered yet",
          incorrect: "Only ones answered wrong before",
          bookmarked: "Only bookmarked ones",
        },
        defaultValue: "all",
        description:
          "'Incorrect' is the one members actually use - it turns the bank into a mistake drill.",
      },
      {
        key: "difficultyFilter",
        label: "Difficulty",
        kind: "enum",
        required: false,
        options: ["all", "easy", "medium", "hard"],
        defaultValue: "all",
      },
      {
        key: "questionsPerSession",
        label: "Questions per session",
        kind: "integer",
        required: false,
        defaultValue: 0,
        min: 0,
        max: 500,
        description: "0 means the whole paper.",
      },
      // --- Timing -----------------------------------------------------------
      {
        key: "timerMode",
        label: "Timer",
        kind: "enum",
        required: false,
        options: ["off", "per_question", "whole_session"],
        optionLabels: {
          off: "No timer",
          per_question: "Count down each question",
          whole_session: "Count down the whole session",
        },
        defaultValue: "off",
      },
      {
        key: "timerSeconds",
        label: "Seconds on the clock",
        kind: "integer",
        required: false,
        defaultValue: 60,
        min: 5,
        max: 36000,
        description:
          "Per question, or for the whole session, depending on the mode.",
      },
      // --- Reminders --------------------------------------------------------
      {
        key: "dailyGoalQuestions",
        label: "Daily goal",
        kind: "integer",
        required: false,
        defaultValue: 20,
        min: 0,
        max: 1000,
        description: "0 turns the goal off.",
      },
      {
        key: "reminderEnabled",
        label: "Daily study reminder",
        kind: "boolean",
        required: false,
        defaultValue: false,
      },
      {
        key: "reminderTime",
        label: "Reminder time",
        kind: "string",
        required: false,
        size: 5,
        defaultValue: "19:00",
        description:
          "24-hour HH:MM in the member's own timezone. Stored as text because it is a wall-clock time, not an instant - 7pm stays 7pm when they travel.",
      },
      {
        key: "timezone",
        label: "Timezone",
        kind: "string",
        required: false,
        size: 64,
        defaultValue: "Asia/Manila",
        description:
          "IANA name, so the reminder fires at the right local hour.",
      },
      {
        key: "notifyAnnouncements",
        label: "Announcements",
        kind: "boolean",
        required: false,
        defaultValue: true,
      },
      {
        key: "notifyStreak",
        label: "Streak reminders",
        kind: "boolean",
        required: false,
        defaultValue: true,
      },
      {
        key: "notifyCommunity",
        label: "Replies to my posts",
        kind: "boolean",
        required: false,
        defaultValue: true,
      },
      // --- Reading and display ---------------------------------------------
      {
        key: "theme",
        label: "Theme",
        kind: "enum",
        required: false,
        options: ["system", "light", "dark"],
        defaultValue: "system",
      },
      {
        key: "fontScale",
        label: "Text size",
        kind: "enum",
        required: false,
        options: ["small", "medium", "large", "xlarge"],
        defaultValue: "medium",
        description:
          "This is a reading app used for hours at a stretch; text size is an accessibility setting, not a decoration.",
      },
      {
        key: "language",
        label: "Language",
        kind: "enum",
        required: false,
        options: ["en", "fil"],
        optionLabels: { en: "English", fil: "Filipino" },
        defaultValue: "en",
      },
      {
        key: "soundEnabled",
        label: "Sounds",
        kind: "boolean",
        required: false,
        defaultValue: true,
      },
      {
        key: "hapticsEnabled",
        label: "Vibration",
        kind: "boolean",
        required: false,
        defaultValue: true,
      },
      // --- Privacy ----------------------------------------------------------
      {
        key: "showOnLeaderboard",
        label: "Show me on the leaderboard",
        kind: "boolean",
        required: false,
        defaultValue: true,
      },
      {
        key: "updatedAt",
        label: "Updated At",
        kind: "datetime",
        required: false,
        readOnly: true,
      },
    ],
    indexes: [
      {
        key: "idx_settings_user",
        type: "unique",
        columns: ["userId"],
        description:
          "One row per member. Two would let the app read one and write the other, and the setting would appear not to save.",
      },
    ],
  }),
  // --- Membership and billing ----------------------------------------------
  //
  //   subscription_plans  what can be bought
  //   access_codes        prepaid codes a review center hands out
  //   subscriptions       one purchased period of access - the source of truth
  //   payments            one movement of money, including proof to verify
  //
  // `user_profiles.isPremium` stays, but only as a cached answer to "can this
  // person open premium content right now". The subscription rows are what
  // decide it, and `lib/appwrite/subscriptions.ts` is the only thing allowed to
  // write the cached copy back.
  //
  // Google Play is the only way anyone pays. That removes a great deal:
  // there is no proof-of-payment screenshot, nothing for an admin to verify by
  // hand, and no card or e-wallet fields - Google collects the money, and the
  // purchase token it hands back is what proves it.
  //
  // Prices are whole pesos. Play Console sets the real charged price anyway,
  // and its localized string is what the paywall should show; the number here
  // is for the admin's own reporting.
  subscription_plans: defineTable({
    tableId: "subscription_plans",
    domain: "billing",
    name: "Plans",
    description:
      "What a member can buy. Create these once; a subscription points at one.",
    group: "billing",
    fields: [
      {
        key: "name",
        label: "Plan name",
        kind: "string",
        required: true,
        size: 120,
        placeholder: "6 Months Premium",
      },
      {
        key: "code",
        label: "Plan code",
        kind: "string",
        required: false,
        size: 32,
        placeholder: "Leave blank - PREMIUM6M is generated",
        description:
          "Stable handle the mobile app and receipts refer to. Do not change it once anyone has bought the plan.",
      },
      {
        key: "description",
        label: "What the member gets",
        kind: "text",
        required: false,
        size: 2000,
        placeholder: "Full access to every category, set, and review material.",
      },
      {
        key: "googleProductId",
        label: "Google Play product ID",
        kind: "string",
        required: true,
        size: 128,
        placeholder: "premium_6months",
        description:
          "The subscription product ID from Play Console. This is what the app hands to Play Billing, so it has to match exactly.",
      },
      {
        key: "googleBasePlanId",
        label: "Base plan ID",
        kind: "string",
        required: false,
        size: 128,
        placeholder: "Optional - only if the product has several base plans",
      },
      {
        key: "price",
        label: "Price",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 1000000,
        placeholder: "299",
        description:
          "Whole pesos, so 299 is 299 pesos. For your reporting only - the app shows the localized price Play returns, which is the one actually charged.",
      },
      {
        key: "currency",
        label: "Currency",
        kind: "string",
        required: false,
        size: 3,
        defaultValue: "PHP",
        description: "ISO code, for your reporting.",
      },
      {
        key: "durationDays",
        label: "Days of access",
        kind: "integer",
        required: true,
        defaultValue: 30,
        min: 0,
        max: 36500,
        description:
          "How long one purchase lasts. 0 means lifetime - the subscription then has no end date.",
      },
      {
        key: "isRecurring",
        label: "Renews automatically",
        kind: "boolean",
        required: false,
        defaultValue: true,
        description:
          "On for a Play subscription product, off for a one-off purchase. Play decides the real behaviour; this only matches it for reporting.",
      },
      {
        key: "features",
        label: "Feature list",
        kind: "string[]",
        required: false,
        size: 200,
        description: "One line per bullet shown on the plan card in the app.",
      },
      {
        key: "order",
        label: "Position in the list",
        kind: "integer",
        required: false,
        defaultValue: 1,
        min: 1,
        max: 9999,
        placeholder: "Leave blank to add at the end",
      },
      {
        key: "isPopular",
        label: "Highlight as best value",
        kind: "boolean",
        required: false,
        defaultValue: false,
      },
      {
        key: "isActive",
        label: "On sale",
        kind: "boolean",
        required: false,
        defaultValue: true,
        description:
          "Turn off to retire a plan. Existing subscriptions on it keep working.",
      },
      {
        key: "subscriberCount",
        label: "Active subscribers",
        kind: "integer",
        required: false,
        readOnly: true,
        defaultValue: 0,
        min: 0,
        max: 10000000,
        description: "Counted automatically.",
      },
    ],
    indexes: [
      {
        key: "idx_plan_code",
        type: "unique",
        columns: ["code"],
        description: "Receipts and the app refer to plans by code.",
      },
      {
        key: "idx_plan_google_product",
        type: "unique",
        columns: ["googleProductId"],
        description:
          "A purchase arrives from Play carrying only a product ID. Two plans sharing one would make it impossible to say what was bought.",
      },
      {
        key: "idx_plan_active_order",
        type: "key",
        columns: ["isActive", "order"],
        orders: ["ASC", "ASC"],
      },
    ],
  }),
  access_codes: defineTable({
    tableId: "access_codes",
    domain: "billing",
    name: "Access Codes",
    description:
      "Prepaid codes a review centre, school, or employer hands out. Redeeming one starts a subscription without a payment.",
    group: "billing",
    fields: [
      {
        key: "code",
        label: "Code",
        kind: "string",
        required: false,
        size: 32,
        placeholder: "Leave blank to generate one",
        description:
          "What the member types. Generated in an unambiguous alphabet - no O/0 or I/1 - because these get read off printed slips.",
      },
      {
        key: "planId",
        label: "Plan",
        kind: "string",
        required: true,
        size: 64,
        placeholder: "Which plan this code grants",
      },
      {
        key: "planName",
        label: "Plan name",
        kind: "string",
        required: false,
        readOnly: true,
        size: 120,
        description:
          "Copied from the plan so a redeemed code reads on its own.",
      },
      {
        key: "batchLabel",
        label: "Batch",
        kind: "string",
        required: false,
        size: 120,
        placeholder: "St. Mary's College - Batch 2026",
        description: "Your own label for where this batch of codes went.",
      },
      {
        key: "maxRedemptions",
        label: "How many members can use it",
        kind: "integer",
        required: false,
        defaultValue: 1,
        min: 1,
        max: 100000,
        description:
          "1 for a personal code. Higher for a shared classroom code.",
      },
      {
        key: "redeemedCount",
        label: "Times redeemed",
        kind: "integer",
        required: false,
        readOnly: true,
        defaultValue: 0,
        min: 0,
        max: 100000,
      },
      {
        key: "expiresAt",
        label: "Usable until",
        kind: "datetime",
        required: false,
        description: "Optional. After this the code stops working.",
      },
      {
        key: "isActive",
        label: "Active",
        kind: "boolean",
        required: false,
        defaultValue: true,
        description: "Turn off to kill a code that leaked.",
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: false,
        readOnly: true,
      },
    ],
    indexes: [
      {
        key: "idx_access_code",
        type: "unique",
        columns: ["code"],
        description:
          "The code is what a member types; two codes sharing one would grant the wrong plan.",
      },
      {
        key: "idx_access_code_batch",
        type: "key",
        columns: ["batchLabel"],
      },
    ],
  }),
  subscriptions: defineTable({
    tableId: "subscriptions",
    domain: "billing",
    access: "review",
    name: "Subscriptions",
    description:
      "One purchased period of access. This decides who is premium; the flag on the profile is only a cached copy.",
    group: "billing",
    fields: [
      {
        key: "userId",
        label: "Member",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "planId",
        label: "Plan",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "planName",
        label: "Plan name",
        kind: "string",
        required: false,
        size: 120,
        description:
          "Copied at purchase. A plan renamed or retired later must not rewrite what someone already bought.",
      },
      {
        key: "status",
        label: "Status",
        kind: "enum",
        required: true,
        options: ["pending", "active", "expired", "cancelled", "refunded"],
        optionLabels: {
          pending: "Pending - waiting for payment",
          active: "Active - member has access",
          expired: "Expired - period ended",
          cancelled: "Cancelled - stopped early",
          refunded: "Refunded - money returned",
        },
        defaultValue: "pending",
      },
      {
        key: "startsAt",
        label: "Access starts",
        kind: "datetime",
        required: false,
      },
      {
        key: "endsAt",
        label: "Access ends",
        kind: "datetime",
        required: false,
        description:
          "Blank means lifetime. Everything that asks whether someone is premium compares against this.",
      },
      {
        key: "autoRenew",
        label: "Renews automatically",
        kind: "boolean",
        required: false,
        defaultValue: false,
      },
      {
        key: "source",
        label: "How it was bought",
        kind: "enum",
        required: false,
        options: ["google_play", "access_code", "promo", "manual"],
        optionLabels: {
          google_play: "Google Play",
          access_code: "Access code",
          promo: "Free promo",
          manual: "Granted by an admin",
        },
        defaultValue: "google_play",
      },
      {
        key: "amountPaid",
        label: "Amount paid",
        kind: "integer",
        required: false,
        defaultValue: 0,
        min: 0,
        max: 1000000,
        description: "Whole pesos. Zero for a promo, a grant, or a free trial.",
      },
      {
        key: "currency",
        label: "Currency",
        kind: "string",
        required: false,
        size: 3,
        defaultValue: "PHP",
      },
      {
        key: "accessCodeId",
        label: "Access code used",
        kind: "string",
        required: false,
        size: 64,
      },
      // --- Google Play ------------------------------------------------------
      {
        key: "purchaseToken",
        label: "Play purchase token",
        kind: "string",
        required: false,
        size: 1024,
        readOnly: true,
        description:
          "What Play gives the app and what the server verifies against the Play Developer API. It is also the identity of the purchase - see the unique index.",
      },
      {
        key: "orderId",
        label: "Play order ID",
        kind: "string",
        required: false,
        size: 128,
        readOnly: true,
        placeholder: "GPA.0000-0000-0000-00000",
      },
      {
        key: "productId",
        label: "Play product ID",
        kind: "string",
        required: false,
        size: 128,
        readOnly: true,
        description: "Copied from the purchase, so it survives a plan rename.",
      },
      {
        key: "autoRenewing",
        label: "Play will renew this",
        kind: "boolean",
        required: false,
        readOnly: true,
        defaultValue: true,
        description:
          "Straight from Play. Off means the member cancelled but still has access until the period ends.",
      },
      {
        key: "isAcknowledged",
        label: "Acknowledged with Play",
        kind: "boolean",
        required: false,
        readOnly: true,
        defaultValue: false,
        description:
          "Google REFUNDS any purchase not acknowledged within three days. This is the flag that says the server did it.",
      },
      {
        key: "latestNotificationType",
        label: "Last Play notification",
        kind: "integer",
        required: false,
        readOnly: true,
        min: 0,
        max: 100,
        description:
          "The last RTDN subscription notification type applied, so a replayed message can be recognised.",
      },
      {
        key: "cancelledAt",
        label: "Cancelled at",
        kind: "datetime",
        required: false,
      },
      {
        key: "note",
        label: "Admin note",
        kind: "text",
        required: false,
        size: 2000,
        placeholder: "Why this was granted, refunded, or extended.",
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: false,
        readOnly: true,
      },
    ],
    indexes: [
      {
        key: "idx_subscription_user_status",
        type: "key",
        columns: ["userId", "status"],
        description: "Backs 'what is this member's current access'.",
      },
      {
        key: "idx_subscription_expiry",
        type: "key",
        columns: ["status", "endsAt"],
        orders: ["ASC", "ASC"],
        description:
          "Backs the sweep that expires finished subscriptions, which has to find them by date without reading the whole table.",
      },
      {
        key: "idx_subscription_order",
        type: "key",
        columns: ["orderId"],
        description:
          "Play notifications arrive carrying an order ID; this is how the row they refer to is found.",
      },
    ],
  }),
  payments: defineTable({
    tableId: "payments",
    domain: "billing",
    access: "review",
    name: "Purchases",
    description:
      "One charge Google reported: the first purchase and every renewal after it. Nothing here is entered by hand - Play is the record of what was collected.",
    group: "billing",
    fields: [
      {
        key: "userId",
        label: "Member",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "subscriptionId",
        label: "Subscription",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "amount",
        label: "Amount",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 1000000,
        description: "Whole pesos, as reported by Play.",
      },
      {
        key: "currency",
        label: "Currency",
        kind: "string",
        required: false,
        size: 3,
        defaultValue: "PHP",
      },
      {
        key: "status",
        label: "Status",
        kind: "enum",
        required: true,
        options: ["paid", "refunded", "pending", "failed"],
        optionLabels: {
          paid: "Paid",
          refunded: "Refunded by Google",
          pending: "Pending - Play is still processing",
          failed: "Failed",
        },
        defaultValue: "paid",
      },
      {
        key: "kind",
        label: "Kind",
        kind: "enum",
        required: false,
        options: ["initial", "renewal", "refund"],
        optionLabels: {
          initial: "First purchase",
          renewal: "Renewal",
          refund: "Refund",
        },
        defaultValue: "initial",
        description:
          "Separating renewals from first purchases is what makes the revenue figures mean anything.",
      },
      {
        key: "orderId",
        label: "Play order ID",
        kind: "string",
        required: false,
        size: 128,
        readOnly: true,
        description:
          "Unique per charge. Play sends the same notification more than once, and this is what stops a renewal being counted twice.",
      },
      {
        key: "purchaseToken",
        label: "Play purchase token",
        kind: "string",
        required: false,
        size: 1024,
        readOnly: true,
      },
      {
        key: "productId",
        label: "Play product ID",
        kind: "string",
        required: false,
        size: 128,
        readOnly: true,
      },
      {
        key: "paidAt",
        label: "Paid at",
        kind: "datetime",
        required: false,
      },
      {
        key: "note",
        label: "Note",
        kind: "text",
        required: false,
        size: 2000,
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: false,
        readOnly: true,
      },
    ],
    indexes: [
      {
        key: "idx_payment_order",
        type: "unique",
        columns: ["orderId"],
        description:
          "One row per charge. Play re-delivers notifications until they are acknowledged, so without this every retry would add another purchase and inflate the revenue.",
      },
      {
        key: "idx_payment_user",
        type: "key",
        columns: ["userId", "createdAt"],
        orders: ["ASC", "DESC"],
        description: "Backs a member's purchase history.",
      },
      {
        key: "idx_payment_status",
        type: "key",
        columns: ["status", "createdAt"],
        orders: ["ASC", "DESC"],
      },
    ],
  }),
  // --- Review content -------------------------------------------------------
  //
  //   subjects            what a member browses
  //     topics            chapters within a subject
  //       learning_materials  the notes, PDFs, and videos themselves
  //
  // Reading material only. Exam questions live under exam_categories and are
  // deliberately not connected to any of this - see the assessment block.
  subjects: defineTable({
    tableId: "subjects",
    domain: "content",
    name: "Subjects",
    description:
      "STEP 1 for review content. A subject a member browses, such as Human Behavior and Social Environment.",
    group: "content",
    fields: [
      {
        key: "name",
        label: "Subject name",
        kind: "string",
        required: true,
        size: 255,
        placeholder: "Human Behavior and Social Environment",
        description: "As the member sees it in the app.",
      },
      {
        key: "description",
        label: "Notes",
        kind: "text",
        required: false,
        size: 3000,
        placeholder: "Optional. What this subject covers.",
      },
      {
        key: "iconUrl",
        label: "Icon",
        kind: "string",
        required: false,
        size: 1024,
        placeholder: "Optional. Link to an icon shown beside the subject.",
      },
      {
        key: "order",
        label: "Position in the list",
        kind: "integer",
        required: false,
        defaultValue: 1,
        min: 1,
        max: 9999,
        placeholder: "Leave blank to add at the end",
        description: "1 shows first. Leave blank and it goes after the rest.",
      },
      {
        key: "isPublished",
        label: "Visible in the app",
        kind: "boolean",
        required: false,
        defaultValue: true,
        description: "Turn off to hide this subject and everything under it.",
      },
      {
        key: "topicCount",
        label: "Topics",
        kind: "integer",
        required: false,
        readOnly: true,
        defaultValue: 0,
        min: 0,
        max: 10000,
        description: "Counted automatically.",
      },
      {
        key: "materialCount",
        label: "Materials",
        kind: "integer",
        required: false,
        readOnly: true,
        defaultValue: 0,
        min: 0,
        max: 100000,
        description:
          "Every material across this subject's topics. Counted automatically.",
      },
    ],
  }),
  topics: defineTable({
    tableId: "topics",
    domain: "content",
    name: "Topics",
    description:
      "STEP 2 for review content. A chapter inside a subject. Materials hang off these.",
    group: "content",
    fields: [
      {
        key: "subjectId",
        label: "Subject",
        kind: "string",
        required: true,
        size: 64,
        placeholder: "Pick the subject this topic belongs to",
        description: "Create it in Subjects first if it is not listed.",
      },
      {
        key: "title",
        label: "Topic name",
        kind: "string",
        required: true,
        size: 255,
        placeholder: "Theories of Human Development",
      },
      {
        key: "description",
        label: "Notes",
        kind: "text",
        required: false,
        size: 3000,
        placeholder: "Optional. What this topic covers.",
      },
      {
        key: "order",
        label: "Position in the subject",
        kind: "integer",
        required: false,
        defaultValue: 1,
        min: 1,
        max: 9999,
        placeholder: "Leave blank to add at the end",
        description: "1 shows first within its subject.",
      },
      {
        key: "isPublished",
        label: "Visible in the app",
        kind: "boolean",
        required: false,
        defaultValue: true,
        description: "Turn off to hide this topic and its materials.",
      },
      {
        key: "materialCount",
        label: "Materials",
        kind: "integer",
        required: false,
        readOnly: true,
        defaultValue: 0,
        min: 0,
        max: 100000,
        description: "Counted automatically.",
      },
    ],
    indexes: [
      {
        key: "idx_topic_subject_order",
        type: "key",
        columns: ["subjectId", "order"],
        orders: ["ASC", "ASC"],
        description: "Backs listing a subject's topics in order.",
      },
    ],
  }),
  learning_materials: defineTable({
    tableId: "learning_materials",
    domain: "content",
    name: "Learning Materials",
    description:
      "STEP 3 for review content. One note, PDF, or video inside a topic.",
    group: "content",
    fields: [
      {
        key: "topicId",
        label: "Topic",
        kind: "string",
        required: true,
        size: 64,
        placeholder: "Pick the topic this material belongs to",
        description: "Create it in Topics first if it is not listed.",
      },
      {
        key: "subjectId",
        label: "Subject",
        kind: "string",
        required: false,
        readOnly: true,
        size: 64,
        placeholder: "Taken from the topic",
        description:
          "Copied from the topic so a subject's materials are one query. Appwrite cannot join, and walking subject to topics to materials meant an IN filter over every topic id.",
      },
      {
        key: "title",
        label: "Material title",
        kind: "string",
        required: true,
        size: 255,
        placeholder: "Erikson's Stages of Psychosocial Development",
      },
      {
        key: "type",
        label: "Content type",
        kind: "enum",
        required: true,
        options: ["note", "pdf", "video"],
        optionLabels: {
          note: "Written note - typed in the editor below",
          pdf: "PDF - linked file",
          video: "Video - linked file",
        },
        defaultValue: "note",
        description:
          "A written note uses the editor. A PDF or video uses the link field instead.",
      },
      {
        key: "fileUrl",
        label: "File or video link",
        kind: "string",
        required: false,
        size: 2048,
        placeholder: "https://... for a PDF or video",
        description: "Only for PDF and video. Leave blank for a written note.",
      },
      {
        key: "content",
        label: "Written content",
        kind: "richtext",
        required: false,
        size: 20000,
        placeholder: "Type the review notes here.",
        description: "Only for a written note. Leave blank for a PDF or video.",
      },
      {
        key: "order",
        label: "Position in the topic",
        kind: "integer",
        required: false,
        defaultValue: 1,
        min: 1,
        max: 9999,
        placeholder: "Leave blank to add at the end",
        description: "1 shows first within its topic.",
      },
      {
        key: "isPremium",
        label: "Premium only",
        kind: "boolean",
        required: true,
        defaultValue: false,
        description: "On means only paying students can open this material.",
      },
      {
        key: "isPublished",
        label: "Visible in the app",
        kind: "boolean",
        required: false,
        defaultValue: true,
        description: "Turn off to keep a draft out of the app.",
      },
      {
        key: "createdAt",
        label: "Created At",
        kind: "datetime",
        required: true,
        readOnly: true,
      },
    ],
    indexes: [
      {
        key: "idx_material_topic_order",
        type: "key",
        columns: ["topicId", "order"],
        orders: ["ASC", "ASC"],
        description: "Backs listing a topic's materials in order.",
      },
      {
        key: "idx_material_subject_order",
        type: "key",
        columns: ["subjectId", "order"],
        orders: ["ASC", "ASC"],
        description:
          "Backs listing everything in a subject without first collecting its topic ids.",
      },
    ],
  }),
  // --- Assessment content ---------------------------------------------------
  //
  //   exam_categories  the subject area, and the unit questions belong to
  //   questionnaires   an OPTIONAL lettered set inside a category
  //   questions        the items, one row each
  //
  // The category is the parent, not the set. Real categories differ: "Human
  // Behavior and Social Environment" is 100 questions and nothing else, while
  // "History, Social Conditions, Issues and CO Drill" splits into Set A, B, and
  // C. Making the set required would force an empty one on every category that
  // does not have any, so `questions.questionnaireId` is optional and a blank
  // one means "directly under the category".
  //
  // Questions are NOT hung off `subjects`/`topics`. Those model the reading
  // material; an exam item is its own artefact with its own lifecycle, and
  // tying the two would mean a category could not exist until someone created
  // a matching subject.
  exam_categories: defineTable({
    tableId: "exam_categories",
    domain: "questions",
    name: "Exam Categories",
    description:
      "STEP 1, and the only step that is ever required. A subject area, such as Human Behavior and Social Environment. Questions can be uploaded straight into a category; sets are only for categories that need them.",
    group: "assessment",
    fields: [
      {
        key: "title",
        label: "Category name",
        kind: "string",
        required: true,
        size: 255,
        placeholder: "Human Behavior and Social Environment",
        description:
          "The subject area as the student sees it. Example: Social Work Foundation, or History, Social Conditions, Issues and CO Drill.",
      },
      {
        key: "mode",
        label: "Exam type",
        kind: "enum",
        required: true,
        options: ["quiz", "board_exam"],
        optionLabels: {
          quiz: "Quiz - short practice set",
          board_exam: "Board exam - full timed paper",
        },
        defaultValue: "board_exam",
        description:
          "Where everything in this category appears for the student. Sets inside it inherit this.",
      },
      {
        key: "isPremium",
        label: "Premium only",
        kind: "boolean",
        required: true,
        defaultValue: false,
        description:
          "On means only paying students see this category. Single items can still be opened up with Free Sample in the sheet.",
      },
      {
        // Optional on purpose. A required counter column blocks every write to
        // any row that predates it - including the counter update itself - and
        // a number the system maintains should never be able to do that.
        key: "questionCount",
        label: "Questions in this category",
        kind: "integer",
        required: false,
        readOnly: true,
        defaultValue: 0,
        min: 0,
        max: 1000000,
        description:
          "Every question in the category, including the ones inside its sets. Counted automatically.",
      },
      // --- The mobile app's routing signal ------------------------------------
      //
      // "Does this category have sets?" decides whether the app opens a set
      // picker or goes straight into the questions. Answering it by querying
      // the sets table would cost one extra round trip per category on a screen
      // that lists all of them, so the answer is kept on the row and maintained
      // by the CMS. Both counts are of PUBLISHED content, because that is what
      // the app is deciding about.
      {
        key: "setCount",
        label: "Published sets",
        kind: "integer",
        required: false,
        readOnly: true,
        defaultValue: 0,
        min: 0,
        max: 100,
        description:
          "0 means this category has no sets, so the app goes straight to its questions. Above 0 means show the Set A / Set B picker. Counted automatically.",
      },
      {
        key: "directQuestionCount",
        label: "Questions not in any set",
        kind: "integer",
        required: false,
        readOnly: true,
        defaultValue: 0,
        min: 0,
        max: 1000000,
        description:
          "The questions sitting directly under this category. Equal to the total when there are no sets. Counted automatically.",
      },
      {
        key: "code",
        label: "Short code",
        kind: "string",
        required: false,
        size: 16,
        placeholder: "Leave blank - HSCI is generated from the name",
        description:
          "Optional. Leave it blank and one is made from the first letters of the name. It seeds the codes of the papers beneath it, so do not change it once questions exist.",
      },
      {
        key: "description",
        label: "Notes",
        kind: "text",
        required: false,
        size: 3000,
        placeholder: "Optional. What this area covers, for your own reference.",
      },
      {
        key: "order",
        label: "Position in the list",
        kind: "integer",
        required: true,
        defaultValue: 1,
        min: 1,
        max: 9999,
        description:
          "1 shows first in the app. Use 1, 2, 3... in the order students should meet them.",
      },
      {
        key: "isPublished",
        label: "Visible in the app",
        kind: "boolean",
        required: true,
        defaultValue: true,
        description: "Turn off to hide this area and its papers from students.",
      },
    ],
    indexes: [
      {
        key: "idx_category_code",
        type: "unique",
        columns: ["code"],
        description:
          "Codes seed every questionnaire code beneath them, so two categories sharing one would produce colliding paper codes.",
      },
      {
        key: "idx_category_published_order",
        type: "key",
        columns: ["isPublished", "order"],
        orders: ["ASC", "ASC"],
        description: "Backs the published-categories listing.",
      },
    ],
  }),
  questionnaires: defineTable({
    tableId: "questionnaires",
    domain: "questions",
    name: "Sets (optional)",
    description:
      "OPTIONAL. Only for a category that splits into Set A, Set B, Set C. A category with one straight run of questions needs none of these - upload into the category itself instead.",
    group: "assessment",
    fields: [
      {
        key: "categoryId",
        label: "Exam category",
        kind: "string",
        required: true,
        size: 64,
        placeholder: "Pick the subject area this set belongs to",
        description: "Create it in Exam Categories first if it is not listed.",
      },
      {
        // Deliberately a string, not an enum.
        //
        // An enum would put a ceiling on how many sets a category can have, and
        // the ceiling always turns out to be one short: A-E looked generous
        // until a category needed an F. Labels follow the spreadsheet-column
        // scheme - A..Z, then AA, AB - so they never run out, and leaving this
        // blank assigns the next free one for the category.
        key: "setCode",
        label: "Set letter",
        kind: "string",
        required: false,
        readOnly: true,
        size: 8,
        placeholder: "Assigned when you save",
        description:
          "Assigned automatically: the first set in a category is A, the next B, and so on. There is no limit - after Z it continues AA, AB.",
      },
      {
        key: "title",
        label: "Set name",
        kind: "string",
        required: false,
        size: 255,
        placeholder: "Leave blank - it is called Set A",
        description:
          "Optional. Only worth filling in when the set has a name of its own, such as 2019 Retake.",
      },
      {
        key: "code",
        label: "Short code",
        kind: "string",
        required: false,
        size: 24,
        placeholder: "Leave blank - HSCI-A is generated for you",
        description:
          "Optional. Made from the category code and set letter. It names the downloaded sheet, so it is worth leaving alone.",
      },
      {
        key: "description",
        label: "Notes",
        kind: "text",
        required: false,
        size: 3000,
        placeholder: "Optional. Source of the questions, year, who encoded it.",
      },
      {
        key: "order",
        label: "Position in the list",
        kind: "integer",
        required: true,
        defaultValue: 1,
        min: 1,
        max: 9999,
        description: "1 shows first within its category.",
      },
      {
        key: "isPublished",
        label: "Visible in the app",
        kind: "boolean",
        required: true,
        defaultValue: false,
        description:
          "Off by default. Turn it on once the questions are uploaded and checked, so a half-finished set never reaches students.",
      },
      {
        // Optional for the same reason as the category counter.
        key: "questionCount",
        label: "Questions in this set",
        kind: "integer",
        required: false,
        readOnly: true,
        defaultValue: 0,
        min: 0,
        max: 100000,
        description:
          "Counted automatically every time questions are uploaded. Nothing to fill in.",
      },
    ],
    indexes: [
      {
        key: "idx_questionnaire_code",
        type: "unique",
        columns: ["code"],
        description:
          "Codes name the downloaded sheet. Without uniqueness two sets would produce the same file name.",
      },
      {
        key: "idx_questionnaire_category",
        type: "key",
        columns: ["categoryId", "order"],
        orders: ["ASC", "ASC"],
      },
      {
        key: "idx_questionnaire_category_set",
        type: "unique",
        columns: ["categoryId", "setCode"],
        description:
          "One Set B per category. Two would show a student the same letter twice with different questions behind it. Scoped to the category, so every category still has its own Set A.",
      },
    ],
  }),
  questions: defineTable({
    tableId: "questions",
    domain: "questions",
    name: "Questions",
    description:
      "Exam items. One row per question, with each choice in its own column.",
    group: "assessment",
    fields: [
      {
        key: "sku",
        label: "SKU",
        kind: "string",
        required: true,
        size: 24,
        description:
          "Permanent item identifier, e.g. Q-000142. Assigned once and never reissued, so answer history survives a delete-and-reimport. Deliberately meaningless: a code that encoded category or set would go stale the moment an item moved. Needs a unique index.",
      },
      {
        key: "categoryId",
        label: "Exam category",
        kind: "string",
        required: true,
        size: 64,
        description: "The subject area this item belongs to. Always set.",
      },
      {
        key: "questionnaireId",
        label: "Set",
        kind: "string",
        required: false,
        size: 64,
        description:
          "Optional. Blank means the item sits directly under the category, which is the normal case; a value means it belongs to Set A, B, or C of that category.",
      },
      {
        key: "order",
        label: "Item Number",
        kind: "integer",
        required: true,
        defaultValue: 1,
        min: 1,
        max: 100000,
      },
      {
        key: "prompt",
        label: "Question",
        kind: "text",
        required: true,
        size: 5000,
      },
      {
        key: "questionType",
        label: "Question Type",
        kind: "enum",
        required: true,
        options: ["multiple_choice", "true_false"],
        defaultValue: "multiple_choice",
      },
      {
        key: "difficulty",
        label: "Difficulty",
        kind: "enum",
        required: true,
        options: ["easy", "medium", "hard"],
        defaultValue: "medium",
      },
      // An ordered list, not a fixed set of columns and not a child table.
      //
      // Choice counts genuinely vary (this bank runs 2-5 today and six-option
      // items exist), so any column cap is an arbitrary ceiling that eventually
      // has to be migrated. Every serious assessment model treats choices as a
      // repeating list: QTI has `simpleChoice` elements, Moodle has a
      // `question_answers` child table, edX OLX has `choice` nodes.
      //
      // A child table would match those exactly, but Appwrite gives us neither
      // joins nor transactions. No joins means a second paginated read for
      // every paper; no transactions means a failed import can leave a question
      // holding two of its four choices — a silently broken exam item. Keeping
      // the list on the row makes a question atomic: one row, one write, all of
      // it or none.
      //
      // The spreadsheet stays one row per question regardless. How the sheet
      // looks and how the table stores it are separate decisions.
      {
        key: "choices",
        label: "Choices",
        kind: "string[]",
        required: true,
        size: 2000,
        description:
          "Ordered list of choice texts. Position is identity: index 0 is displayed as A, 1 as B, and so on.",
      },
      {
        key: "answerIndex",
        label: "Answer Index",
        kind: "integer",
        required: true,
        defaultValue: 0,
        min: 0,
        max: 999,
        description:
          "Zero-based position of the correct entry in `choices`. Stored as a position rather than a letter so the two can never disagree.",
      },
      {
        key: "explanation",
        label: "Explanation",
        kind: "text",
        required: false,
        size: 5000,
      },
      {
        key: "imageUrl",
        label: "Image",
        kind: "string",
        required: false,
        size: 2048,
        description:
          "Optional figure for the item: either a CMS upload path (/api/assets/<fileId>) or an absolute URL. A URL rather than a storage ID because the spreadsheet has to be able to carry one, and an encoder filling a cell has a link to paste, never a file ID.",
      },
      {
        key: "isFree",
        label: "Free Sample",
        kind: "boolean",
        required: true,
        defaultValue: false,
        description:
          "Opt in, per item. Defaults to premium so a blank column locks content rather than giving the bank away — and so the free sample can be a hand-picked, representative set instead of whichever items happen to sort first.",
      },
    ],
    indexes: [
      {
        key: "idx_question_sku",
        type: "unique",
        columns: ["sku"],
        description:
          "The SKU is the upsert key and what answer history records. Two rows sharing one would merge two questions' statistics.",
      },
      {
        key: "idx_question_paper_order",
        type: "key",
        columns: ["questionnaireId", "order"],
        orders: ["ASC", "ASC"],
        description: "Backs reading one set in item order.",
      },
      {
        key: "idx_question_category_order",
        type: "key",
        columns: ["categoryId", "order"],
        orders: ["ASC", "ASC"],
        description:
          "Backs reading a whole category in item order - the hot path, because most categories have no sets at all.",
      },
      {
        // Two uploads running at once both read "the last item is 20" and both
        // write 21. Nothing in application code can prevent that; the database
        // has to be the one that says no, so the loser can take 22 instead.
        //
        // Scoped by set as well as category: a set numbers from 1 on its own,
        // and an empty questionnaireId is what "no set" stores, so loose items
        // and every set each get their own run of numbers.
        key: "idx_question_target_order",
        type: "unique",
        columns: ["categoryId", "questionnaireId", "order"],
        description:
          "One item number per destination. This is what makes concurrent uploads safe.",
      },
    ],
  }),
  // --- Member history -------------------------------------------------------
  //
  //   study_sessions     one sitting: what was studied, for how long, how it went
  //   user_activity_log  the member's timeline, one notable event per row
  //
  // These answer "what has this member been doing", which the per-answer and
  // per-day tables cannot: `user_answers` is too fine to read and
  // `user_daily_activity` is too coarse to explain.
  study_sessions: defineTable({
    tableId: "study_sessions",
    domain: "members",
    access: "review",
    name: "Study Sessions",
    description:
      "One sitting with a quiz or paper. Written by the app when a session starts, updated as it finishes.",
    group: "progress",
    fields: [
      {
        key: "userId",
        label: "Member",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "sessionId",
        label: "Session ID",
        kind: "string",
        required: true,
        size: 64,
        description:
          "The app's own id for the sitting. `user_answers.sessionId` carries the same value, which is what ties the answers to this row.",
      },
      {
        key: "categoryId",
        label: "Exam category",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "questionnaireId",
        label: "Set",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "label",
        label: "What was studied",
        kind: "string",
        required: false,
        size: 255,
        description:
          "Copied at the time, so a renamed category does not rewrite an old session in the member's history.",
      },
      {
        key: "mode",
        label: "Mode",
        kind: "enum",
        required: false,
        options: ["quiz", "board_exam", "review"],
        defaultValue: "quiz",
      },
      {
        key: "status",
        label: "Status",
        kind: "enum",
        required: true,
        options: ["in_progress", "completed", "abandoned"],
        defaultValue: "in_progress",
      },
      {
        key: "startedAt",
        label: "Started at",
        kind: "datetime",
        required: true,
      },
      {
        key: "endedAt",
        label: "Ended at",
        kind: "datetime",
        required: false,
      },
      {
        key: "durationSeconds",
        label: "Time spent",
        kind: "integer",
        required: false,
        defaultValue: 0,
        min: 0,
        max: 86400,
      },
      {
        key: "questionCount",
        label: "Questions in the session",
        kind: "integer",
        required: false,
        defaultValue: 0,
        min: 0,
        max: 100000,
      },
      {
        key: "answeredCount",
        label: "Answered",
        kind: "integer",
        required: false,
        defaultValue: 0,
        min: 0,
        max: 100000,
      },
      {
        key: "correctCount",
        label: "Correct",
        kind: "integer",
        required: false,
        defaultValue: 0,
        min: 0,
        max: 100000,
      },
      {
        key: "scorePercent",
        label: "Score",
        kind: "float",
        required: false,
        defaultValue: 0,
        min: 0,
        max: 100,
      },
      {
        key: "lastQuestionOrder",
        label: "Resume at item",
        kind: "integer",
        required: false,
        defaultValue: 0,
        min: 0,
        max: 100000,
        description:
          "Where an unfinished session picks up, so Continue lands on the right question.",
      },
    ],
    indexes: [
      {
        key: "idx_session_user_started",
        type: "key",
        columns: ["userId", "startedAt"],
        orders: ["ASC", "DESC"],
        description: "Backs a member's session history, newest first.",
      },
      {
        key: "idx_session_key",
        type: "unique",
        columns: ["userId", "sessionId"],
        description:
          "One row per sitting. Without it a retried start request quietly creates a second session and splits the answers.",
      },
    ],
  }),
  user_activity_log: defineTable({
    tableId: "user_activity_log",
    domain: "members",
    access: "review",
    name: "Activity Log",
    description:
      "A member's timeline: joined, subscribed, finished a paper, earned a badge. Notable events only.",
    group: "progress",
    fields: [
      {
        key: "userId",
        label: "Member",
        kind: "string",
        required: true,
        size: 64,
      },
      {
        key: "type",
        label: "Event",
        kind: "enum",
        required: true,
        options: [
          "signed_up",
          "signed_in",
          "subscription_started",
          "subscription_renewed",
          "subscription_expired",
          "payment_submitted",
          "payment_confirmed",
          "code_redeemed",
          "session_completed",
          "material_completed",
          "achievement_earned",
          "post_created",
        ],
        defaultValue: "signed_in",
      },
      {
        key: "title",
        label: "What happened",
        kind: "string",
        required: true,
        size: 255,
        placeholder: "Completed Social Work Foundation - Set A",
        description:
          "Written for a person to read. The app shows this line directly.",
      },
      {
        key: "detail",
        label: "Detail",
        kind: "text",
        required: false,
        size: 2000,
        placeholder: "Scored 78% in 24 minutes",
      },
      {
        key: "referenceId",
        label: "Related record",
        kind: "string",
        required: false,
        size: 64,
        description:
          "The session, subscription, payment, or material this refers to, so the timeline entry can be tapped.",
      },
      {
        key: "amount",
        label: "Amount in centavos",
        kind: "integer",
        required: false,
        min: 0,
        max: 100000000,
        description: "Only on payment and subscription events.",
      },
      {
        key: "occurredAt",
        label: "When",
        kind: "datetime",
        required: true,
      },
    ],
    indexes: [
      {
        key: "idx_activity_user_time",
        type: "key",
        columns: ["userId", "occurredAt"],
        orders: ["ASC", "DESC"],
        description: "Backs the member timeline, newest first.",
      },
      {
        key: "idx_activity_type_time",
        type: "key",
        columns: ["type", "occurredAt"],
        orders: ["ASC", "DESC"],
        description: "Backs an admin filtering the log to one kind of event.",
      },
    ],
  }),
  learning_history: defineTable({
    tableId: "learning_history",
    domain: "members",
    access: "review",
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
    indexes: [
      {
        key: "idx_history_user_accessed",
        type: "key",
        columns: ["userId", "lastAccessedAt"],
        orders: ["ASC", "DESC"],
        description: "Backs the continue-where-you-left-off list.",
      },
    ],
  }),
  user_answers: defineTable({
    tableId: "user_answers",
    domain: "members",
    access: "review",
    name: "User Answers",
    description:
      "One row per answered item, keyed by question SKU so statistics survive a re-import.",
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
        key: "questionSku",
        // The SKU, not the Appwrite row ID. Row IDs are reissued on every
        // delete-and-reimport, which orphaned all historical answers; a SKU is
        // assigned once and reused by the importer, so item statistics
        // accumulate across content revisions instead of resetting.
        label: "Question SKU",
        kind: "string",
        required: true,
        size: 24,
      },
      {
        key: "categoryId",
        label: "Exam category",
        kind: "string",
        required: false,
        size: 64,
        description:
          "Recorded alongside the set so per-category scoring is one query. Without it, answering 'how did I do in Human Behavior' would mean looking up every answered question to find its category, and Appwrite cannot join.",
      },
      {
        key: "questionnaireId",
        label: "Set",
        kind: "string",
        required: false,
        size: 64,
        description:
          "The set the question belonged to, or blank when it sat directly under the category.",
      },
      {
        key: "sessionId",
        label: "Session ID",
        kind: "string",
        required: false,
        size: 64,
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
    indexes: [
      {
        key: "idx_answer_user_paper",
        type: "key",
        columns: ["userId", "questionnaireId"],
        description: "Backs scoring one student's attempt at one set.",
      },
      {
        key: "idx_answer_user_category",
        type: "key",
        columns: ["userId", "categoryId"],
        description:
          "Backs scoring one student against a whole category, which is the common case now that most categories have no sets.",
      },
      {
        key: "idx_answer_question",
        type: "key",
        columns: ["questionSku"],
        description:
          "Backs per-item statistics, which is the whole reason answers record a SKU rather than a row ID.",
      },
    ],
  }),
  user_progress: defineTable({
    tableId: "user_progress",
    domain: "members",
    access: "review",
    name: "User Progress",
    description:
      "Per-student progress summary and resume state for one questionnaire.",
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
        key: "categoryId",
        label: "Exam category",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "questionnaireId",
        label: "Set",
        kind: "string",
        required: false,
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
        key: "answeredQuestionIds",
        label: "Answered Question IDs",
        kind: "string[]",
        required: false,
        size: 64,
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
    indexes: [
      {
        key: "idx_progress_user_paper",
        type: "key",
        columns: ["userId", "questionnaireId"],
      },
    ],
  }),
  user_daily_activity: defineTable({
    tableId: "user_daily_activity",
    domain: "members",
    access: "review",
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
        key: "categoryId",
        label: "Exam category",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "questionnaireId",
        label: "Set",
        kind: "string",
        required: false,
        size: 64,
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
    indexes: [
      {
        key: "idx_daily_user_date",
        type: "key",
        columns: ["userId", "activityDate"],
        orders: ["ASC", "DESC"],
      },
    ],
  }),
  user_weekly_reports: defineTable({
    tableId: "user_weekly_reports",
    domain: "members",
    access: "review",
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
        key: "categoryId",
        label: "Exam category",
        kind: "string",
        required: false,
        size: 64,
      },
      {
        key: "questionnaireId",
        label: "Set",
        kind: "string",
        required: false,
        size: 64,
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
    indexes: [
      {
        key: "idx_weekly_user_week",
        type: "key",
        columns: ["userId", "weekStartDate"],
        orders: ["ASC", "DESC"],
      },
    ],
  }),
  learning_achievements: defineTable({
    tableId: "learning_achievements",
    domain: "members",
    access: "review",
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
    domain: "community",
    access: "review",
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
    domain: "community",
    access: "review",
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
    domain: "community",
    access: "review",
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
    domain: "community",
    access: "hidden",
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
    domain: "community",
    access: "hidden",
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
    domain: "announcements",
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
        key: "audience",
        label: "Send to",
        kind: "enum",
        required: true,
        options: [
          "all",
          "free",
          "premium",
          "expired",
          "student",
          "graduate",
          "retaker",
          "professional",
          "instructor",
          "institution",
        ],
        optionLabels: {
          all: "Everyone",
          free: "Members without premium",
          premium: "Premium members",
          expired: "Members whose premium ran out",
          student: "Students",
          graduate: "Graduates sitting the board",
          retaker: "Retakers",
          professional: "Licensed social workers",
          instructor: "Instructors",
          institution: "Schools and review centres",
        },
        defaultValue: "all",
        description:
          "The first four read membership; the rest read memberType. Aimed at the audience, not at the staff - nobody announces anything to a moderator.",
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
    domain: "community",
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
export type ExamCategoryDocument = ReviewerTableDocument<"exam_categories">
export type QuestionnaireRowDocument = ReviewerTableDocument<"questionnaires">
export type QuestionDocument = ReviewerTableDocument<"questions">
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
export type UserSettingsDocument = ReviewerTableDocument<"user_settings">
export type UserSettings = ReviewerTableData<"user_settings">

/**
 * What a student gets before they have ever opened Settings.
 *
 * Derived from the schema rather than retyped, so a default changed in one
 * place cannot disagree with the other. A missing settings row is normal - the
 * app must never block on creating one.
 */
export const DEFAULT_USER_SETTINGS = Object.fromEntries(
  (reviewerCmsSchema.user_settings.fields as readonly CmsFieldDefinition[])
    .filter((field) => field.defaultValue !== undefined)
    .map((field) => [field.key, field.defaultValue])
) as Record<string, string | number | boolean>

/** Merges a stored settings row over the defaults, filling any gap. */
export function resolveUserSettings(
  row?: Partial<UserSettings> | null
): Record<string, string | number | boolean> {
  const resolved = { ...DEFAULT_USER_SETTINGS }

  for (const [key, value] of Object.entries(row ?? {})) {
    if (value !== null && value !== undefined && key in resolved) {
      resolved[key] = value as string | number | boolean
    }
  }

  return resolved
}

export type SubscriptionPlanDocument =
  ReviewerTableDocument<"subscription_plans">
export type SubscriptionDocument = ReviewerTableDocument<"subscriptions">
export type PaymentDocument = ReviewerTableDocument<"payments">
export type AccessCodeDocument = ReviewerTableDocument<"access_codes">
export type StudySessionDocument = ReviewerTableDocument<"study_sessions">
export type UserActivityDocument = ReviewerTableDocument<"user_activity_log">

/** "pending" | "active" | "expired" | "cancelled" | "refunded" */
export type SubscriptionStatus = NonNullable<
  ReviewerTableData<"subscriptions">["status"]
>
/** "pending" | "paid" | "failed" | "refunded" */
export type PaymentStatus = NonNullable<ReviewerTableData<"payments">["status"]>
export type ActivityType = NonNullable<
  ReviewerTableData<"user_activity_log">["type"]
>

/**
 * Whole pesos to a readable amount: 299 -> "PHP 299".
 *
 * Amounts are stored as whole units, because Play Console sets the real
 * charged price and the app displays the localized string Play returns. The
 * number here exists for the admin's own reporting, where centavos never
 * mattered.
 */
export function formatMoney(amount: number, currency = "PHP") {
  return `${currency} ${(Number(amount) || 0).toLocaleString()}`
}

/**
 * Whether a cached membership is still good at a given moment.
 *
 * A lapsed subscription that nothing has swept yet still has `isPremium: true`
 * on the profile, so the date is checked as well as the flag - the app must not
 * wait for a background job to stop granting access.
 */
export function hasActivePremium(
  profile: { isPremium?: boolean | null; premiumUntil?: string | null },
  now: Date = new Date()
) {
  if (!profile.isPremium) {
    return false
  }

  if (!profile.premiumUntil) {
    return true
  }

  const until = new Date(profile.premiumUntil)

  return Number.isNaN(until.getTime()) ? false : until.getTime() > now.getTime()
}
export type FlaggedContentDocument = ReviewerTableDocument<"flagged_content">

export type LearningMaterialType =
  ReviewerTableData<"learning_materials">["type"]

/** "quiz" | "board_exam" — where a category surfaces in the app. */
export type QuestionnaireMode = NonNullable<
  ReviewerTableData<"exam_categories">["mode"]
>
/**
 * A set label: "A", "B", ... "Z", "AA", "AB", and so on without limit.
 *
 * A string rather than a union, because the set after Z has to be expressible
 * and no fixed list survives contact with a category that needs one more.
 */
export type QuestionnaireSetCode = string

/** Normalizes what someone typed into a set label: "set f" and "f" both give "F". */
export function normalizeSetCode(value: string): string {
  const cleaned = value
    .trim()
    .replace(/^set\s+/i, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")

  return cleaned
}

/**
 * The next unused set label for a category, given the ones already taken.
 *
 * Walks the same A..Z, AA, AB sequence as `toChoiceLabel`, so it fills gaps
 * left by a deleted set before moving on.
 */
export function nextFreeSetCode(taken: readonly string[]): string {
  const used = new Set(
    taken.map((code) => normalizeSetCode(code)).filter(Boolean)
  )

  for (let index = 0; index < 10000; index += 1) {
    const candidate = toChoiceLabel(index)

    if (!used.has(candidate)) {
      return candidate
    }
  }

  return toChoiceLabel(taken.length)
}
/** "multiple_choice" | "true_false" */
export type QuestionType = NonNullable<
  ReviewerTableData<"questions">["questionType"]
>
/** "easy" | "medium" | "hard" */
export type QuestionDifficulty = NonNullable<
  ReviewerTableData<"questions">["difficulty"]
>
/**
 * Display label for a choice at a given position: 0 -> A, 25 -> Z, 26 -> AA.
 *
 * Spreadsheet-column style, so it never runs out. Labels are presentation only
 * — storage is the position in `choices`, which is why inserting a choice
 * cannot silently repoint an answer at the wrong entry.
 */
export function toChoiceLabel(index: number): string {
  if (!Number.isFinite(index) || index < 0) {
    return ""
  }

  let remaining = Math.floor(index)
  let label = ""

  while (remaining >= 0) {
    label = String.fromCharCode(65 + (remaining % 26)) + label
    remaining = Math.floor(remaining / 26) - 1
  }

  return label
}

/** `"C"` -> 2, `"AA"` -> 26. Returns null for anything that is not a label. */
export function fromChoiceLabel(label: string): number | null {
  const normalized = label.trim().toUpperCase()

  if (!/^[A-Z]+$/.test(normalized)) {
    return null
  }

  let index = 0

  for (const character of normalized) {
    index = index * 26 + (character.charCodeAt(0) - 64)
  }

  return index - 1
}

/**
 * Every value a new row needs, filled in from the schema.
 *
 * Appwrite will not store a default on a required column - it answers
 * `column_default_unsupported` - so for a required field the `defaultValue`
 * here is the only place the default exists. That makes a create like
 * `{ userId, categoryId, score }` fail on a table such as `user_progress`,
 * which has fourteen required columns, with an error naming only the first one
 * missing.
 *
 * Spread this and then override what you actually know:
 *
 * ```ts
 * data: { ...newRowDefaults('user_progress'), userId, categoryId, score: 88 }
 * ```
 *
 * Fields with no declared default fall back to the empty value for their kind,
 * so the result always satisfies every required column. Read-only fields the
 * server maintains - rollup counts and the like - are left out.
 */
export function newRowDefaults(
  tableKey: ReviewerTableKey
): Record<string, string | number | boolean | string[]> {
  const values: Record<string, string | number | boolean | string[]> = {}

  // Widened deliberately: `as const` narrows each entry to a literal type
  // that does not carry the optional keys.
  const fields = reviewerCmsSchema[tableKey]
    .fields as readonly CmsFieldDefinition[]

  for (const field of fields) {
    if (field.readOnly) {
      continue
    }

    if (field.defaultValue !== undefined) {
      values[field.key] = field.defaultValue
      continue
    }

    // Only required fields need inventing; an optional one may stay absent.
    if (!field.required) {
      continue
    }

    switch (field.kind) {
      case "integer":
      case "float":
        values[field.key] = field.min ?? 0
        break
      case "boolean":
        values[field.key] = false
        break
      case "datetime":
        values[field.key] = new Date().toISOString()
        break
      case "string[]":
        values[field.key] = []
        break
      case "enum":
        values[field.key] = String(field.options?.[0] ?? "")
        break
      default:
        values[field.key] = ""
    }
  }

  return values
}

/**
 * The columns a create call has to include, because the database has no
 * default for them. Useful in a test that asserts a write is complete.
 */
export function requiredColumnsFor(tableKey: ReviewerTableKey) {
  return (reviewerCmsSchema[tableKey].fields as readonly CmsFieldDefinition[])
    .filter((field) => field.required)
    .map((field) => field.key)
}

export const dashboardGroups = [
  { key: "content", label: "Review Content" },
  { key: "assessment", label: "Questions" },
  { key: "billing", label: "Subscriptions" },
  { key: "auth", label: "Members and Access" },
  { key: "progress", label: "Member Activity" },
  { key: "achievements", label: "Achievements" },
  { key: "community", label: "Community" },
  { key: "cms", label: "Moderation" },
] as const

/** What the dashboard lets *anyone* do with a table. Defaults to full control. */
export function getTableAccess(tableKey: ReviewerTableKey): CmsTableAccess {
  return (
    (reviewerCmsSchema[tableKey] as { access?: CmsTableAccess }).access ??
    "manage"
  )
}

export function getTableDomain(
  tableKey: ReviewerTableKey
): CmsPermissionDomain {
  return (reviewerCmsSchema[tableKey] as { domain: CmsPermissionDomain }).domain
}

/**
 * The permission an action on a table needs, or `null` when the action is not
 * on offer to anyone.
 *
 * Two questions, answered in order. `access` asks whether the action makes
 * sense for this table at all - nobody edits a study session, because nobody
 * wrote it. Only then does the domain decide who is allowed. Keeping them
 * separate is what stops a new permission from quietly opening a create form
 * over data the team does not author.
 */
export function getTablePermission(
  tableKey: ReviewerTableKey,
  action: CmsTableAction
): CmsPermission | null {
  const access = getTableAccess(tableKey)

  if (access === "hidden") {
    return null
  }

  if (action !== "view") {
    if (access === "readonly") {
      return null
    }

    if (access === "review" && action !== "delete") {
      return null
    }
  }

  return domainTablePermissions[getTableDomain(tableKey)][action]
}

/**
 * Can someone holding `role` do `action` here?
 *
 * The single question every page, form, and action asks. It is deliberately
 * the only way to find out: a check written as `role === "admin"` is a check
 * that has to be found and edited every time the roles change.
 */
export function roleCanUseTable(
  role: CmsRole,
  tableKey: ReviewerTableKey,
  action: CmsTableAction
) {
  const permission = getTablePermission(tableKey, action)
  return permission !== null && roleHasPermission(role, permission)
}

/** Tables a role may open, in schema order. Drives the sidebar. */
export function listTablesForRole(role: CmsRole) {
  return reviewerTableEntries
    .map(([tableKey]) => tableKey)
    .filter((tableKey) => roleCanUseTable(role, tableKey, "view"))
}
