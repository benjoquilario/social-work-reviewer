# Schema Notes for the Mobile App

Companion to `lib/appwrite/schema.ts`. Copy that file into the mobile project as-is — it has **no imports**, so it drops in anywhere, and it is the single source of truth for table IDs, column names, enum values, and defaults.

### What you get from it

**Table and column names**

```ts
import { reviewerCmsSchema } from './schema'

const QUESTIONS = reviewerCmsSchema.questions.tableId   // never hardcode "questions"
```

**Row types**, derived from the definitions — so a column rename in the CMS
becomes a **type error** in the app rather than an empty field at runtime:

```ts
import type {
  QuestionDocument,        // $id + $createdAt + $updatedAt + the question columns
  ExamCategoryDocument,
  QuestionnaireRowDocument,
  LearningMaterialDocument,
  UserProfileDocument,
  UserAnswerDocument,
  ReviewerTableDocument,   // ReviewerTableDocument<'posts'> for anything else
  ReviewerCreateInput,     // the shape a createRow needs
  ReviewerUpdateInput,     // ... and an updateRow
} from './schema'
```

**Union types for every enum**, so a typo is caught at compile time rather than
rejected by the database at runtime:

```ts
import type {
  QuestionType, QuestionDifficulty, QuestionnaireMode,
  LearningMaterialType, SubscriptionStatus, PaymentStatus,
  ActivityType, MemberType,
} from './schema'
```

**Helpers you will actually reach for**

| Helper | What it does |
| --- | --- |
| `toChoiceLabel(i)` | `0` → `"A"`, `25` → `"Z"`, `26` → `"AA"` |
| `fromChoiceLabel(s)` | `"C"` → `2` |
| `hasActivePremium(profile, now?)` | the paywall check — flag **and** date |
| `resolveUserSettings(row)` | stored settings over the defaults |
| `DEFAULT_USER_SETTINGS` | the defaults on their own |
| `newRowDefaults(tableKey)` | every value a create needs — see gotcha 2 |
| `requiredColumnsFor(tableKey)` | which columns those are |
| `formatMoney(amount, currency?)` | `299` → `₱299` — whole pesos, no centavos |
| `getMemberTypeLabel(value)` | `"professional"` → `"Licensed social worker"`, blank → `"Not said"` |
| `isMemberType(value)` | validate before trusting a stored value |
| `normalizeSetCode(s)` | `" set f "` → `"F"` |

Everything else the file exports — `cmsPermissionCatalog`, `cmsRoleDefinitions`,
`roleCanUseTable`, `getTablePermission` and friends — is the dashboard's access
control. The app does not use any of it; see section 13.

---

## Contents

