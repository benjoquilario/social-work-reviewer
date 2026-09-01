# Schema Notes for the Mobile App

**Version 6 — 1 September 2026.** The current document. v1 through v5 are kept
beside it; where any of them disagree, this one is right.

### What v6 is for

v5 was written from the schema's side: here is what changed, here is what broke.
v6 answers the question the app actually has — **what is left for us to build?**

The schema is finished. Every table, column and index billing needs now exists in
the live database, verified rather than assumed. What remains is app code and two
backend Functions, and this document says plainly which is which.

> **Start at [section 26](#26-what-the-mobile-app-has-to-build).** It is the whole
> work list, sequenced, with the blocked items marked and who they are blocked on.
> Everything else here is reference you already had.

**Sections 1–25 keep their numbers**, as they have since v2. v6 appends
sections 26–27 and edits 6 and 15 in place.

#### The one-line answer

Four things, and only the first is large:

| | The app has to | Blocked on |
| --- | --- | --- |
| **1** | Add a Play Billing client and build the real checkout | Play Console products existing |
| **2** | Handle `in_grace_period` on the membership screen | Nothing — do this now |
| **3** | Fix two widened enums | Nothing — do this now |
| **4** | Rebuild the dev client | Item 1 |

Items 2 and 3 are the whole of the v5 migration and can be done this afternoon.
Item 1 is real work and cannot start until somebody creates the subscription
products in Play Console and authors the matching plan rows.

#### What changed in the schema since v5

Almost nothing, and **none of it touches the app**.

The unique index on `subscriptions.purchaseToken` that v5 announced turned out
not to exist. Appwrite refuses to index a column longer than 767 characters and a
Play purchase token needs 1024, so the index had been *rejected* — and because the
migration tool logs a rejected index and carries on, it reported success. The fix
is a fixed-length `purchaseTokenHash` column beside the token, which is what the
index and every server-side lookup now use.

| | |
| --- | --- |
| **New columns** | `purchaseTokenHash` on `subscriptions`, `payments` and `billing_notifications`, plus `linkedPurchaseTokenHash` on `subscriptions`. All read-only, all optional, none read by the app |
| **Changed indexes** | `idx_subscription_token`, `idx_subscription_linked_token`, `idx_payment_token` and `idx_notification_token` moved onto the hash columns |
| **New section 26** | [What the mobile app has to build](#26-what-the-mobile-app-has-to-build) — the work list |
| **New section 27** | [Upgrading the app from v5](#27-upgrading-the-app-from-v5) — a re-copy of `schema.ts`, and nothing else |

`subscriptions` is read by member, never by token, so no query the app writes
goes anywhere near the hash. It is documented only so nobody is surprised to find
it on a row.

**Nothing breaks in v6.** The two compile-time breaks are still the ones v5
introduced, carried forward into [section 26](#26-what-the-mobile-app-has-to-build)
because they are still on the list until somebody does them.

---

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
| `newRowDefaults(tableKey)` | every value a create needs — see gotcha 3 |
| `requiredColumnsFor(tableKey)` | which columns those are |
| `formatMoney(amount, currency?)` | `299` → `₱299` — whole pesos, no centavos |
| `getMemberTypeLabel(value)` | `"professional"` → `"Licensed social worker"`, blank → `"Not said"` |
| `isMemberType(value)` | validate before trusting a stored value |
| `normalizeSetCode(s)` | `" set f "` → `"F"` |
| `ownedRowPermissions(userId)` | the permissions every create needs — see gotcha 1 |
| `tableNeedsRowPermissions(tableKey)` | whether that table's creates need them |
| `getTableAccessModel(tableKey)` | what Appwrite lets a member do — see section 11 |

Everything else the file exports — `cmsPermissionCatalog`, `cmsRoleDefinitions`,
`roleCanUseTable`, `getTablePermission` and friends — is the dashboard's access
control. The app does not use any of it; see section 14.

---

## Contents

1. [The two content models](#1-the-two-content-models) — how reading and exams are organised, and why they never join
2. [Routing a category — read this before building the nav](#2-routing-a-category--read-this-before-building-the-nav) — does a category have sets? answer it without a query
3. [The reading side — subjects, topics, materials](#3-the-reading-side--subjects-topics-materials) — subjects, topics, materials, and resume state
4. [Query cookbook](#4-query-cookbook) — the queries you need, with the limits you must not forget
5. [Gotchas that will cost you a day](#5-gotchas-that-will-cost-you-a-day) — **read this one** — ten ways to lose a day
6. [Membership and Google Play billing](#6-membership-and-google-play-billing) — **edited in v5** — Google Play, access codes, and the one rule
7. [Member history and activity](#7-member-history-and-activity) — sessions and the activity timeline
8. [Member settings](#8-member-settings) — how a member wants to be quizzed
9. [What is behind the paywall](#9-what-is-behind-the-paywall) — what is free and what is paid
10. [What the app writes](#10-what-the-app-writes) — the tables the app owns, and how many columns each create needs
11. [Permissions — why a write can come back 401](#11-permissions--why-a-write-can-come-back-401) — **read this before your first create** — the row permissions every create must carry
12. [Enum values — use the stored value, not the label](#12-enum-values--use-the-stored-value-not-the-label) — every enum value, checked against the schema
13. [Not part of the model any more](#13-not-part-of-the-model-any-more) — things that were removed, in case you find old code
14. [Roles are the dashboard's; who a member is, is yours](#14-roles-are-the-dashboards-who-a-member-is-is-yours) — roles are the dashboard's; `memberType` is yours
15. [Indexes — what you may filter and order on](#15-indexes--what-you-may-filter-and-order-on) — **new in v3** — and the one breaking change
16. [Search](#16-search) — **new in v3** — `Query.search`, and the things it will not do
17. [Saved questions — `user_bookmarks`](#17-saved-questions--user_bookmarks) — **new in v3**
18. [Reporting content — `flagged_content`](#18-reporting-content--flagged_content) — **new in v3** — now including a wrong answer key
19. [Where each backend request stands](#19-where-each-backend-request-stands) — the reply to `BACKEND-REQUESTS.md`
20. [Privacy — what each member can see](#20-privacy--what-each-member-can-see) — **new in v4** — what is hidden, from whom, and where a fact about a member lives
21. [Community in v4](#21-community-in-v4) — **new in v4** — likes, deletes and blocks after the permission change
22. [Deleting an account](#22-deleting-an-account) — **new in v4**
23. [Upgrading the app from v3](#23-upgrading-the-app-from-v3) — **new in v4** — the checklist
24. [Billing in v5](#24-billing-in-v5) — the grace period, and the one screen that should care
25. [Upgrading the app from v4](#25-upgrading-the-app-from-v4) — the v4 → v5 checklist
26. [What the mobile app has to build](#26-what-the-mobile-app-has-to-build) — **new in v6** — **start here** — the work list, what blocks each item, and what the app must never do
27. [Upgrading the app from v5](#27-upgrading-the-app-from-v5) — **new in v6** — re-copy `schema.ts`; there is no step two

**Building the app? Read 26.** It is the only section that tells you what to do
rather than what exists.

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

`fileUrl` has the same relative/absolute problem as `imageUrl` (gotcha 8): a
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
warning — see gotcha 2.

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
Query.equal('questionnaireId', ''),          // NOT Query.isNull — see gotcha 4
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

**1 — A create without `permissions` writes a row nobody can read.** Appwrite
grants a new row nothing unless the create says so — not the creator's access,
not the table's. The row is written, the call succeeds, and it is invisible to
the member who just wrote it. There is no error to search for.

```ts
import { ownedRowPermissions } from './schema'

await tablesDB.createRow({
  tableId: reviewerCmsSchema.study_sessions.tableId,
  rowId: ID.unique(),
  data,
  permissions: ownedRowPermissions(userId),   // <- without this, the row is orphaned
})
```

`ownedRowPermissions` comes from `schema.ts` and returns read, update and
delete for that member. Every table in section 11's first two groups needs it;
`tableNeedsRowPermissions('study_sessions')` answers the question from the
schema rather than from a list you have to maintain.

The sibling failure is a *read* that comes back
`The current user is not authorized to perform the requested action.` That one
is not the app's fault — it means the table's own permissions are wrong, and it
is fixed in the CMS repo, not here. Section 11 covers both.

**2 — Every list is silently cut to 25 rows.** Appwrite's default page size is
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

**3 — Required columns have no stored default, so a create must supply them
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

**4 — `Query.isNull` does not work on optional string columns.** Appwrite stores an unset string as `""`, not SQL `NULL`. `Query.isNull('questionnaireId')` returns nothing; `Query.equal('questionnaireId', '')` is the correct test. Same for any optional string field.

**5 — Record `sku`, never `$id`, in answer history.** Row IDs are reissued whenever content is re-imported. The SKU (`Q-000142`) is assigned once and reused forever, which is why `user_answers.questionSku` exists. Storing `$id` would orphan every historical answer the next time the CMS re-imports a sheet.

**6 — `answerIndex` is a position, not a letter.** `choices` is an ordered array; index `0` is displayed as **A**, `1` as **B**. Use `toChoiceLabel(i)` for display and never derive the answer from a letter stored elsewhere — position is the only source of truth.

```ts
const isCorrect = pickedIndex === question.answerIndex
const letter = toChoiceLabel(pickedIndex)   // for selectedAnswerKey
```

**7 — Choice counts vary.** The real bank has items with 3, 4, 5, and 6 choices. Render `choices.length`, don't hardcode four. True/false items are just two choices (usually `["True","False"]`, but a Tagalog paper may use `["Tama","Mali"]` — render what's there).

**8 — `imageUrl` may be relative.** Images uploaded through the CMS store `/api/assets/<fileId>`; a pasted link stores an absolute URL. Prepend the CMS base URL when it starts with `/`:

```ts
const src = question.imageUrl?.startsWith('/')
  ? `${CMS_BASE_URL}${question.imageUrl}`
  : question.imageUrl
```

**9 — `questionCount` is denormalised.** It's accurate as of the last CMS write. Don't use it for pagination bounds; use the real result count.

**10 — A unique index turns your second write into a 409, and on one table that
is the only answer you will ever get.** Four tables now refuse a duplicate at
the database rather than trusting the app not to send one: `post_likes` (one
like per member per post), `comment_likes`, `user_bookmarks` (one save per
question) and `flagged_content` (one report per member per target).

That is a feature — it settles the race between two taps, which no amount of
app-side checking can. But it means a create can fail for a reason that is not
a failure, and the right thing to show is usually nothing at all:

```ts
try {
  await tablesDB.createRow({ /* ... */ })
} catch (error) {
  if (error.code !== 409) throw error
  // Already liked / already saved / already reported. Not an error.
}
```

`flagged_content` is where this matters most, because the app **cannot read that
table** — it has create permission and nothing else. A 409 is therefore the only
way the app can ever learn that a report already exists, and showing a red error
for it tells a member who did exactly the right thing that they did something
wrong. See [section 18](#18-reporting-content--flagged_content).

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
| `6` IN_GRACE_PERIOD | Card failed, Play is retrying | `status: in_grace_period`. **Access continues** |
| `5` ON_HOLD | Card failed, Play gave up | `status: on_hold`, access ends now |
| `10` PAUSED | Member paused it | `status: paused`, access ends now |
| `13` EXPIRED | Period ended | `status: expired` |
| `12` REVOKED | Refunded / charged back | `status: refunded`, access ends now, the charges are marked refunded |

**Cancelling is not losing access.** The member paid for a period and keeps it to the end; only `EXPIRED`, `ON_HOLD`, `PAUSED` or `REVOKED` cuts it off. An app that hides content the moment someone cancels is taking back something already paid for.

**Nor is a failed payment, at first.** A declined card puts the subscription in a grace period, not out of it: Google keeps retrying for up to 30 days and the member stays subscribed throughout. Only when Google gives up does it go on hold, and that is where access stops. The two are far apart in what they mean and one day apart in the calendar, so the copy on the membership screen should tell them apart — during grace the member can still fix it, and after it they have to buy again.

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

### Reading the member's own subscription — new in v3

`subscriptions` is `server_private`: no table-level grants, so the only rows
reachable are the ones a grant names. **The server now grants the owning member
`read` on every subscription row it writes,** which is what makes a real Manage
membership screen possible.

```ts
Query.equal('userId', userId), Query.orderDesc('startsAt'), Query.limit(1)
```

Read and nothing else, deliberately — a member who could write here could extend
their own membership. `subscriptions` stays on the *never written by the app*
list in section 10.

Use it on the membership screen, where the states are worth getting right: with
`autoRenew` false the honest label is **"Access ends 12 Mar"**, not "Cancelled",
because they paid for that period and still have it. Keep gating everything else
on `hasActivePremium(profile)` — the cached fields are what every other screen
already reads, and one screen needing the truth is not a reason to make every
screen pay for the extra query.

Rows written before this change carry no grant and will not come back. There are
none in production, so there is nothing to backfill; if an old account ever
reports an empty membership screen, that is the reason.

### What else is on a subscription row — new in v5

Six columns were added, all optional, all **read-only** and all written by the
server from what the Play Developer API returned. None of them is required to
render a membership screen; they are here so that the answer to "what exactly
did this person buy, and what has Google said about it since" lives on the row
rather than in somebody's memory.

| Column | What it is | Worth showing? |
| --- | --- | --- |
| `basePlanId` | Which base plan of the product was bought | Only if one product carries several — otherwise the plan name says it |
| `purchaseTokenHash` | SHA-256 of the purchase token, written beside it | No. See below |
| `offerId` | The intro or promotional offer taken. Blank means full price | Yes, if you advertise offers: "You are on the 3-month intro price" |
| `linkedPurchaseToken` | The purchase this one replaced, on an upgrade | No. Server bookkeeping |
| `obfuscatedAccountId` | What the app attached to the purchase to name the buyer | No. It is a security check, not content |
| `acknowledgedAt` | When the server confirmed the purchase with Google | No |
| `latestNotificationAt` | When Google last said anything about it | No |

**Why there is a hash column at all.** Appwrite will not index a string column
longer than 767 characters, and a Play purchase token needs 1024 to be stored
without truncation. Both limits are real, so the column that *holds* the token
and the column that *finds* it cannot be the same one. Every server-side lookup
goes through `purchaseTokenHash`; the token itself is stored in full beside it,
because verifying and acknowledging a purchase needs the real value.

This matters to the app only as a thing not to be surprised by. `subscriptions`
is read by member, never by token, so no query you write ever touches it.

**`obfuscatedAccountId` is the one the app has a job for.** When you launch the
billing flow, set Play's obfuscated account identifier to a stable, non-personal
id for the signed-in member. The server compares what Play returns against the
account in the JWT, so a purchase token copied off another device grants nothing.
Do not put the email or the Appwrite user id in it verbatim — it is visible to
Play and it is not a place for anything identifying.

The `payments` row gained `refundedAt` on the same principle. A refunded charge
is not deleted: it stays with `status: 'refunded'` and a date, because a purchase
history that quietly loses rows is one nobody can reconcile.

### `billing_notifications` — not yours to read

New in v5, and listed here only so nobody goes looking for it. It records every
message Google Play sent about a purchase, so a redelivered notification is
recognised and dropped rather than applied twice.

It is `server_only`: **the app cannot read it and never should.** If a member
disputes their membership, the answer is on their `subscriptions` row; this table
is for whoever is debugging why that row says what it says.

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

Those server-written rows were invisible until v3. The API key that writes them
bypasses row security, so they landed carrying no grant at all and the member's
own timeline simply skipped them — no error, just a gap where the purchase
should have been. The server now grants the member `read` on each one. They stay
read-only by design: a row the server wrote about an account is a record, and a
record its subject can delete is not one.

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

`bookmarked` works from v3 onward. It shipped in the picker before there was
anywhere to store a bookmark, so choosing it fell through to returning the
*entire* paper — a member asking for their saved questions got all of them,
with nothing to say anything had gone wrong. `user_bookmarks` is what it reads
now; see [section 17](#17-saved-questions--user_bookmarks).

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

Every create on this list needs two things, and missing either one fails
quietly rather than loudly:

1. **`newRowDefaults(tableKey)`** for the required columns (gotcha 3). The
   counts below are how many columns each table demands, and the number is why.
2. **`ownedRowPermissions(userId)`** for the row's own permissions (gotcha 1),
   on every table here except `flagged_content`.

```ts
import { newRowDefaults, ownedRowPermissions, reviewerCmsSchema } from './schema'

await tablesDB.createRow({
  tableId: reviewerCmsSchema[tableKey].tableId,
  rowId: ID.unique(),
  data: { ...newRowDefaults(tableKey), ...yours },
  permissions: ownedRowPermissions(userId),
})
```

That shape is the same on every table below, so the examples show only the
`data` half unless there is something else worth pointing at.

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
await tablesDB.createRow({
  tableId: reviewerCmsSchema.user_progress.tableId,
  rowId: ID.unique(),
  data: { ...newRowDefaults('user_progress'), userId, categoryId, score: 88 },
  permissions: ownedRowPermissions(userId),
})
```

`answeredQuestionIds` is a string array and, despite the name, should hold
**SKUs** — for the same reason as `user_answers.questionSku` (gotcha 5). Row IDs
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

**`comment_likes` changed shape in v3.** `commentId` and `replyId` are gone;
write `targetType` + `targetId` instead. See
[section 15](#15-indexes--what-you-may-filter-and-order-on).

Both like tables carry a unique index, so a second like is a 409 rather than a
duplicate row. Treat that as already-liked, not as an error (gotcha 10).

**`likesCount` is read-only from v4** and a write to it is rejected. Write the
like row and nothing else. **`isDeleted` is required** on all three tables and
every read has to filter on it. Both are covered in
[section 21](#21-community-in-v4).

### `user_public_profiles` — **3 required**

New in v4, and the row that gives a member a byline. Created at sign-up
alongside `user_profiles`, and updated whenever they change their name, picture
or member type.

```ts
{ userId, displayName, avatarUrl, memberType,
  createdAt: new Date().toISOString() }
```

A member with no row here appears in the forum as nothing at all, so create it
in the same step as the profile and treat a failure there as a failed sign-up.
[Section 20](#20-privacy--what-each-member-can-see) says what may and may not go
in it.

### `user_blocks` and `announcement_reads` — **3 required each**

```ts
// user_blocks
{ userId, blockedUserId, createdAt: new Date().toISOString() }

// announcement_reads
{ userId, announcementId, readAt: new Date().toISOString() }
```

Both `member_private`, both unique on their pair, so a repeat is a 409 rather
than a duplicate (gotcha 10).

### `user_bookmarks` — saved questions — **3 required**

New in v3, and what makes `questionSource: 'bookmarked'` work.

```ts
{ userId, questionSku: question.sku, categoryId: question.categoryId,
  createdAt: new Date().toISOString() }
```

`categoryId` is optional but worth sending — it is what lets a bookmarked-only
session be scoped to one category without reading every saved question first.
Full contract in [section 17](#17-saved-questions--user_bookmarks).

### `flagged_content` — **6 required**

Written by the report button, read only by the team in the dashboard. The app
never reads it back; a member should not be able to see what has been reported.

It is the one create in this section that takes **no** `permissions` — a row the
reporter could read back is a row the reporter could be shown. Its table grants
`create` and nothing else, so leaving permissions off is what makes it
write-only. `tableNeedsRowPermissions('flagged_content')` returns `false`.

v3 added a required `createdAt` (send it; the queue is worked oldest first),
opened `contentType` to `question` and `material`, and made one report per member
per target unique. See [section 18](#18-reporting-content--flagged_content).

### Never written by the app

`subscription_plans`, `subscriptions`, `access_codes`, `billing_notifications`, and the four cached membership fields on `user_profiles`. Access is granted by the server, or a member could grant it to themselves.

`user_roles` and `staff_activity` too — see section 14. Those are the dashboard's, and the app neither reads nor writes them.

---

## 11. Permissions — why a write can come back 401

Two different failures live here, and telling them apart is most of the work:

| Symptom | Cause | Fixed in |
| --- | --- | --- |
| A create succeeds, then the row is missing from the next read | the create had no `permissions` | **this app** — gotcha 1 |
| `The current user is not authorized to perform the requested action.` | the *table's* permissions are wrong | the CMS repo — `schema.ts` |

The second one is never the app's fault and never visible in the dashboard: the
CMS reads through an API key, and an API key bypasses permissions entirely, so a
misconfigured table renders perfectly for the team and 401s every member. If a
screen 401s, say so and let the CMS side run `pnpm appwrite:inspect` — it prints
any table that has drifted, and it is a faster answer than reading app code.

### The one rule

**Every create on a row-security table must carry its own permissions.**

Appwrite gives a new row no permissions unless you ask for them. Not the
creator's, not the table's — none. A row created without them is invisible to
the person who just created it.

```ts
import { ID } from 'appwrite'
import {
  newRowDefaults, ownedRowPermissions, reviewerCmsSchema,
} from './schema'

await tablesDB.createRow({
  databaseId,
  tableId: reviewerCmsSchema.study_sessions.tableId,
  rowId: ID.unique(),
  data: { ...newRowDefaults('study_sessions'), userId, sessionId, categoryId },
  permissions: ownedRowPermissions(userId),
})
```

`ownedRowPermissions(userId)` returns read, update and delete for that member:

```ts
ownedRowPermissions('68f1a2b3')
// [ 'read("user:68f1a2b3")', 'update("user:68f1a2b3")', 'delete("user:68f1a2b3")' ]
```

Plain strings, not `Permission.read(...)`, because `schema.ts` has no imports and
has to stay that way. Both SDKs accept them as written.

**Updates and deletes take no permissions argument.** They are authorised by
what the row already carries. If an update 401s on a row the member owns, the
create is what was wrong — go back and check it passed permissions.

### Do not hardcode which tables need it

```ts
import { tableNeedsRowPermissions } from './schema'

const permissions = tableNeedsRowPermissions(tableKey)
  ? ownedRowPermissions(userId)
  : undefined
```

Derived from the schema, so a table that changes model later does not leave a
stale list behind in the app. `flagged_content` is the only table the app writes
where this returns `false`, and deliberately so — see section 10.

### What each table allows

`getTableAccessModel(tableKey)` returns one of these for any table.

| Model | Tables | The member can |
| --- | --- | --- |
| `member_private` | `user_profiles`, `user_answers`, `user_progress`, `user_settings`, `study_sessions`, `user_activity_log`, `learning_history`, `learning_achievements`, `user_daily_activity`, `user_weekly_reports`, `user_bookmarks`, `user_blocks`, `announcement_reads` | create; read/update/delete **only their own rows** |
| `member_public` | `user_public_profiles`, `posts`, `comments`, `replies`, `post_likes`, `comment_likes` | create; read **everyone's**; update/delete only their own |
| `member_submit` | `flagged_content` | create only — no permissions, and no read back |
| `app_readonly` | `subjects`, `topics`, `learning_materials`, `exam_categories`, `questionnaires`, `questions`, `announcements`, `subscription_plans` | read only |
| `server_private` | `subscriptions` | **read their own row** — the server grants it on create, new in v3. Never create, update or delete |
| `server_only` | `payments`, `access_codes`, `billing_notifications`, `user_roles`, `staff_activity` | nothing at all |

### The other direction: rows the server writes about a member

Row security cuts both ways, and the second cut is easy to miss. The API key the
CMS uses **bypasses permissions entirely**, so a row it writes into a
row-security table lands with whatever grant the write asked for — and if it
asked for none, the row exists and belongs to nobody. The member it is about
cannot see it, and nothing anywhere reports a problem.

That was live in two places until v3: a subscription the member could not read,
and billing entries missing from their own activity timeline. The server now
grants `read` on both, and `read` is all it grants:

```ts
// in the CMS, not the app
import { serverOwnedRowPermissions } from './schema'
permissions: serverOwnedRowPermissions(userId)   // ['read("user:<id>")']
```

The asymmetry with `ownedRowPermissions` is the point. A row the member wrote is
theirs to edit and delete. A row the server wrote *about* them is a record, and
a record its subject can change is not a record.

Nothing in the app changes because of this — it is listed here because it
explains why a table can be correctly configured and still hand you an empty
list, and because [section 6](#6-membership-and-google-play-billing) now depends
on it.

### Two consequences worth knowing before you design a screen

**A `member_private` table cannot show you anybody else's rows.** Not a
leaderboard, not "12 other members studied this today", not a comparison
against an average. Those numbers have to come from a server-side aggregate,
because the query returns the member's own rows and nothing else — with no
error, just a short list.

**`member_public` is what makes the forum work.** `posts` stores a `userId` and
no author name, so rendering a thread means reading the poster's `user_profiles`
row. That read is open to every member for exactly this reason; keep anything
genuinely private off `user_profiles`.

**`member_shared` is gone in v4, and nothing uses it.** It existed for one
reason: `likesCount` was a counter one member incremented on another member's
row, Appwrite cannot scope a grant to a single column, so table-level `update`
had to be open on the three community tables — which meant any signed-in
account could rewrite anybody's post body, silently, with the author the last
to know.

The counter is a reconciled cache now. Nobody writes anybody else's row, so the
grant went with the need for it. [Section 21](#21-community-in-v4) is what
replaced it. The model is still defined in `schema.ts` because a table may want
it one day; no table has it today.

---

## 12. Enum values — use the stored value, not the label

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
| `subscriptions.status` | `pending`, `active`, `in_grace_period`, `on_hold`, `paused`, `expired`, `cancelled`, `refunded` |
| `subscriptions.source` | `google_play`, `access_code`, `promo`, `manual` |
| `payments.status` | `paid`, `refunded`, `pending`, `failed` |
| `payments.kind` | `initial`, `renewal`, `refund` |
| `billing_notifications.status` | `received`, `applied`, `duplicate`, `ignored`, `failed` — server-side only, the app never reads this table |
| `user_profiles.subscriptionStatus` | `none`, `pending`, `active`, `expired`, `cancelled` |

**`subscriptions.status` gained three values; `user_profiles.subscriptionStatus`
deliberately did not.** The three are Play's payment-failure states, and the
server folds them into the five the profile already had — grace period reads as
`active`, on hold as `expired`, paused as `cancelled`. Every screen that gates
on the cached field is unaffected and needs no change.

Only the membership screen, which reads the subscription row itself, ever sees
them. There it is worth the distinction: `in_grace_period` **still has access**
— their card failed and Google is retrying while keeping them subscribed — and
saying so ("we could not charge your card, access continues until 12 Mar") is
the message that gets it fixed. `on_hold` and `paused` do not have access.

### The member, and what the app writes about them

| Column | Values |
| --- | --- |
| `user_profiles.memberType` | `student`, `graduate`, `retaker`, `professional`, `instructor`, `institution`, `other` |
| `study_sessions.mode` | `quiz`, `board_exam`, `review` |
| `study_sessions.status` | `in_progress`, `completed`, `abandoned` |
| `learning_history.status` | `in_progress`, `paused`, `completed` |
| `user_activity_log.type` | `signed_up`, `signed_in`, `subscription_started`, `subscription_renewed`, `subscription_expired`, `subscription_refunded`, `payment_submitted`, `payment_confirmed`, `code_redeemed`, `session_completed`, `material_completed`, `achievement_earned`, `post_created` |
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
| `user_settings.questionSource` | `all`, `unanswered`, `incorrect`, `bookmarked` — `bookmarked` is backed by a real table from v3, see [section 17](#17-saved-questions--user_bookmarks) |
| `user_settings.difficultyFilter` | `all`, `easy`, `medium`, `hard` |
| `user_settings.timerMode` | `off`, `per_question`, `whole_session` |
| `user_settings.theme` | `system`, `light`, `dark` |
| `user_settings.fontScale` | `small`, `medium`, `large`, `xlarge` |
| `user_settings.language` | `en`, `fil` |

### Community

| Column | Values |
| --- | --- |
| `posts.category` | `question`, `discussion`, `tip` |
| `comment_likes.targetType` | `comment`, `reply` — **new in v3**, and it replaced the `commentId` / `replyId` pair |
| `flagged_content.contentType` | `post`, `comment`, `reply`, `question`, `material` — the last two are **new in v3** |
| `flagged_content.status` | `pending`, `reviewing`, `resolved`, `dismissed` |

### Dashboard only — the app never reads these

| Column | Values |
| --- | --- |
| `user_roles.role` | `student`, `member`, `encoder`, `moderator`, `admin`, `super_admin` — see section 14 |
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

## 13. Not part of the model any more

`exams`, `exam_questions`, `exam_attempts`, `choices`, and `question_tags` were removed. Choices are now an array on the question row, and there is no separate exam entity — a category *is* the exam. If you find references to these in older mobile code, they map to `exam_categories` / `questionnaires` / `questions.choices`.

`questions` are **not** linked to `subjects` or `topics`. Those organize reading material only.

---

## 14. Roles are the dashboard's; who a member is, is yours

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

---

## 15. Indexes — what you may filter and order on

Appwrite needs an index to filter or sort on a column. Without one the read is a
full collection scan at best and `Index not found` at worst — and because a scan
over a small table is indistinguishable from a working query, the failure
arrives when the table gets big. Which is to say in production, on whichever
screen people use most.

Before v3, nine tables had no indexes at all: `subjects`,
`learning_achievements`, `posts`, `comments`, `replies`, `post_likes`,
`comment_likes`, `announcements` and `flagged_content`. The community feed
— every post ordered by `createdAt`, paged with a cursor — was running against a
table with nothing under it. It worked because there were three posts.

All 34 tables have indexes now, 83 of them. The list below is the contract:
**if a query filters or orders on a column that is not in it, expect that query
to fail.** Ask for the index rather than working around it in app code; that is
what `BACKEND-REQUESTS.md` is for, and it is a one-line change here.

### The breaking change: `comment_likes`

`comment_likes` used to carry `commentId` and `replyId`, both optional, with the
rule being *fill exactly one*. That shape cannot be made unique. The unused
column is blank on every row, so a unique index over the pair collides on the
first two blanks and rejects the second like anybody ever writes — which means
double-liking a comment could only ever be prevented by the app, in a race
between two taps that the app always loses eventually.

v3 replaces the pair with a discriminator and one id, which is always populated:

```ts
// v2 and earlier — no longer valid
data: { userId, commentId }            // or { userId, replyId }

// v3
data: { userId, targetType: 'comment', targetId: commentId }
data: { userId, targetType: 'reply',   targetId: replyId }
```

Reads change the same way:

```ts
// Has this member liked this comment?
Query.equal('userId', userId),
Query.equal('targetType', 'comment'),
Query.equal('targetId', commentId)

// Everyone who liked it
Query.equal('targetType', 'comment'), Query.equal('targetId', commentId)
```

`permissions: ownedRowPermissions(userId)` is unchanged, and so is everything
about `post_likes` except that it too is unique now, on `(userId, postId)`.

**There is nothing to migrate.** The table held zero rows when this went in, so
no like was lost. The old columns are gone; a write that still sends `commentId`
will be rejected for an unknown column rather than silently ignored, which is
the failure you want.

### Every index the app can use

Dashboard-only tables are left out — `user_roles`, `staff_activity`, `payments`,
`access_codes` and `billing_notifications` are not readable by the app at all
(section 11).

| Table | Index | Type | Columns | What it lets you do |
| --- | --- | --- | --- | --- |
| `user_profiles` | `idx_profile_user` | unique | `userId` | One profile per Appwrite account. Two would split a member's membership between them. |
| `user_profiles` | `idx_profile_premium` | key | `isPremium ASC, premiumUntil ASC` | Backs subscriber lists and the lapse sweep. |
| `user_settings` | `idx_settings_user` | unique | `userId` | One row per member. Two would let the app read one and write the other, and the setting would appear not to save. |
| `subscription_plans` | `idx_plan_code` | unique | `code` | Receipts and the app refer to plans by code. |
| `subscription_plans` | `idx_plan_google_product` | unique | `googleProductId` | A purchase arrives from Play carrying only a product ID. Two plans sharing one would make it impossible to say what was bought. |
| `subscription_plans` | `idx_plan_active_order` | key | `isActive ASC, order ASC` | Backs the plan picker: what is on sale, in the order it should be shown. |
| `subscriptions` | `idx_subscription_user_status` | key | `userId, status` | Backs 'what is this member's current access'. |
| `subscriptions` | `idx_subscription_expiry` | key | `status ASC, endsAt ASC` | Backs the sweep that expires finished subscriptions, which has to find them by date without reading the whole table. |
| `subscriptions` | `idx_subscription_order` | key | `orderId` | Play notifications arrive carrying an order ID; this is how the row they refer to is found. |
| `subscriptions` | `idx_subscription_token` | unique | `purchaseTokenHash` | The purchase token *is* the purchase. Every notification and every re-report from the app arrives carrying nothing else, so this is the lookup billing cannot work without — and unique is what makes applying the same purchase twice update one row instead of granting two. |
| `subscriptions` | `idx_subscription_linked_token` | key | `linkedPurchaseTokenHash` | Finds the row an upgrade replaced, so the old subscription is closed instead of running alongside the new one. |
| `subscriptions` | `idx_subscription_acknowledged` | key | `status, isAcknowledged` | Backs the alarm: active purchases Google has not been told about, each of which is a refund three days after it was made. |
| `subjects` | `idx_subject_published_order` | key | `isPublished ASC, order ASC` | Backs the published-subjects listing, which is the first read the app makes on launch. |
| `subjects` | `idx_subject_search` | fulltext | `name` | Backs searching subjects by name. |
| `topics` | `idx_topic_subject_order` | key | `subjectId ASC, order ASC` | Backs listing a subject's topics in order. |
| `topics` | `idx_topic_search` | fulltext | `title` | Backs Query.search on topic titles. Fulltext is the only index type Appwrite will accept a search against; without one the call is an error, not a slow query. |
| `learning_materials` | `idx_material_topic_order` | key | `topicId ASC, order ASC` | Backs listing a topic's materials in order. |
| `learning_materials` | `idx_material_subject_order` | key | `subjectId ASC, order ASC` | Backs listing everything in a subject without first collecting its topic ids. |
| `learning_materials` | `idx_material_search` | fulltext | `title` | Backs searching the library by lesson title. |
| `learning_materials` | `idx_material_content_search` | fulltext | `content` | Backs searching inside lessons - the query a member actually types, which is a phrase they half-remember rather than a title. |
| `exam_categories` | `idx_category_code` | unique | `code` | Codes seed every questionnaire code beneath them, so two categories sharing one would produce colliding paper codes. |
| `exam_categories` | `idx_category_published_order` | key | `isPublished ASC, order ASC` | Backs the published-categories listing. |
| `exam_categories` | `idx_category_search` | fulltext | `title` | Backs searching exam categories by name. |
| `questionnaires` | `idx_questionnaire_code` | unique | `code` | Codes name the downloaded sheet. Without uniqueness two sets would produce the same file name. |
| `questionnaires` | `idx_questionnaire_category` | key | `categoryId ASC, order ASC` |  |
| `questionnaires` | `idx_questionnaire_category_set` | unique | `categoryId, setCode` | One Set B per category. Two would show a student the same letter twice with different questions behind it. Scoped to the category, so every category still has its own Set A. |
| `questions` | `idx_question_sku` | unique | `sku` | The SKU is the upsert key and what answer history records. Two rows sharing one would merge two questions' statistics. |
| `questions` | `idx_question_paper_order` | key | `questionnaireId ASC, order ASC` | Backs reading one set in item order. |
| `questions` | `idx_question_category_order` | key | `categoryId ASC, order ASC` | Backs reading a whole category in item order - the hot path, because most categories have no sets at all. |
| `questions` | `idx_question_target_order` | unique | `categoryId, questionnaireId, order` | One item number per destination. This is what makes concurrent uploads safe. |
| `questions` | `idx_question_search` | fulltext | `prompt` | Backs searching the question bank by wording. `I remember an item about the Social Work Law` had no answer before this except scrolling. |
| `study_sessions` | `idx_session_user_started` | key | `userId ASC, startedAt DESC` | Backs a member's session history, newest first. |
| `study_sessions` | `idx_session_key` | unique | `userId, sessionId` | One row per sitting. Without it a retried start request quietly creates a second session and splits the answers. |
| `user_activity_log` | `idx_activity_user_time` | key | `userId ASC, occurredAt DESC` | Backs the member timeline, newest first. |
| `user_activity_log` | `idx_activity_type_time` | key | `type ASC, occurredAt DESC` | Backs an admin filtering the log to one kind of event. |
| `learning_history` | `idx_history_user_accessed` | key | `userId ASC, lastAccessedAt DESC` | Backs the continue-where-you-left-off list. |
| `user_answers` | `idx_answer_user_paper` | key | `userId, questionnaireId` | Backs scoring one student's attempt at one set. |
| `user_answers` | `idx_answer_user_category` | key | `userId, categoryId` | Backs scoring one student against a whole category, which is the common case now that most categories have no sets. |
| `user_answers` | `idx_answer_question` | key | `questionSku` | Backs per-item statistics, which is the whole reason answers record a SKU rather than a row ID. |
| `user_progress` | `idx_progress_user_paper` | key | `userId, questionnaireId` |  |
| `user_daily_activity` | `idx_daily_user_date` | key | `userId ASC, activityDate DESC` |  |
| `user_weekly_reports` | `idx_weekly_user_week` | key | `userId ASC, weekStartDate DESC` |  |
| `learning_achievements` | `idx_achievement_member` | key | `userId ASC, earnedAt DESC` | Backs a member's badge list, newest first. This is the only read the app makes on the table. |
| `learning_achievements` | `idx_achievement_member_badge` | key | `userId, badgeKey` | Answers `does this member already have this badge` without pulling every row they have earned. Deliberately not unique: a weekly badge is earned again each week, and the period columns are what tell those apart. |
| `user_bookmarks` | `idx_bookmark_member` | unique | `userId, questionSku` | Saving twice is a no-op instead of a duplicate, and the race between two taps is settled by the database rather than by the app. |
| `user_bookmarks` | `idx_bookmark_recent` | key | `userId ASC, createdAt DESC` | Backs the saved list, newest first. |
| `user_bookmarks` | `idx_bookmark_category` | key | `userId, categoryId` | Backs a bookmarked-only session inside one category. |
| `posts` | `idx_posts_created` | key | `createdAt DESC` | Backs the community feed: every post newest first, paged with a cursor. The feed ran without it only because the table was small. |
| `posts` | `idx_posts_member` | key | `userId ASC, createdAt DESC` | Backs a member's own posts, and the account-deletion sweep that has to find everything they wrote. |
| `posts` | `idx_posts_subject` | key | `subjectId ASC, createdAt DESC` | Backs the feed filtered to one subject. |
| `comments` | `idx_comments_post` | key | `postId ASC, createdAt ASC` | Backs a post's comment thread in the order it was written. Oldest first, because a conversation read newest-first is not a conversation. |
| `comments` | `idx_comments_member` | key | `userId ASC, createdAt DESC` | Backs the account-deletion sweep, which has to find a member's comments across every post. |
| `replies` | `idx_replies_comment` | key | `commentId ASC, createdAt ASC` | Backs a comment's replies in the order they were written. |
| `replies` | `idx_replies_member` | key | `userId ASC, createdAt DESC` | Backs the account-deletion sweep. |
| `post_likes` | `idx_post_like_member` | unique | `userId, postId` | One like per member per post, enforced here rather than in a race between two taps. A second like comes back 409, which the app reads as already liked. |
| `post_likes` | `idx_post_like_post` | key | `postId` | Backs counting a post's likes and listing who liked it. |
| `comment_likes` | `idx_comment_like_member` | unique | `userId, targetType, targetId` | One like per member per target, enforced by the database. A second like comes back 409, which the app reads as already liked. |
| `comment_likes` | `idx_comment_like_target` | key | `targetType, targetId` | Backs counting the likes on one comment or reply, and listing who left them. |
| `announcements` | `idx_ann_published` | key | `publishedAt DESC` | Backs the Updates tab: everything already published, newest first. Ordering without this index is an error rather than a slow read. |
| `announcements` | `idx_ann_audience` | key | `audience ASC, publishedAt DESC` | Backs narrowing to one audience server-side. It saves bandwidth; it is not privacy - the table is readable by every member, so audience is a targeting hint and never a secret. |
| `flagged_content` | `idx_flag_status` | key | `status ASC, createdAt ASC` | Backs the triage queue: pending reports, oldest first. |
| `flagged_content` | `idx_flag_target` | key | `contentType, contentId` | Every report filed against one question or post. Three members reporting the same item is the difference between a wrong answer key and a grudge. |
| `flagged_content` | `idx_flag_reporter` | unique | `reportedBy, contentType, contentId` | One report per member per target, which keeps the queue a list of problems rather than a list of taps. |

<!-- generated: 83 indexes across 34 tables, 6 of them fulltext -->

---

## 16. Search

There was no search anywhere in the app, and it could not be added: `Query.search`
requires a fulltext index and no table had one. v3 adds six.

| Looking for | Table and column | Query |
| --- | --- | --- |
| A question by its wording | `questions.prompt` | `Query.search('prompt', text)` |
| A lesson by title | `learning_materials.title` | `Query.search('title', text)` |
| A phrase inside a lesson | `learning_materials.content` | `Query.search('content', text)` |
| A subject | `subjects.name` | `Query.search('name', text)` |
| A topic | `topics.title` | `Query.search('title', text)` |
| An exam category | `exam_categories.title` | `Query.search('title', text)` |

`questions.prompt` is the one members will reach for most. *"I remember an item
about the Social Work Law but I cannot find it"* had no answer before this
except scrolling.

### What fulltext will not do

It is a word index, not a substring match, and the differences show up
immediately in a search-as-you-type field:

- **Whole words only.** `soc` does not match `social`. If you want
  search-as-you-type, either wait for a word boundary or append `*` and accept
  that leading wildcards still will not work.
- **Short words may be dropped.** Very short tokens are ignored by the index.
  A single-letter query returning nothing is not a bug you can fix in the app.
- **Ranking is the engine's, not yours.** Combining `Query.search` with an
  `orderDesc` on a different column is a good way to get an error rather than a
  sorted result. Search, then sort what came back if you must.
- **Searching `questions` searches the paid bank too.** The index does not know
  about entitlement. Keep the `Query.equal('isFree', true)` restriction on for
  viewers who are not entitled, exactly as the pool reads do today — see
  [section 19](#19-where-each-backend-request-stands), item 3, for why that is
  still the app's job for now.

Searching `learning_materials.content` is the most useful and the most
expensive; it is a 20,000-character column. Debounce it, and prefer title search
for anything that runs on every keystroke.

---

## 17. Saved questions — `user_bookmarks`

New in v3. `user_settings.questionSource` has offered `bookmarked` since the
settings screen shipped, and until now nothing stored a bookmark — so choosing
it fell through to returning the whole paper. A member asking for their saved
questions got every question, and nothing told them otherwise. A setting that
quietly does the opposite of what it says is worse than a setting that is not
there, which is why this table exists.

```ts
{
  userId,                                  // required
  questionSku: question.sku,               // required — the SKU, not $id (gotcha 5)
  categoryId: question.categoryId,         // optional, but send it
  createdAt: new Date().toISOString(),     // required
}
```

`member_private`, so `permissions: ownedRowPermissions(userId)` as usual, and a
member only ever sees their own.

**Saving.** The unique index on `(userId, questionSku)` means saving twice is a
409 rather than a duplicate. That is the whole dedupe — do not check first, just
write and swallow the 409 (gotcha 10).

**Unsaving** is a delete of the row, which needs its `$id`:

```ts
const existing = await tablesDB.listRows({
  tableId: reviewerCmsSchema.user_bookmarks.tableId,
  queries: [Query.equal('userId', userId), Query.equal('questionSku', sku), Query.limit(1)],
})
if (existing.rows[0]) await tablesDB.deleteRow({ /* ... */ rowId: existing.rows[0].$id })
```

**The saved list**, newest first, and the pool for a bookmarked-only session:

```ts
// The list
Query.equal('userId', userId), Query.orderDesc('createdAt'), Query.limit(100)

// Scoped to one category — this is why categoryId is worth sending
Query.equal('userId', userId), Query.equal('categoryId', categoryId)
```

Then filter the paper by the SKUs that come back, the same way `incorrect` works
in [section 8](#8-member-settings). Both indexes are in section 15, and
remember gotcha 2 — the default page size is 25, so a member with more than 25
bookmarks silently gets 25 unless you say otherwise.

`questionSku` rather than `$id` for the same reason answers record a SKU: row IDs
are reissued when content is re-imported, and a bookmark that points at `$id`
quietly detaches the next time the CMS re-uploads a sheet.

---

## 18. Reporting content — `flagged_content`

The report flow already existed; until v3 it could only be pointed at community
posts, comments and replies. `contentType` now also takes **`question`** and
**`material`**.

That is a small change with a large consequence. A reviewer app's credibility is
its answer key, and when a member found a wrong one there was nowhere to put it
— so it went to a Facebook group, or a one-star review, or nowhere, while the
item stayed wrong for everyone who reached it afterwards. The same queue the
team already triages now collects them.

```ts
{
  contentType: 'question',                  // post | comment | reply | question | material
  contentId: question.sku,                  // the SKU for a question — see below
  reportedBy: userId,
  reason: 'The answer key says B, but the Social Work Law says C.',
  status: 'pending',                        // newRowDefaults supplies this
  createdAt: new Date().toISOString(),      // required, new in v3
}
```

No `permissions` argument — this is the one table where leaving it off is
correct, and section 10 says why.

**`contentId` holds the SKU for a question, not its `$id`.** Row IDs are
reissued on re-import, so a report filed against `$id` points at nothing after
the next upload — which is precisely when someone would be acting on it. The SKU
is also what an encoder can search for. For posts, comments and replies, use the
row `$id` as before.

**One report per member per target.** `(reportedBy, contentType, contentId)` is
unique, so a second report of the same item by the same member comes back 409.
Since the app cannot read this table, that 409 is the *only* signal it will ever
get that a report already exists — show a thank-you, not an error. See gotcha 10.

**A suggestion for the reasons list.** The presets are the app's, not the
schema's, but a question report wants different ones from a post report:
*The answer is wrong*, *The explanation does not match the answer*, *There is a
typo*, *The question is unclear*. The first of those is the one worth having.

**`createdAt` is required.** The queue is worked oldest first and no index in
`schema.ts` can reference `$createdAt`, so the ordering has to stand on a column
the schema owns.

The team also gets `reviewedBy`, `reviewedAt` and `resolutionNote` on each row.
Those are the dashboard's; the app neither sends nor reads them.

---

## 19. Where each backend request stands

The reply to `BACKEND-REQUESTS.md`, in its own numbering.

| # | Ask | Status |
| -- | --- | --- |
| 1 | Play purchase verification Function + RTDN | **Not done** — but the hard half exists, and in v5 it works. See below. |
| 2 | Password recovery: SMTP + redirect URL | **Not done** — Appwrite console work, nothing in `schema.ts` can do it |
| 3 | Premium question access Function | **Not done** — and `questions` deliberately not locked down yet. See below. |
| 4 | Indexes on the tables that have none | **Done** — it was nine tables, not eight; [section 15](#15-indexes--what-you-may-filter-and-order-on) |
| 5 | `flagged_content.contentType` gains `question` | **Done**, and `material` with it — [section 18](#18-reporting-content--flagged_content) |
| 6 | A bookmarks table | **Done** — [section 17](#17-saved-questions--user_bookmarks) |
| 7 | Access code redemption Function | **Not done** — the redemption logic exists. See below. |
| 8 | Fulltext indexes | **Done**, six of them — [section 16](#16-search) |
| 9 | Confirm `announcements` publishing is live | **Confirmed** — with a caveat. See below. |
| 10 | Row read permission on `subscriptions` | **Done** — [section 6](#6-membership-and-google-play-billing) |

### 1 — it is wiring, not a build

`applyGooglePurchase()` and `applyGoogleNotification()` are real, implemented,
and live in the CMS repo today. They verify the token against Play, acknowledge
the purchase, write `subscriptions` and `payments`, and re-sync the cached
membership fields. The `orderId` unique index that makes redelivered
notifications safe to retry is already in place.

**v4 said that and it was true; it was also not enough.** An audit before wiring
up Play Billing found that `subscriptions.purchaseToken` — the column both those
handlers look rows up by, and the only identifier a renewal notification carries
— had no index at all. Appwrite needs one to filter on a column, so the first
real purchase would have failed at the point where access is granted, after the
member had paid. `idx_subscription_token` fixes it, and it is unique, so
applying the same purchase twice updates one row instead of granting two.

**v5 said *that*, and it was not enough either.** The index it announced had
been *rejected*: Appwrite will not index a column longer than 767 characters and
a purchase token needs 1024, so the database refused it — and because the
migration tool logs a rejected index and carries on, the run reported success.
The index did not exist until v6, when it was rebuilt on a fixed-length
`purchaseTokenHash` column. It is checked against the live database now rather
than inferred from the schema file, which is the only way this class of failure
is visible at all.

Three other things were fixed alongside, all invisible from the app: Play's
payment-failure notifications are handled rather than ignored
([section 24](#24-billing-in-v5)), an upgrade now closes the subscription it
replaced, and `billing_notifications` makes a redelivered message a no-op.

What still does not exist is an Appwrite Function wrapping the handlers and an
HTTP endpoint for Google to post notifications to. That is the remaining work,
and it is smaller than this document's #1 assumed.

The contract you specified — `{ purchaseToken, productId, orderId }` in,
`{ ok, subscription }` or `{ ok: false, message }` out, `userId` from the JWT
rather than the body — is the right shape. Build to it. Pass Play's
`basePlanId`, `offerId`, `linkedPurchaseToken` and `obfuscatedExternalAccountId`
through as well when `subscriptionsv2.get` returns them; the columns are there.

**One thing to check before any of this matters: `subscription_plans` is
empty.** Zero rows — verified against the live database, not assumed. The
premium screen reads real plans out of it, so it has nothing to render
regardless of what the Function does. Somebody has to author the plans in the
dashboard first, and they cannot be authored until the products exist in Play
Console, because `googleProductId` has to point at something real.

### 3 — why `questions` is still `app_readonly`

You are right about the exposure, and it is not fixed. Any signed-in member can
read every row in the paid bank — prompt, choices, `answerIndex`, explanation.

It stays open because the Function does not exist yet, and locking the table
first would take the app's free samples down with the paid ones. Appwrite cannot
express *"readable only where `isFree` is true"*; a table is readable or it is
not. So the order has to be: Function first, lockdown second.

Keep the client-side `Query.equal('isFree', true)` restriction. It stops the app
leaking; it does not stop anyone who goes looking, and nobody should read it as
if it does.

There is a second option worth considering when you get there: **split the
answer key off the question.** Leave `prompt`, `choices` and `isFree` on a
readable `questions` table and move `answerIndex` and `explanation` to a
`server_only` companion. That protects the part that actually is the product
without a Function on the read path — but it breaks offline scoring, because a
session that cannot see the answer cannot mark itself. Which of those two costs
is worse is a product decision, not a schema one, so it is not made here.

### 7 — also wiring

`redeemAccessCode(userId, code)` exists in the CMS and already returns the four
distinct failure reasons this document asked to keep distinct — not recognised,
no longer active, expired, already used. `access_codes` stays `server_only`,
which is right: a readable code table is a free-premium table. What is missing
is the Function wrapper, same as #1.

### 9 — it works, and nothing has been published

The dashboard can create, edit and publish announcements today — `announcements`
is an ordinary managed table with a create form. The `publishedAt DESC` index
you asked for is in, plus an `(audience, publishedAt)` index if you would rather
filter server-side.

**There are zero rows.** Nothing is broken; nobody has written one yet. The
Updates tab can be built against the table whenever you want it, and
`data/news-data.ts` can go when someone authors the first announcement.

On your second point: **you are right that audience is not privacy.** The table
is `app_readonly`, so every member can read every row whatever its `audience`.
That is fine for "new questionnaires added" and wrong for anything with a
discount code or a member's name in it. Treat `audience` as a targeting hint,
and we will write announcements on that assumption. If a genuinely private
announcement is ever needed, it needs a Function or its own table — say so and
it gets built.

### The smaller notes

**Server-side aggregates.** Still true, and now more so: `user_progress`,
`user_daily_activity`, `user_weekly_reports`, `user_bookmarks` and (from v4)
`user_profiles` itself are all `member_private`, so a query returns the caller's
rows and nothing else, with no error to say the rest were withheld. A leaderboard or a national average cannot
be built on them at any effort. It needs a Function or a precomputed public
table. Nothing has been planned around one.

**The `member_shared` hole is closed in v4.** Round two was right to put this
above #7 and arguably above #3, and right that the exposure being a *write*
rather than a read is what made it different in kind.

It turned out not to need a Function. The counter did not have to be written
live — it had to stop being writable by members. It is a cache reconciled from
the like tables now, the app applies its own optimistic delta, and any screen
wanting an exact number counts the like table directly. With nobody needing to
write anybody else's row, the table-level `update` grant was removed and the
three tables are `member_public`. See [section 21](#21-community-in-v4).

**A second hole, which neither round had spotted, is also closed.**
`user_profiles` was `member_public`, and it carries `email`, `licenseNumber`,
`schoolOrEmployer` and `schoolName`. Every signed-in account could read all of
it, for every member, in bulk, with one SDK call — a passive read of personal
information rather than something needing intent. It is `member_private` now and
the three columns a forum actually needs moved to `user_public_profiles`. See
[section 20](#20-privacy--what-each-member-can-see).

**`.env.example`.** Noted, and yours — nothing needed here.

**Diagnostics.** `app/diagnostics.tsx` probing every table and naming the one
that 401s is exactly the right tool, and section 11 is its counterpart on this
side. Keep it.

---

## 20. Privacy — what each member can see

The only privacy that exists is the table's. There is no such thing as a field
the app declines to render being hidden: any signed-in account can open the SDK
and read whatever its session is permitted to read, and what it is permitted to
read is the access model and nothing else. A column on a `member_public` table
is public, whatever the app does with it.

That was the bug v4 fixes. `user_profiles` was `member_public` — because the
forum has to render an author's name — and it also carries `email`,
`licenseNumber`, `schoolOrEmployer` and `schoolName`. So every signed-in member
could read every other member's email address and PRC licence number, in bulk,
with one call. Nothing in the app offered it. Nothing had to.

v3's own section 11 stated the rule already: *"keep anything genuinely private
off `user_profiles`"*. The schema was breaking it.

### Where a fact about a member lives now

| Fact | Table and column | Who can read it |
| --- | --- | --- |
| Display name | `user_public_profiles.displayName` | **every signed-in member** |
| Avatar | `user_public_profiles.avatarUrl` | **every signed-in member** |
| Member type | `user_public_profiles.memberType` | **every signed-in member** |
| Full name | `user_profiles.fullName` | the member, and staff in the dashboard |
| Email | `user_profiles.email` | the member, and staff |
| PRC licence number | `user_profiles.licenseNumber` | the member, and staff |
| School / employer | `user_profiles.schoolName`, `.schoolOrEmployer` | the member, and staff |
| Membership state | `user_profiles.isPremium`, `.premiumUntil`, `.planName`, `.subscriptionStatus` | the member, and staff |
| Last active | `user_profiles.lastActiveAt` | the member, and staff |
| Subscription detail | `subscriptions` | the member, read-only (section 6) |
| Payments | `payments` | staff only |
| Answers, progress, sessions, history, bookmarks | the `member_private` tables | the member |
| Who they blocked | `user_blocks` | the blocker only — never the blocked |
| What they reported | `flagged_content` | staff only — not even the reporter |

### The rule for anything added later

**Adding a column to `user_public_profiles` publishes it to every member of the
app.** There is no halfway. Before adding one, the question is not *"would the
app show this"* but *"would we be comfortable with a competitor exporting this
column for the whole membership"*, because that is what the column means.

Three things that specifically must not go there: an email address, a licence
number, and anything about payment or membership state. A premium badge on a
post looks harmless and is a list of who to phish.

`user_profiles` is where anything else goes, and it is private by default now.

### What the app has to change

Reading your **own** profile is unchanged — `user_profiles` still has your row
and `member_private` still lets you read it.

Reading **somebody else's** is what moved:

```ts
// v3 and earlier — returns nothing in v4
Query.equal('userId', authorId)   // against user_profiles

// v4
const author = await tablesDB.listRows({
  tableId: reviewerCmsSchema.user_public_profiles.tableId,
  queries: [Query.equal('userId', authorId), Query.limit(1)],
})
```

For a feed, batch it — one query for every author on the page, not one per post:

```ts
const authorIds = [...new Set(posts.map((post) => post.userId))]
const authors = await tablesDB.listRows({
  tableId: reviewerCmsSchema.user_public_profiles.tableId,
  queries: [Query.equal('userId', authorIds), Query.limit(100)],
})
```

`Query.equal` takes an array and reads as `IN`. Watch gotcha 2 — pass a limit,
or a page with more than 25 distinct authors quietly loses the rest.

### Writing the public row

Sign-up writes two rows. So does editing a profile, if the edit touches a name,
picture or member type:

```ts
await tablesDB.createRow({
  tableId: reviewerCmsSchema.user_public_profiles.tableId,
  rowId: ID.unique(),
  permissions: ownedRowPermissions(userId),
  data: { userId, displayName, avatarUrl, memberType,
          createdAt: new Date().toISOString() },
})
```

Unique on `userId`, so a second create is a 409 — which makes the safe pattern
"try to create, and on 409 update the row that already exists".

A member with a `user_profiles` row and no public row is invisible in the forum:
their posts render with no author. Existing members were backfilled by the CMS
migration, so this only concerns accounts created from here on.

### Two things that are still not private

**`announcements` is readable by everyone regardless of `audience`.** Settled in
v3 and unchanged. `audience` is a targeting hint, never a secret.

**A member can write their own achievements.** `learning_achievements` is
`member_private`, so nobody else sees them and nothing is gated on them — but
the app writes them, which means the member could too. That is fine while badges
are decorative and private. It stops being fine the moment a badge appears on a
public profile or unlocks anything, and at that point they have to move
server-side. Flagging it now so nobody designs that screen without knowing.

---

## 21. Community in v4

`posts`, `comments` and `replies` are `member_public`: create, read everyone's,
**update and delete only your own**. In v3 they were `member_shared`, which also
granted table-level `update` to every member — so any signed-in account could
rewrite anybody's post body. That grant existed only to let one member increment
`likesCount` on another member's row.

### Likes — the count is a cache, the row is the truth

`likesCount` is **read-only from v4**. Write the like row and nothing else:

```ts
await tablesDB.createRow({
  tableId: reviewerCmsSchema.post_likes.tableId,
  rowId: ID.unique(),
  permissions: ownedRowPermissions(userId),
  data: { userId, postId },
})
// Do NOT update posts.likesCount. It is rejected.
```

Which leaves the question of what number to show. Three answers, by screen:

1. **Feed.** Render `post.likesCount` plus your own optimistic delta for likes
   made in this session. One number per row, no extra query, and it is right for
   the person looking at it — which is the only person who can tell.
2. **Post detail.** Count the like table directly when exactness matters:

   ```ts
   const likes = await tablesDB.listRows({
     tableId: reviewerCmsSchema.post_likes.tableId,
     queries: [Query.equal('postId', postId), Query.limit(1)],
     total: true,
   })
   likes.total   // exact
   ```
3. **Have I liked this?** The same query with your `userId` added, which the
   unique index backs.

The stored counter is rebuilt by `pnpm appwrite:bootstrap --recount` on the CMS
side. It drifts between runs and that is understood; it was never exact before
either, because two simultaneous likes both read the old value and wrote the
same new one. The difference is that a wrong number is now a cosmetic problem
rather than the reason anyone could edit anyone's words.

### Deleting — hide, do not remove

Delete is owner-only, which means a post author cannot remove the comments other
members left underneath. A hard delete would leave a thread pointing at nothing
that nobody in the app has permission to clear, ever.

So the app hides instead:

```ts
// Removing your own post, comment or reply
await tablesDB.updateRow({ /* ... */ data: { isDeleted: true } })
```

And **every community read must filter**:

```ts
Query.equal('isDeleted', false), Query.orderDesc('createdAt')
```

`idx_posts_visible`, `idx_comments_visible` and `idx_replies_visible` back
exactly that shape. A read without the filter is not an error — it just shows
deleted posts, which is the kind of bug that reaches a screenshot before it
reaches a bug report.

The CMS purges hidden rows properly, cascading the thread and its likes, with
`pnpm appwrite:purge-deleted --confirm`. Staff deleting a post from the
dashboard cascades immediately.

### Blocking

`user_blocks` is one-directional and private to whoever made it. The blocked
member is never told, and cannot read the table.

```ts
{ userId, blockedUserId, createdAt: new Date().toISOString() }
```

Filtering is the app's job, because Appwrite has no `NOT IN` across tables. Read
the block list once at session start, keep it in memory, and drop matching
`userId`s out of the feed and every thread as they render. It is a short list
and it does not change while a screen is open.

This is presentation, not security: a blocked member's posts are still readable
by the SDK, the same as everyone's. Blocking is about not having to see someone,
and that is worth saying plainly on the screen that offers it — it is not the
same promise as reporting them.

### Reporting has not changed

[Section 18](#18-reporting-content--flagged_content) still applies in full.
Blocking and reporting answer different questions — *I do not want to see this
person* and *somebody should look at this* — and an app that offers only one of
them will have members using it for both.

---

## 22. Deleting an account

Play requires a working account-deletion path for any app with accounts, and it
is checked at review. The app already reads
`EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID`; the Function behind it does
not exist yet, and the cascade it needs does — `deleteMemberData(userId)` in
`lib/appwrite/community.ts`.

That matters because deletion here is not one row. A member owns rows in
fourteen tables, and Appwrite has no foreign keys, so nothing cascades on its
own.

### What it removes

Everything on a `member_*` model carrying their `userId`: profile and public
profile, settings, answers, progress, sessions, history, achievements, daily and
weekly rollups, bookmarks, announcement reads, blocks — both the ones they made
and the ones made against them — and their community rows.

Their posts take their threads with them. Comments other members wrote under a
deleted member's post go too, because a thread hanging off a post that no longer
exists is not something anybody can read or moderate.

### What it keeps, and why

**`subscriptions` and `payments` stay.** They are what a chargeback, a refund
dispute or a tax return is answered from, Google keeps its own copy regardless,
and both are on `server_*` models the member could never reach. Retention here is
deliberate and named in the code so it is not mistaken for an oversight.

**Reports they filed stay, with the reporter detached** — `reportedBy` is set to
`deleted`. The moderation record is about the content, not about them, and
deleting it would mean anyone could clear their own reports by deleting their
account.

### The contract

The Function should derive `userId` from the session JWT, never from the body,
and follow the same `{ ok, message? }` shape as the others:

```jsonc
// 200
{ "ok": true }

// 4xx
{ "ok": false, "message": "We could not delete your account. Please try again." }
```

Order matters: call `deleteMemberData(userId)` **first**, then
`users.delete(userId)`. Deleting the auth account first would leave rows that no
session can ever reach again — the exact failure this whole document keeps
coming back to.

---

## 23. Upgrading the app from v3

### Order of operations

The CMS migration runs first. Until it has, `user_public_profiles` does not
exist and the v4 app has nothing to read; after it has, the v3 app can no longer
render other members' names. **That window is unavoidable**, so keep it short
and run the migration when the community is quiet.

The rest is backward-compatible: a v3 app keeps working for sessions, answers,
materials, questions, settings and billing throughout.

### The checklist

- [ ] **Author lookups** move from `user_profiles` to `user_public_profiles`,
      batched per feed page. [Section 20](#20-privacy--what-each-member-can-see)
- [ ] **Sign-up writes two rows.** Profile and public profile, in one step,
      failing together.
- [ ] **Profile editing writes both** when the change touches name, picture or
      member type.
- [ ] **Stop writing `likesCount`.** Anywhere. It is rejected now.
- [ ] **Like counts** come from the cached column plus a local delta, or from a
      `total: true` count on the like table. [Section 21](#21-community-in-v4)
- [ ] **`isDeleted: false`** on every read of `posts`, `comments`, `replies`.
- [ ] **Deleting your own content** becomes an update setting `isDeleted: true`,
      not a `deleteRow`.
- [ ] **New creates** carry `isDeleted: false` — it is required, and
      `newRowDefaults` supplies it.
- [ ] **Block and unblock** against `user_blocks`, with the list read once per
      session and applied while rendering.
- [ ] **Unread announcements** against `announcement_reads`, if you want the
      badge.
- [ ] **Re-copy `schema.ts`.** Everything above is typed, so most of this
      checklist becomes compile errors rather than something to remember.

### What did not change

Sections 1 through 9 are untouched. Questions, questionnaires, categories,
subjects, topics, materials, sessions, answers, progress, settings, search,
bookmarks, reporting, membership and billing all behave exactly as v3 described
them. If a screen does not render another member or touch the community, there
is nothing to do.

---

## 24. Billing in v5

Everything in this section is about **one screen**: Manage membership. Every
other screen gates on `hasActivePremium(profile)` and is unaffected by all of it.

### What actually changed, in one paragraph

Google Play does not cancel a subscription the moment a card is declined. It puts
it into a **grace period** and keeps retrying for up to 30 days, and the member
stays subscribed the whole time. Only when Google gives up does the subscription
go **on hold**, and that is where access stops. The server used to ignore both
messages, which meant a member whose card had stopped working kept full access
until a nightly sweep noticed the date had passed. Now each is a real state.

### The three new statuses

| `status` | Access? | What happened | What to say |
| --- | --- | --- | --- |
| `in_grace_period` | **Yes** | Their card was declined. Google is retrying | "We could not charge your card. Access continues until 12 Mar — update your payment method in Play" |
| `on_hold` | No | Google gave up retrying | "Your subscription is on hold. Update your payment method in Play to restore access" |
| `paused` | No | The member paused it themselves, in Play | "Your subscription is paused. Resume it in Play" |

**Grace period is the one that matters**, and it is the one most easily got
wrong. The member has done nothing wrong, has not cancelled, and still has
everything they paid for. A screen that reads any non-`active` status as "your
membership has ended" tells a paying customer they have been cut off, on the day
their card expired, which is a support ticket and often a refund.

All three are set only by Google's notifications. Nothing the app does produces
them.

### Do not gate on `status`

```ts
// WRONG — five different ways to be locked out, and one of them is a lie
if (subscription.status !== 'active') showPaywall()

// RIGHT — one question, one answer, and it checks the date too
if (hasActivePremium(profile)) openCategory(category)
```

`hasActivePremium` reads `user_profiles`, which is unchanged in v5: the server
folds the new states into the same five values it always had — grace period
becomes `active`, on hold becomes `expired`, paused becomes `cancelled`. That is
the whole reason v5 breaks nothing at runtime.

Read `subscriptions.status` **only** to write the sentence on the membership
screen. It is the difference between "we could not charge your card" and "your
membership ended", and nothing else in the app needs to know.

### Writing the membership screen

Three fields, in this order:

1. **`hasActivePremium(profile)`** — do they have access? This is the only
   question that gates anything.
2. **`status`** — *why* is it in that state? This picks the sentence.
3. **`autoRenewing`** — will it renew? This picks between "Renews on 12 Mar" and
   "Access ends 12 Mar".

`autoRenewing` false does not mean cancelled-and-gone. It means they turned off
renewal and keep what they paid for until `endsAt`. Saying "Cancelled" over a
membership with three weeks left is taking something back in the copy that the
system has not taken back in fact.

### The enum widened, so exhaustive code breaks

This is the only thing in v5 that will fail to compile:

```ts
// Was fine in v4. Now missing three keys.
const LABEL: Record<SubscriptionStatus, string> = {
  pending: '…', active: '…', expired: '…', cancelled: '…', refunded: '…',
}
```

Add the three, or make the map partial with a fallback:

```ts
const LABEL: Partial<Record<SubscriptionStatus, string>> = { /* … */ }
const label = LABEL[subscription.status] ?? 'Membership'
```

The fallback is worth having regardless. Play adds notification types over time,
and a status this app has never heard of should render a neutral line rather
than a blank one.

`user_activity_log.type` widened the same way with `subscription_refunded`. The
timeline renders `title` directly, so a fallback icon covers it.

### Nothing else about billing changed

The purchase flow in [section 6](#6-membership-and-google-play-billing) is the
same seven steps. Plans are read the same way, prices still come from Play,
`orderId` is still what makes a redelivered notification safe, and access codes
are untouched. The rest of v5's billing work — the missing index, the
notification inbox, closing a subscription an upgrade replaced — is server-side
and invisible from the app.

---

## 25. Upgrading the app from v4

Short, because almost nothing moved.

### Order of operations

The CMS migration is **additive** — a new table, new optional read-only columns,
new indexes, and three values appended to an enum. Nothing is renamed, narrowed
or removed.

That means there is no window to keep short and no coordination to arrange: **a
v4 app keeps working against the v5 schema, before and after the migration.**
Ship the app update whenever it suits you.

The one thing worth doing promptly is the migration itself, and that is a CMS
task rather than a mobile one. It is free while the billing tables are empty and
stops being free the moment somebody buys something.

### The checklist

- [ ] **Re-copy `schema.ts`.** Both v5 breakages are type errors, so this is what
      finds them for you.
- [ ] **Fix the two widened enums** — `SubscriptionStatus` and `ActivityType`.
      Add a fallback rather than an exhaustive map. [Section 24](#24-billing-in-v5)
- [ ] **Handle `in_grace_period` on the membership screen.** It still has access.
      Everything else in v5 is optional; this one is worth doing properly,
      because getting it wrong tells a paying member they have been cut off.
- [ ] **Set Play's obfuscated account identifier** when launching the billing
      flow, to a stable non-personal id for the member. The server checks it
      against the JWT. [Section 6](#6-membership-and-google-play-billing)
- [ ] **Pass `basePlanId` and `offerId`** through to the verification endpoint if
      your IAP library surfaces them. Optional, and only useful once a product
      has more than one base plan.
- [ ] **Do not read `billing_notifications`.** It is server-only and the call
      will 401.

### What did not change

Sections 1 through 5 and 7 through 23 are untouched. Questions, questionnaires,
categories, subjects, topics, materials, sessions, answers, progress, settings,
search, bookmarks, reporting, privacy, the community, account deletion and
permissions all behave exactly as v4 described them.

**If your app does not render a subscription row, there is nothing to do at all.**

---

## 26. What the mobile app has to build

The schema is done. This is what is not.

Two of the items below are unblocked and small; the rest wait on somebody
creating subscription products in Play Console. That ordering is not a
preference — a plan row cannot be authored until the Play product exists,
because `googleProductId` has to point at something real, and the app cannot
query a product that does not exist.

### The list

| # | Item | Size | Blocked on |
| --- | --- | --- | --- |
| 1 | Handle `in_grace_period` on the membership screen | Small | **Nothing** |
| 2 | Fix the two widened enums | Small | **Nothing** |
| 3 | Add a Play Billing client library | Medium | Nothing to *start*; untestable until 5 |
| 4 | Build the real checkout flow | Large | Items 3 and 5 |
| 5 | *(not ours)* Play products, plan rows, two Functions | — | Backend / Play account holder |

### 1. Grace period — do this first

It is the smallest item on the list and the only one where getting it wrong
costs money directly.

A declined card does **not** end a subscription. Play puts it in a grace period
and retries for up to 30 days, and the member stays subscribed throughout. Only
when Play gives up does it go on hold.

```ts
// The member still has access. Say so.
if (subscription.status === 'in_grace_period') {
  return `We could not charge your card. Access continues until ${endsAt} — update your payment method in Play.`
}
```

A screen that reads any non-`active` status as "your membership has ended" tells
a paying customer they have been cut off on the day their card expired. Full
detail in [section 24](#24-billing-in-v5).

### 2. The two widened enums

`SubscriptionStatus` gained three values and `ActivityType` gained one, so any
exhaustive map over either stops compiling. Prefer a fallback to an exhaustive
map — Play adds notification types over time, and a status the app has never
heard of should render a neutral line rather than a blank one:

```ts
const LABEL: Partial<Record<SubscriptionStatus, string>> = { /* … */ }
const label = LABEL[subscription.status] ?? 'Membership'
```

### 3. The Play Billing client

None of the candidates are managed by the Expo SDK, so none are version-pinned
by `npx expo install`. Pin whichever you pick and expect to re-test it on every
SDK upgrade.

`expo-iap` is the one to try first: actively released, declares an `expo` peer,
and pulls no extra native peer dependency. `react-native-iap` is equally current
but drags in `react-native-nitro-modules`. `expo-in-app-purchases` is legacy —
its version no longer tracks the SDK. `react-native-purchases` (RevenueCat)
works but duplicates the backend that already exists and charges a share of
revenue to do it.

Verify it builds against the current SDK and the New Architecture in a throwaway
branch **before** committing to it. It adds native code, so finding out late
costs a rebuild rather than an edit.

**Its config plugin adds the `com.android.vending.BILLING` permission** — do not
add that by hand.

**And rebuild the dev client.** A Metro reload will not pick up native code, and
the symptom of forgetting is a module that is simply undefined at runtime.

### 4. The checkout flow

Seven steps, and two of them are easy to leave out and never notice.

```
1. Read plans   Query.equal('isActive', true), Query.orderAsc('order')
2. Ask Play     queryProductDetails(plan.googleProductId)
3. Show PLAY'S price, not the stored one
4. launchBillingFlow()  — with the obfuscated account id set
5. On the purchase listener, POST to the verification Function:
      { purchaseToken, productId, orderId }
6. Server verifies with Google and acknowledges
7. Re-read user_profiles — isPremium is now true
```

**Step 3.** `subscription_plans.price` is a placeholder for admin reporting.
Play's `getFormattedPrice()` is localized, reflects regional pricing, and is the
amount actually charged. Showing the stored number risks advertising a price you
do not charge.

**Step 4 — set the obfuscated account identifier.** This is the app's one
security job in the whole flow. Pass a stable, non-personal id for the signed-in
member; the server compares what Play returns against the account in the JWT, so
a purchase token copied off another device grants nothing. Do **not** put the
email or the raw Appwrite user id in it — it is visible to Play and is not a
place for anything identifying. A hash or an opaque per-account id is the shape
you want.

**Step 5 sends three fields and no user id.** The server takes the member from
the JWT. A `userId` in the body would be a request to grant premium to whoever
the caller names.

#### The states that are not "success"

This is where checkout implementations usually go wrong, because the happy path
is the easy one:

| State | What to do |
| --- | --- |
| **Pending** | Play is still processing — common with cash payment methods. Do not grant access, do not show an error. Show "we will confirm shortly" |
| **Cancelled** | The member dismissed the sheet. Not an error. Return to the paywall silently |
| **Already owned** | They have an unconsumed purchase. Re-send it to the verification Function rather than starting a new flow |
| **Network failure *after* payment** | **The dangerous one.** They have been charged and the server has not heard. Retry verification on next launch — Play re-reports the purchase until it is acknowledged, so the token is still there |

That last row is why `applyGooglePurchase()` is safe to call repeatedly with the
same token: the second call updates the row the first one made. Retry freely.

### What the app must never do

Not new, but this is the section people will read, so it is worth repeating:

- **Never write `isPremium`, `premiumUntil`, `planName` or `subscriptionStatus`.**
  They are cached answers, maintained by the server. Access comes from a
  subscription or it does not come.
- **Never write `subscriptions` or `payments`.** The app has read on its own
  subscription row and nothing more. A member who could write here could extend
  their own membership.
- **Never gate a screen on `subscriptions.status`.** Use
  `hasActivePremium(profile)`, which checks the date as well as the flag. Read
  `status` only to write the sentence on the membership screen.
- **Never read `billing_notifications`.** It is `server_only` and the call will
  401.
- **Never ship a credential that could grant membership.** No service account,
  no API key. If a credential would let a client mark itself premium, it is in
  the wrong place. Product IDs are not secret and arrive from
  `subscription_plans` at runtime, so adding a plan needs no release.

### What the app is waiting on

None of this is mobile work, and item 4 cannot be finished without it:

| | Why it blocks | Who |
| --- | --- | --- |
| Play Console products, **activated** | A product left in draft is invisible to the app. Product IDs are permanent and cannot be reused after deletion, so the name is worth five minutes now | Play account holder |
| Plan rows in `subscription_plans` | **Zero rows today**, verified against the live database. The paywall renders whatever is in this table, so a finished checkout has nothing to sell | Backend / dashboard |
| Purchase verification Function | Step 5 has nowhere to post. Its ID arrives as `EXPO_PUBLIC_APPWRITE_PURCHASE_VERIFY_FUNCTION_ID`, registered in `lib/appwrite.ts` beside the three that already exist | Backend |
| RTDN webhook + Pub/Sub | Renewals, cancellations and refunds never arrive. Memberships would work once and then quietly stop | Backend |
| License testers enrolled | Testing needs a Play-delivered build and an enrolled account. **Sideloading cannot test billing** | Play account holder |

Both Functions wrap logic that is already written and working. This is wiring,
not a build — `google-play-billing-v2.md` carries the contract they have to meet.

### Also outstanding, not billing

Three backend items affect app screens, tracked in
[section 19](#19-where-each-backend-request-stands):

- **Password recovery** needs SMTP and a redirect URL configured. Console work;
  no app change substitutes for it.
- **Premium question access.** `questions` is still `app_readonly`, so any
  signed-in member can read the entire paid bank — prompt, choices,
  `answerIndex`, explanation. The client-side `Query.equal('isFree', true)`
  filter stops the app leaking it; it does not stop anyone who goes looking.
  **Worth pairing with the billing work**, because a paywall over content that is
  already readable protects revenue on paper only.
- **Access code redemption** needs a Function wrapper; `redeemAccessCode()` is
  written.

---

## 27. Upgrading the app from v5

Re-copy `schema.ts`. That is the entire migration.

v6 added four read-only columns the app never reads and moved four indexes onto
them. Nothing was renamed, removed or narrowed; no permission changed; no query
you have written is affected.

If you skipped v5, its two compile-time breaks are still waiting for you, and
they are items 1 and 2 of
[section 26](#26-what-the-mobile-app-has-to-build).

### What did not change

Everything else. Sections 1 through 25 describe v6 as accurately as they
described v5, with two edits: [section 6](#6-membership-and-google-play-billing)
documents the hash columns, and
[section 15](#15-indexes--what-you-may-filter-and-order-on) lists the indexes on
their corrected columns.