1. [The two content models](#1-the-two-content-models) — how reading and exams are organised, and why they never join
2. [Routing a category — read this before building the nav](#2-routing-a-category-read-this-before-building-the-nav) — does a category have sets? answer it without a query
3. [The reading side — subjects, topics, materials](#3-the-reading-side-subjects-topics-materials) — subjects, topics, materials, and resume state
4. [Query cookbook](#4-query-cookbook) — the queries you need, with the limits you must not forget
5. [Gotchas that will cost you a day](#5-gotchas-that-will-cost-you-a-day) — **read this one** — eight ways to lose a day
6. [Membership and Google Play billing](#6-membership-and-google-play-billing) — Google Play, access codes, and the one rule
7. [Member history and activity](#7-member-history-and-activity) — sessions and the activity timeline
8. [Member settings](#8-member-settings) — how a member wants to be quizzed
9. [What is behind the paywall](#9-what-is-behind-the-paywall) — what is free and what is paid
10. [What the app writes](#10-what-the-app-writes) — the tables the app owns, and how many columns each create needs
11. [Enum values — use the stored value, not the label](#11-enum-values-use-the-stored-value-not-the-label) — every enum value, checked against the schema
12. [Not part of the model any more](#12-not-part-of-the-model-any-more) — things that were removed, in case you find old code
13. [Roles are the dashboard's; who a member is, is yours](#13-roles-are-the-dashboards-who-a-member-is-is-yours) — roles are the dashboard's; `memberType` is yours

New to the project? Read 5 first — every item in it is a silent failure, not an error message.

---
## 1. The two content models

The app has two halves that never touch each other. Reading material is
organised one way, exam questions another, and the mistake to avoid is assuming
a question belongs to a topic. It does not.

**Reading — what a member browses and studies:**

```
subjects                 Human Behavior and Social Environment
  └── topics             Theories of Personality
        └── learning_materials    a note, a PDF, or a video
```

**Exams — what a member answers:**

```
exam_categories          the subject area, and the unit questions belong to
  └── questionnaires     OPTIONAL lettered sets (Set A, Set B, ...)
        └── questions    the items
  └── questions          items with no set — the common case
```

`subjects` and `exam_categories` often carry the same names, and they are still
separate rows in separate tables with separate IDs. There is no join between
them and nothing in the schema pairs them up. If the app wants "read this, then
practise that", it has to match on the title or the team has to agree on an
ordering — do not invent a foreign key that is not there.

**The category is the parent, not the set.** Two real shapes:

| Category | Sets | Where its questions live |
| --- | --- | --- |
| Human Behavior and Social Environment | none | directly under the category |
| History, Social Conditions, Issues and CO Drill | A, B, C | inside each set |

A category can hold both at once (loose questions *and* sets); it's unusual but the data allows it, so don't assume otherwise.

> The table is still called `questionnaires` in Appwrite — renaming it would have meant a data migration. Everywhere in the UI and in these notes it is a **set**.

---

## 2. Routing a category — read this before building the nav

Never query the sets table just to find out whether a category has any. The answer is on the category row, maintained by the CMS:

| Field | Meaning |
| --- | --- |
| `setCount` | **Published** sets. `0` → open the questions directly |
| `directQuestionCount` | Questions sitting directly under the category |
| `questionCount` | Everything in the category, sets included |

```ts
if (category.setCount === 0) {
  openQuestions({ categoryId: category.$id })  // directQuestionCount items
} else {
  showSetPicker(category)                      // then open the chosen set
}
```

All three are **read-only for the app**. The CMS recomputes them on every upload, set change, and delete. `setCount` counts only published sets, so a draft never sends a member to an empty picker.

---

## 3. The reading side — subjects, topics, materials

Three tables, each a straight parent/child. All of them are CMS-owned and
read-only to the app.

| Table | Key fields |
| --- | --- |
| `subjects` | `name`, `description`, `iconUrl`, `order`, `isPublished`, `topicCount`, `materialCount` |
| `topics` | `subjectId`, `title`, `description`, `order`, `isPublished`, `materialCount` |
| `learning_materials` | `topicId`, `subjectId`, `title`, `type`, `fileUrl`, `content`, `order`, `isPremium`, `isPublished` |

**Filter on `isPublished` at every level.** A draft topic is a topic the team is
still writing, and it will otherwise appear in the app mid-edit.

`topicCount` and `materialCount` are rollups the CMS maintains, exactly like
`setCount` on a category — use them to render "12 topics" without a second
query, and never write them.

### Rendering a material

`type` decides which of two fields holds the content, and only one of them is
ever filled:

| `type` | Where the content is | How to render |
| --- | --- | --- |
| `note` | `content` — **HTML**, from the CMS rich-text editor | an HTML view, or convert once at load |
| `pdf` | `fileUrl` | a PDF viewer |
| `video` | `fileUrl` | a player, or a link out |

`content` is HTML, not Markdown — it comes out of a Tiptap editor. Rendering it
as plain text shows a member raw tags.

`fileUrl` has the same relative/absolute problem as `imageUrl` (gotcha 7): a
file uploaded through the CMS is stored as `/api/assets/<fileId>` and needs the
CMS base URL in front of it; a pasted link is already absolute.

`learning_materials.subjectId` is filled in by the CMS from the material's
topic, so you can list everything in a subject without walking its topics
first — that is what `idx_material_subject_order` is for.

### Resume state — `learning_history`

One row per member per material. The app owns it entirely.

```ts
import { newRowDefaults } from './schema'

// Opening a material for the first time
{
  ...newRowDefaults('learning_history'),
  userId,
  learningMaterialId: material.$id,
  subjectId: material.subjectId,
  topicId: material.topicId,
  status: 'in_progress',
  startedAt: now, lastAccessedAt: now, createdAt: now,
}

// Leaving it
{ status: 'paused', progressPercent: 42, lastPosition: 1180, lastAccessedAt: now }

// Reaching the end
{ status: 'completed', progressPercent: 100, completedAt: now }
```

`lastPosition` is an integer and deliberately untyped as to units — a scroll
offset for a note, a page for a PDF, seconds for a video. Pick one per `type`
and stay consistent, because nothing on the server interprets it.

Continue-reading list:

```ts
Query.equal('userId', userId),
Query.equal('status', 'in_progress'),
Query.orderDesc('lastAccessedAt'),
Query.limit(20)
```

That is `idx_history_user_accessed`, so it stays fast as the history grows.

Note there is **no unique index** on `(userId, learningMaterialId)` — unlike
`user_settings` and `study_sessions`, nothing stops a second row for the same
material. Look the row up before creating one, or a member ends up with two
progress records that disagree.

---

## 4. Query cookbook

Every one of these carries a `Query.limit`. Without it you get 25 rows and no
warning — see gotcha 1.

```ts
// Categories to show
Query.equal('isPublished', true), Query.orderAsc('order'), Query.limit(100)

// Sets in a category
Query.equal('categoryId', categoryId),
Query.equal('isPublished', true),
Query.orderAsc('order'),
Query.limit(100)

// Questions in a set  — page this one; a paper can be longer than a page
Query.equal('questionnaireId', setId), Query.orderAsc('order'), Query.limit(100)

// Questions directly under a category (no set)
Query.equal('categoryId', categoryId),
Query.equal('questionnaireId', ''),          // NOT Query.isNull — see gotcha 3
Query.orderAsc('order'),
Query.limit(100)

// Everything in a category, sets included
Query.equal('categoryId', categoryId), Query.orderAsc('order'), Query.limit(100)

// This member's answers for a category
Query.equal('userId', userId),
Query.equal('categoryId', categoryId),
Query.limit(100)

// Reading material under a topic
Query.equal('topicId', topicId),
Query.equal('isPublished', true),
Query.orderAsc('order'),
Query.limit(100)
```

Each of these is backed by an index (`idx_question_category_order`, `idx_question_paper_order`, `idx_answer_user_category`, …). Adding a filter or sort on an unindexed column will get slow at exam-bank size — ask for the index rather than working around it.

`order` is the item number, unique within a destination (category + set) but **not** guaranteed to start at 1 or be contiguous — deleting an item leaves a gap, and an upload never renumbers an existing question. Always sort by it; never index into an array by it.

---

## 5. Gotchas that will cost you a day

**1 — Every list is silently cut to 25 rows.** Appwrite's default page size is
25. A set of 100 questions, fetched with no `Query.limit`, returns 25 of them
and no error — and `total` still reports 100, so a progress bar reading
"1 of 100" sits above a list that ends at 25.

```ts
// Measured against this project: 30 rows in the table.
listRows({ tableId, queries: [] })              // -> 25 rows, total: 30
listRows({ tableId, queries: [Query.limit(30)] }) // -> 30 rows
```

Pass a limit on every query. A paper can exceed any single page, so read it in
full with a cursor rather than guessing a big number:

```ts
async function listAll(tableId: string, queries: string[]) {
  const rows: Models.Row[] = []
  let cursor: string | undefined

  for (;;) {
    const page = await tablesDB.listRows({
      tableId,
      queries: [...queries, Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    })
    rows.push(...page.rows)
    if (page.rows.length < 100) return rows
    cursor = page.rows[page.rows.length - 1].$id
  }
}
```

Cursor, not `Query.offset`: offset re-scans everything it skips and gets slower
the deeper it goes.

**2 — Required columns have no stored default, so a create must supply them
all.** Appwrite refuses to hold a default on a required column. The
`defaultValue` in `schema.ts` is therefore the *only* place several defaults
exist, and a create that leaves them out is rejected — with an error naming one
missing column at a time, which turns a five-field mistake into five round
trips.

The tables the app writes, and how many values each create needs:

| Table | Required columns |
| --- | --- |
| `user_progress` | 14 |
| `user_weekly_reports` | 14 |
| `user_daily_activity` | 12 |
| `learning_achievements` | 9 |
| `learning_history` | 8 |
| `posts` | 6 |
| `comments` | 5 |
| `user_answers` | 4 |
| `study_sessions` | 4 |
| `user_activity_log` | 4 |
| `user_settings` | 1 |

Do not hand-write those lists. `newRowDefaults` builds them from the schema, so
a column added later is already covered:

```ts
import { newRowDefaults } from './schema'

await tablesDB.createRow({
  tableId: reviewerCmsSchema.user_progress.tableId,
  rowId: ID.unique(),
  data: {
    ...newRowDefaults('user_progress'),   // all 14, at their schema defaults
    userId,
    categoryId,
    score: 88,
    answeredCount: 40,
    correctCount: 35,
  },
})
```

Updates need only the fields that changed — this is a create-time problem.

**3 — `Query.isNull` does not work on optional string columns.** Appwrite stores an unset string as `""`, not SQL `NULL`. `Query.isNull('questionnaireId')` returns nothing; `Query.equal('questionnaireId', '')` is the correct test. Same for any optional string field.

**4 — Record `sku`, never `$id`, in answer history.** Row IDs are reissued whenever content is re-imported. The SKU (`Q-000142`) is assigned once and reused forever, which is why `user_answers.questionSku` exists. Storing `$id` would orphan every historical answer the next time the CMS re-imports a sheet.

**5 — `answerIndex` is a position, not a letter.** `choices` is an ordered array; index `0` is displayed as **A**, `1` as **B**. Use `toChoiceLabel(i)` for display and never derive the answer from a letter stored elsewhere — position is the only source of truth.

```ts
const isCorrect = pickedIndex === question.answerIndex
const letter = toChoiceLabel(pickedIndex)   // for selectedAnswerKey
```

**6 — Choice counts vary.** The real bank has items with 3, 4, 5, and 6 choices. Render `choices.length`, don't hardcode four. True/false items are just two choices (usually `["True","False"]`, but a Tagalog paper may use `["Tama","Mali"]` — render what's there).

**7 — `imageUrl` may be relative.** Images uploaded through the CMS store `/api/assets/<fileId>`; a pasted link stores an absolute URL. Prepend the CMS base URL when it starts with `/`:

```ts
const src = question.imageUrl?.startsWith('/')
  ? `${CMS_BASE_URL}${question.imageUrl}`
  : question.imageUrl
```

**8 — `questionCount` is denormalised.** It's accurate as of the last CMS write. Don't use it for pagination bounds; use the real result count.

---

## 6. Membership and Google Play billing

### The one rule

**`subscriptions` decides access. `user_profiles` only caches the answer.**

Never write `isPremium` from the app. Four fields on `user_profiles` are maintained by the server and are **read-only to the app**:

| Field | Meaning |
| --- | --- |
| `isPremium` | Cached "can open premium content" |
| `premiumUntil` | When it lapses. Blank = lifetime |
| `planName` | The plan currently granting access |
| `subscriptionStatus` | `none` / `pending` / `active` / `expired` / `cancelled` |

### Gating a screen

```ts
import { hasActivePremium } from './schema'

if (hasActivePremium(profile)) openCategory(category)
else showPaywall()
```

It checks the **date as well as the flag**, so a subscription that lapsed an hour ago stops granting access immediately rather than waiting for the nightly sweep.

### Prices are whole pesos — and Play's price wins

`subscription_plans.price` is `299` for ₱299. There are no centavos.

**Show the price Play returns, not this one.** `ProductDetails.getFormattedPrice()` is localized, reflects any regional pricing, and is the amount actually charged. The stored number exists for the admin's reporting.

Each plan carries `googleProductId` (and optionally `googleBasePlanId`) — the Play Console product ID. That is what you pass to Play Billing, and it is uniquely indexed so one product can never map to two plans.

### The purchase flow

```
1. Read plans:  Query.equal('isActive', true), Query.orderAsc('order')
2. queryProductDetails(plan.googleProductId)  ->  show Play's price
3. launchBillingFlow()
4. On PurchasesUpdatedListener, send to YOUR SERVER:
      { purchaseToken, productId, orderId }
5. Server verifies the token against the Play Developer API,
   then calls applyGooglePurchase(...)
6. Server ACKNOWLEDGES the purchase with Google
7. App re-reads user_profiles -> isPremium is now true
```

**Step 5 is not optional.** A purchase token sent from a client is a claim, not a fact — anyone can post one. It must be verified server-side against `purchases.subscriptionsv2.get` before it grants anything.

**Step 6 is a deadline.** Google **automatically refunds any purchase not acknowledged within three days**. The `subscriptions.isAcknowledged` flag records that the server did it; if you ever see active subscriptions with it false, that is money about to be returned.

### Renewals, cancellations, refunds

Set up **Real-Time Developer Notifications** (Play Console → Monetization → Pub/Sub topic). The server handles them with `applyGoogleNotification`:

| Type | What it means | What happens |
| --- | --- | --- |
| `2` RENEWED | Charged again | `endsAt` extended, a renewal purchase recorded |
| `3` CANCELED | Turned off auto-renew | **Access continues** until `endsAt` |
| `13` EXPIRED | Period ended | `status: expired` |
| `12` REVOKED | Refunded / charged back | `status: refunded`, access ends now |

**Cancelling is not losing access.** The member paid for a period and keeps it to the end; only `EXPIRED` or `REVOKED` cuts it off. An app that hides content the moment someone cancels is taking back something already paid for.

`autoRenewing` on the subscription tells you which state they are in — show "Renews on 12 Mar" or "Access ends 12 Mar" from that, not from `status` alone.

### Purchases

`payments` records one row per charge Google reports — first purchase and every renewal, with `kind: initial | renewal | refund`. `orderId` is uniquely indexed, because Play re-delivers notifications until they are acknowledged and without it every retry would count the revenue twice.

Nothing in it is entered by hand. There is no proof-of-payment upload, no admin verification step, and no GCash or card fields — Play collects the money and is the record of it.

```ts
// A member's purchase history
Query.equal('userId', userId), Query.orderDesc('createdAt')
```

### Access codes

Independent of Play. A review centre or employer hands out a code, the member redeems it, and the server starts a subscription with `source: 'access_code'` and no charge. Failure reasons are distinct on purpose — *not recognised*, *no longer active*, *expired*, *already used* — show the one you get.

## 7. Member history and activity

Two tables answer "what has this member been doing". `user_answers` is too fine-grained to read and `user_daily_activity` is too coarse to explain.

### `study_sessions` — one sitting

Write one row when a sitting starts, update it as it goes. `sessionId` is **your** id, and the same value goes on every `user_answers` row from that sitting — that is what ties them together.

```ts
// Starting
{ userId, sessionId, categoryId, questionnaireId: setId ?? '',
  label: 'Social Work Foundation - Set A',   // copied now, so a rename later
  mode: 'board_exam', status: 'in_progress',  // does not rewrite old history
  startedAt: new Date().toISOString() }

// Finishing
{ status: 'completed', endedAt, durationSeconds,
  answeredCount, correctCount, scorePercent, lastQuestionOrder }
```

`(userId, sessionId)` is unique, so a retried start request cannot split one sitting into two rows.

Leaving `status: 'in_progress'` with `lastQuestionOrder` set is what powers **Continue where you left off**:

```ts
Query.equal('userId', userId),
Query.equal('status', 'in_progress'),
Query.orderDesc('startedAt'),
Query.limit(1)
```

### `user_activity_log` — the timeline

One row per **notable** event — not per answer. Writing one per question would put hundreds of thousands of rows in a table meant to be read.

```ts
{ userId, type: 'session_completed',
  title: 'Completed Social Work Foundation - Set A',  // shown as-is
  detail: 'Scored 78% in 24 minutes',
  referenceId: sessionId,      // so the row can be tapped through
  occurredAt: new Date().toISOString() }
```

Types: `signed_up`, `signed_in`, `subscription_started`, `subscription_renewed`, `subscription_expired`, `payment_submitted`, `payment_confirmed`, `code_redeemed`, `session_completed`, `material_completed`, `achievement_earned`, `post_created`.

Subscription and payment events are written **by the server**, not the app — they happen when Google reports a purchase or a renewal, or when a sweep expires a period. `payment_submitted` and `payment_confirmed` are two ends of that server-side flow, not something the app writes when someone taps Buy. The app writes the study and content events.

Render a profile timeline with:

```ts
Query.equal('userId', userId), Query.orderDesc('occurredAt'), Query.limit(50)
```

`title` is written to be shown directly; don't rebuild the sentence from `type`.

---

## 8. Member settings

`user_settings` holds one row per member. **A member with no row is normal** — read the defaults and carry on; create the row the first time they change something.

```ts
import { DEFAULT_USER_SETTINGS, resolveUserSettings } from './schema'

const rows = await tablesDB.listRows({
  tableId: 'user_settings',
  queries: [Query.equal('userId', userId), Query.limit(1)],
})

const settings = resolveUserSettings(rows.rows[0])   // defaults filled in
```

`resolveUserSettings` merges the stored row over the defaults, so a field added later is already handled by older installs. Never hardcode a default in the app - it will drift from the schema.

### The setting that matters most

`feedbackTiming` decides what kind of session this is:

| Value | What happens |
| --- | --- |
| `instant` *(default)* | The moment a choice is tapped, mark it right or wrong and show the explanation. Practice. |
| `on_next` | Keep the choice selectable until they confirm, then reveal. |
| `at_end` | Reveal nothing during the run. All answers and explanations appear on the results screen. Mock exam. |

`showExplanations` gates the rationale independently, and `autoAdvance` / `autoAdvanceSeconds` move on by themselves - both are meaningless under `at_end`, so hide them in the UI when it is selected.

### Two traps in the shuffle settings

**`shuffleChoices` reorders for display only.** The correct answer is stored as a *position* in `choices`. Shuffle the display, keep the mapping, and translate back before writing the answer:

```ts
const view = shuffle(question.choices.map((text, index) => ({ text, index })))
const picked = view[tappedPosition]

const isCorrect = picked.index === question.answerIndex     // original index
const letter = toChoiceLabel(picked.index)                  // for selectedAnswerKey
```

Writing `tappedPosition` instead of `picked.index` records the wrong answer and corrupts the item statistics — which are keyed by SKU and shared across every member.

**`shuffleQuestions` never changes `order`.** It changes the sequence shown. The answer row still records the question's real SKU and the session's `lastQuestionOrder` still refers to the stored number, or resuming lands somewhere else.

### Serving the right questions

`questionSource` decides the pool, and `incorrect` is the one members actually use — it turns the bank into a mistake drill:

```ts
// 'incorrect': questions this member got wrong before
const wrong = await tablesDB.listRows({
  tableId: 'user_answers',
  queries: [
    Query.equal('userId', userId),
    Query.equal('categoryId', categoryId),
    Query.equal('isCorrect', false),
  ],
})
const skus = new Set(wrong.rows.map((row) => row.questionSku))
```

Then filter the paper by SKU. `difficultyFilter` and `questionsPerSession` (`0` = the whole paper) narrow it further.

### Reminders

`reminderTime` is stored as `"19:00"` **text**, with `timezone` beside it, because it is a wall-clock time rather than an instant — 7pm should stay 7pm when the member travels. Schedule the local notification from those two; do not convert to UTC and store an instant.

### Writing settings

```ts
await tablesDB.upsertRow({           // or create then update
  tableId: 'user_settings',
  data: { userId, feedbackTiming: 'at_end', updatedAt: new Date().toISOString() },
})
```

`userId` is uniquely indexed, so a duplicate row is rejected rather than silently created - which is what would otherwise make a setting appear not to save.

---

## 9. What is behind the paywall

| Flag | On | Meaning |
| --- | --- | --- |
| `exam_categories.isPremium` | the category | whole category is paid |
| `learning_materials.isPremium` | one material | that material is paid |
| `questions.isFree` | one question | opt-in free sample **inside** a premium category |

Combine with the membership check from section 6:

```ts
const canOpen =
  !category.isPremium || question.isFree || hasActivePremium(profile)
```

Gate on the server or in an Appwrite Function for anything that matters. Client-side checks are UX, not security, and these tables have no public read permissions by design.

---

## 10. What the app writes

Only these. Everything under `subjects`, `topics`, `learning_materials`,
`exam_categories`, `questionnaires`, and `questions` is CMS-owned — treat it as
read-only.

Every create on this list goes through `newRowDefaults` (gotcha 2). The counts
below are how many columns each table demands, and the number is why.

### `user_answers` — one row per answered item

```ts
{
  userId,
  questionSku: question.sku,          // required — the SKU, not $id
  categoryId: question.categoryId,    // makes per-category scoring one query
  questionnaireId: question.questionnaireId ?? '',  // '' when there is no set
  sessionId,                          // your own attempt id, groups one sitting
  selectedAnswerKey: toChoiceLabel(pickedIndex),    // "A" — required
  selectedAnswerText: question.choices[pickedIndex],
  correctAnswerKey: toChoiceLabel(question.answerIndex),
  correctAnswerText: question.choices[question.answerIndex],
  isCorrect: pickedIndex === question.answerIndex,
  answeredAt: new Date().toISOString(),
  responseTimeSeconds,
}
```

### `user_progress` — resume state and running totals — **14 required**

Keyed by `userId` plus `categoryId` (and `questionnaireId` when the member is
inside a set).

| Group | Columns |
| --- | --- |
| Where they are | `lastQuestionId`, `lastQuestionIndex`, `answeredQuestionIds`, `lastStudied`, `lastActiveAt` |
| This paper | `score`, `answeredCount`, `correctCount`, `incorrectCount`, `accuracyRate` |
| Overall | `averageScore`, `weeklyAverageScore`, `dayStreak`, `activeDaysCount`, `totalStudyMinutes` |
| Reading | `completedMaterials`, `achievementsCount` |

Fourteen of those are required with no stored default, which is the single most
common reason a first write to this table fails:

```ts
data: { ...newRowDefaults('user_progress'), userId, categoryId, score: 88 }
```

`answeredQuestionIds` is a string array and, despite the name, should hold
**SKUs** — for the same reason as `user_answers.questionSku` (gotcha 4). Row IDs
do not survive a re-import.

### `learning_history` — resume state for reading material — **8 required**

Per `learningMaterialId`: `status`, `progressPercent`, `lastPosition`,
`startedAt`, `lastAccessedAt`, `completedAt`. Covered in full in section 3,
including the missing unique index you have to work around.

### `user_daily_activity` / `user_weekly_reports` — aggregates — **12 and 14 required**

`activityDate`, `weekStartDate`, and `weekEndDate` are **strings**, not
datetimes — keep the format consistent (`YYYY-MM-DD`) or the range queries
won't sort. Zero-pad; `2026-3-9` sorts before `2026-03-09`.

### `learning_achievements` — badges — **9 required**

One row per badge earned. `achievementType` says what kind
(`streak`, `weekly_average`, `completion`, `quiz_completion`, `consistency`),
`periodType` says over what window (`instant`, `daily`, `weekly`, `lifetime`),
and `metricValue` carries the number the badge is about — days for a streak,
percent for an average.

`title` is shown as written, like `user_activity_log.title`. Decide the wording
in the app and store it; do not rebuild a sentence from the type at render
time, or old badges change wording when you ship new copy.

### `study_sessions` and `user_activity_log`

See section 7. Sessions are written at start and updated at finish; the activity log takes one row per notable event.

### `user_settings`

The app owns this one entirely. See section 8.

### `payments`

**Never.** Purchases are written by the server from verified Play data. The app's only job is to hand the purchase token to your backend.

### Community — `posts` **6 required**, `comments` **5**

`posts`, `comments`, `replies`, `post_likes`, `comment_likes`. `likesCount` is a
denormalised counter the app maintains — increment it in the same step as the
like row, or the number drifts from the join table and nothing reconciles it.

`posts.category` is `question`, `discussion`, or `tip`.

`flagged_content` is written by the report button and read only by the team, in
the dashboard. The app never reads it back; a member should not be able to see
what has been reported.

### Never written by the app

`subscription_plans`, `subscriptions`, `access_codes`, and the four cached membership fields on `user_profiles`. Access is granted by the server, or a member could grant it to themselves.

`user_roles` and `staff_activity` too — see section 13. Those are the dashboard's, and the app neither reads nor writes them.

---

## 11. Enum values — use the stored value, not the label

The database enforces every one of these. A write with a value that is not on
the list is rejected, not coerced, so read them from the schema rather than
retyping them:

```ts
const MODES = reviewerCmsSchema.exam_categories.fields
  .find((f) => f.key === 'mode')?.options        // ['quiz', 'board_exam']
```

### Content

| Column | Values |
| --- | --- |
| `exam_categories.mode` | `quiz`, `board_exam` |
| `questions.questionType` | `multiple_choice`, `true_false` |
| `questions.difficulty` | `easy`, `medium`, `hard` |
| `learning_materials.type` | `note`, `pdf`, `video` |

### Membership

| Column | Values |
| --- | --- |
| `subscriptions.status` | `pending`, `active`, `expired`, `cancelled`, `refunded` |
| `subscriptions.source` | `google_play`, `access_code`, `promo`, `manual` |
| `payments.status` | `paid`, `refunded`, `pending`, `failed` |
| `payments.kind` | `initial`, `renewal`, `refund` |
| `user_profiles.subscriptionStatus` | `none`, `pending`, `active`, `expired`, `cancelled` |

### The member, and what the app writes about them

| Column | Values |
| --- | --- |
| `user_profiles.memberType` | `student`, `graduate`, `retaker`, `professional`, `instructor`, `institution`, `other` |
| `study_sessions.mode` | `quiz`, `board_exam`, `review` |
| `study_sessions.status` | `in_progress`, `completed`, `abandoned` |
| `learning_history.status` | `in_progress`, `paused`, `completed` |
| `user_activity_log.type` | `signed_up`, `signed_in`, `subscription_started`, `subscription_renewed`, `subscription_expired`, `payment_submitted`, `payment_confirmed`, `code_redeemed`, `session_completed`, `material_completed`, `achievement_earned`, `post_created` |
| `learning_achievements.achievementType` | `streak`, `weekly_average`, `completion`, `quiz_completion`, `consistency` |
| `learning_achievements.periodType` | `instant`, `daily`, `weekly`, `lifetime` |

`study_sessions.mode` defaults to `quiz`, and carries a third value the
category's own `mode` does not: `review`. Use it for a re-run over answered
items — a mistake drill is not a fresh attempt, and recording it as one makes
the history meaningless.

### Settings

| Column | Values |
| --- | --- |
| `user_settings.feedbackTiming` | `instant`, `on_next`, `at_end` |
| `user_settings.questionSource` | `all`, `unanswered`, `incorrect`, `bookmarked` |
| `user_settings.difficultyFilter` | `all`, `easy`, `medium`, `hard` |
| `user_settings.timerMode` | `off`, `per_question`, `whole_session` |
| `user_settings.theme` | `system`, `light`, `dark` |
| `user_settings.fontScale` | `small`, `medium`, `large`, `xlarge` |
| `user_settings.language` | `en`, `fil` |

### Community

| Column | Values |
| --- | --- |
| `posts.category` | `question`, `discussion`, `tip` |
| `flagged_content.contentType` | `post`, `comment`, `reply` |
| `flagged_content.status` | `pending`, `reviewing`, `resolved`, `dismissed` |

### Dashboard only — the app never reads these

| Column | Values |
| --- | --- |
| `user_roles.role` | `student`, `member`, `encoder`, `moderator`, `admin`, `super_admin` — see section 13 |
| `staff_activity.actorRole` | `student`, `member`, `encoder`, `moderator`, `admin`, `super_admin` |
| `staff_activity.action` | `role_granted`, `role_changed`, `role_revoked`, `record_created`, `record_updated`, `record_deleted`, `questions_imported`, `announcement_sent`, `access_denied` |
| `announcements.audience` | `all`, `free`, `premium`, `expired`, `student`, `graduate`, `retaker`, `professional`, `instructor`, `institution` |

### One thing on this list is *not* an enum

**`questionnaires.setCode` is a plain string, and it is not limited to A–E.**

An earlier version of these notes said `A, B, C, D, E`. That was wrong, and an
app that validates against five letters will break on the sixth set. Codes run
`A`…`Z` and then `AA`, `AB`, … with no ceiling, exactly like spreadsheet
columns. The CMS assigns the next free one; the app only ever displays it.

```ts
import { normalizeSetCode, toChoiceLabel } from './schema'

normalizeSetCode(' set f ')   // 'F'
toChoiceLabel(26)             // 'AA'  — same alphabet, same rules
```

`setCode` is also read-only to the app, like every rollup count.

## 12. Not part of the model any more

`exams`, `exam_questions`, `exam_attempts`, `choices`, and `question_tags` were removed. Choices are now an array on the question row, and there is no separate exam entity — a category *is* the exam. If you find references to these in older mobile code, they map to `exam_categories` / `questionnaires` / `questions.choices`.

`questions` are **not** linked to `subjects` or `topics`. Those organize reading material only.

---

## 13. Roles are the dashboard's; who a member is, is yours

Two different things wear the word "role", and keeping them apart is the whole of this section.

**`user_roles.role` is a dashboard job.** Six values, one row per person, with a permission model in `schema.ts` (`cmsPermissionCatalog`, `cmsRoleDefinitions`, `roleCanUseTable`). None of it applies to the app.

`student` and `member` are both **rank 0 and hold no permissions**. They are the audience: `student` is the default, `member` is everybody else who uses the app. `encoder`, `moderator`, `admin`, and `super_admin` are the team. `isStaffRole(role)` is the only line that matters, and for anybody using the app it is `false`.

**The app must not branch on `student` vs `member` either.** They are the same rank and grant the same nothing; treating one as more entitled than the other would invent a rule the dashboard does not have.

**`user_profiles.memberType` is who somebody is.** That one is yours, and it is the interesting one.

### The rule

> Every signed-in account is an ordinary member in the app. Including the team's own.

An admin who opens the mobile app gets exactly the screens anyone else gets, with exactly the same paywall. Their role is about the dashboard and stops at its edge.

### What this means in code

**Do not read `user_roles`.** Not to unlock a screen, not to hide a paywall, not to show a debug menu. There is no feature in the app that a role should change. A `student` row and no row at all mean the same thing, most people have no row, and the app works today without ever querying it — keep it that way.

**Do not read `staff_activity`.** It is a log of what the team did in the dashboard: who granted access to whom, what was published, what was deleted. It contains staff email addresses. Nothing in the app should fetch it.

**Premium is the only thing that gates a screen.** It comes from `user_profiles.isPremium` / `premiumUntil` and Google Play — never from a role, and never from `memberType` either. See sections 6 and 9. If you ever find yourself writing `if (role === 'admin')` to show something, the answer you want is `hasActivePremium(profile)`.

### `memberType` — who the member is

The audience is not only undergraduates. Graduates sitting the board, retakers, licensed social workers doing CPD, instructors, and review centres all subscribe, so the profile carries three optional facts:

| Field | Values |
| --- | --- |
| `memberType` | `student`, `graduate`, `retaker`, `professional`, `instructor`, `institution`, `other` |
| `schoolOrEmployer` | free text — the BSSW school, or the agency |
| `licenseNumber` | PRC licence, only if they give it |

**Ask once, at sign-up, and let them skip it.** Blank is a normal answer and the app has to work without it — `getMemberTypeLabel(profile.memberType)` returns "Not said" rather than guessing. Put it in the profile screen so it can be changed later; people graduate, and a student in March is a graduate in June.

**It grants nothing and gates nothing.** This is the same rule as the one above, and it is worth stating twice because `memberType: 'professional'` *looks* like something that should unlock a screen. It does not. A licensed social worker with no subscription sees the same paywall as anyone else.

What it is genuinely for:

- **Announcements.** `announcements.audience` takes `all`, `free`, `premium`, `expired` — which read membership — plus each `memberType` value. "Board exam results are out" is for retakers and graduates, not for a first-year student.
- **Onboarding copy.** A retaker does not need the tour a first-timer needs.
- **Knowing who pays**, which is the dashboard's problem, not the app's.

Read it with `isMemberType(value)` before trusting it, the same way roles go through `toCmsRole`.

### If you add a staff-facing screen later

Don't, if you can avoid it — the dashboard is the staff surface, and it is a website they can open on the same phone. If you genuinely must, the rules are:

1. Read the role through `toCmsRole(row.role)` so an unknown value falls back to `student` — the bottom of the ladder, which grants nothing.
2. Check a permission with `roleHasPermission(role, 'questions.publish')`, never a role name. Roles are bundles of permissions and the bundles change; the permission strings do not.
3. Treat the answer as cosmetic. The server checks again on every write, and it is the server's answer that counts. A client-side check decides what to draw, never what is allowed.

### Adding a role or permission

Both live in `schema.ts` and travel with it. A new role is a new entry in `cmsRoleDefinitions` with a `rank` and a permission list; a new permission is a new key in `cmsPermissionCatalog` plus the roles that get it. Nothing in the app has to change either time — which is the point of keeping them here rather than scattering `role === 'admin'` through the code.

The one thing to know: `rank` is what stops privilege escalation. Somebody may only grant a role below their own, so an admin can appoint encoders and moderators but not another admin. Only a super admin appoints admins.

---
