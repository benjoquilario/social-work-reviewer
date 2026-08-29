# What the Mobile App Needs From the Backend

Written from the mobile side, for whoever owns the CMS repo and the Appwrite
project. Companion to `MOBILE-SCHEMA-NOTES-v4.md` — that document explains how
the schema works, this one lists what is missing from it. Section references
below are to the notes; they kept their numbers across v2, v3 and v4.

**The rule this document exists for:** the app treats `lib/schema.ts` as
read-only. Every table, column, enum option and index in it is yours. When the
app needs one that does not exist, it cannot add it — it can only ask, which is
what this is.

Each item below is written the same way:

- **Ask** — the specific thing to build or change.
- **Why** — what breaks or cannot ship without it.
- **Contract** — the exact shape the app will call or read. Where a Function is
  involved, this is the request and response the app is already written to
  expect, so matching it means no mobile change is needed.
- **Today** — what the app does right now, with file references.
- **Done when** — how we both know it is finished.

---

## Summary

> **Round one answered in v3**, **round two answered in v4.** Six of the
> original ten are done; both items round two raised are closed, and v4 fixed a
> PII leak neither round had spotted. The app is built against all of it.
> The four still open are Appwrite Functions or console work, which no schema
> edit could have delivered — [round three](#round-three--what-is-still-open)
> at the bottom is the current ask.

| #  | Ask | Kind | Blocks | Status |
| -- | --- | ---- | ------ | ------ |
| 1  | Play purchase verification Function + RTDN handler | Function | Taking any money at all | **Open — P0** |
| 2  | Password recovery: SMTP + allowed redirect URL | Appwrite config | Locked-out members | **Open — P0** |
| 3  | Premium question access Function | Function | Paid questions are readable by anyone signed in | **Open — P1** |
| 4  | Indexes on the eight tables that have none | Schema | Community feed, announcements | ✅ Done — it was nine |
| 5  | `flagged_content.contentType` — add `question` | Schema | Reporting a wrong answer key | ✅ Done, with `material` |
| 6  | A bookmarks table | Schema | A setting the app already ships | ✅ Done — `user_bookmarks` |
| 7  | Access code redemption Function | Function | Institutional / bulk sales | **Open — P2** |
| 8  | Fulltext indexes | Schema | Search, anywhere in the app | ✅ Done — six |
| 9  | Confirm `announcements` publishing is live | Ops | The Updates tab is hardcoded | ✅ Confirmed — table empty |
| 10 | Row read permission on `subscriptions` | Schema/ops | Real "Manage membership" screen | ✅ Done |

---

## 1. Play purchase verification Function + RTDN handler — **P0**

### Ask

Expose the server-side purchase flow from §6 of the v2 notes as an Appwrite
Function the app can execute, and stand up the Real-Time Developer
Notifications handler behind it.

The notes already name the two server helpers — `applyGooglePurchase(...)` and
`applyGoogleNotification(...)`. If those exist in the CMS repo, this is mostly
wiring; if they are aspirational, this is the largest item on the list.

### Why

There is no way to pay us. The app has no billing dependency at all, `premium.tsx`
lists real plans out of `subscription_plans`, and every button on it is a dead
end. Nothing else in this document matters as much.

The mobile side owns steps 1–4 of the §6 flow (read plans, query Play for the
localized price, launch the billing flow, hand the token over). **Steps 5, 6 and
the RTDN handling are yours and cannot be moved:**

- **Step 5 — verify.** A purchase token posted by a client is a claim, not a
  fact. It has to be checked against `purchases.subscriptionsv2.get` before it
  grants anything, or anyone can grant themselves premium with a curl.
- **Step 6 — acknowledge, within three days.** Google automatically refunds any
  purchase not acknowledged inside 72 hours. This is a deadline with money
  attached, not a nicety.
- **RTDN** — renewals, cancellations, expiries and refunds. Without it,
  `endsAt` never moves and a lapsed subscription keeps working until someone
  notices by hand.

### Contract

Env var the app will read: `EXPO_PUBLIC_APPWRITE_PLAY_PURCHASE_FUNCTION_ID`.

Called with the app's session, so the Function derives `userId` from the JWT
rather than trusting a field in the body:

```jsonc
// POST /  — request
{
  "purchaseToken": "hgfd...",   // from Play's PurchasesUpdatedListener
  "productId": "premium_yearly",
  "orderId": "GPA.0000-0000-0000-00000"
}
```

```jsonc
// 200 — response, verified and granted
{
  "ok": true,
  "subscription": {
    "planName": "Yearly",
    "status": "active",
    "endsAt": "2027-03-12T00:00:00.000Z",
    "autoRenew": true
  }
}

// 4xx — response, rejected
{ "ok": false, "message": "That purchase could not be verified with Google." }
```

`{ ok, message? }` with a human-readable `message` matches the two Functions the
app already calls (`lib/auth.ts:631`, `lib/learning-content.ts:351`), and the app
treats `statusCode >= 400 || ok === false` as failure and shows `message`
verbatim. Please write those messages for a member, not for a log.

### Today

Nothing. `app/premium.tsx` reads plans and stops.

### Done when

A test account can buy through Play, the app re-reads `user_profiles` and sees
`isPremium: true`, `subscriptions.isAcknowledged` is true within seconds, and a
cancellation RTDN leaves access intact until `endsAt` (§6 — cancelling is not
losing access).

---

## 2. Password recovery — **P0**

### Ask

Two things in the Appwrite console:

1. A real SMTP provider configured on the project, so recovery mail actually
   sends.
2. The recovery redirect URL added to the project's allowed platforms/URLs — the
   same treatment `EXPO_PUBLIC_APPWRITE_EMAIL_REDIRECT_URL` already has for
   verification.

Tell us the URL to use and the app builds the rest.

### Why

There is no password reset in the app — no `createRecovery` call anywhere, and
no "Forgot password" on `app/(auth)/login.tsx`. A member who forgets their
password is locked out permanently, and the only remedy today is someone
resetting it by hand in the dashboard.

This is the cheapest item on the list and the one whose absence is silently
costing the most users, because a locked-out member does not file a bug — they
uninstall.

### Contract

Standard Appwrite `account.createRecovery` / `account.updateRecovery`. The app
handles both screens; it needs the redirect URL and working mail.

### Done when

A member can request a reset from the login screen, receives the mail, and signs
in with the new password.

---

## 3. Premium question access Function — **P1**

### Ask

The same thing `EXPO_PUBLIC_APPWRITE_PREMIUM_MATERIAL_FUNCTION_ID` does for
`learning_materials`, but for `questions` — and then lock `questions` down.

### Why

§9 of the notes says it plainly: *"Gate on the server or in an Appwrite Function
for anything that matters. Client-side checks are UX, not security."*

`questions` is `app_readonly`. Any signed-in member — including one who has
never paid — can open the SDK and read every row in the paid question bank:
prompt, choices, answer index and explanation. For a board-exam reviewer, that
table *is* the product.

The app has already been tightened as far as a client can go: reads now ask for
`Query.equal("isFree", true)` when the viewer is not entitled, so paid questions
are no longer delivered unasked (`lib/content/questions.ts`). That stops the app
from leaking. It does not stop anyone who goes looking.

A material-side gate already exists and works. Questions have no equivalent.

### Contract

Env var: `EXPO_PUBLIC_APPWRITE_PREMIUM_QUESTIONS_FUNCTION_ID`.

```jsonc
// POST /  — request (one of setId or categoryId)
{ "setId": "abc123" }
{ "categoryId": "def456" }
```

```jsonc
// 200 — entitled
{ "ok": true, "questions": [ /* full question rows, same shape as the table */ ] }

// 403 — not entitled
{ "ok": false, "message": "This paper is part of the membership." }
```

The Function should decide with `hasActivePremium` against `subscriptions` (the
source of truth per §6), not against the cached `user_profiles.isPremium`.

Once it is deployed, `questions` moves to `server_only` — or keeps `app_readonly`
with a `Query.equal("isFree", true)`-shaped restriction if Appwrite can express
that. The app will read free samples directly and everything else through the
Function.

### Today

`lib/content/questions.ts` reads the table directly and restricts by `isFree`
client-side. Same pattern as materials before their Function existed.

### Done when

A free account querying `questions` with the raw SDK gets back only rows where
`isFree` is true.

---

## 4. Indexes on the eight tables that have none — **P1**

### Ask

`lib/schema.ts` declares `indexes:` for 20 tables. The last declaration belongs
to `user_weekly_reports` (around line 3617). **Everything after it has none:**

| Table | What the app queries on it |
| --- | --- |
| `learning_achievements` | `userId` |
| `posts` | `Query.orderDesc("createdAt")` + cursor paging (`lib/community.ts:505`) |
| `comments` | `Query.equal("postId")`, `Query.orderAsc("createdAt")` (`lib/community.ts:1212`, `533`) |
| `replies` | `Query.equal("commentId")`, `Query.orderAsc("createdAt")` |
| `post_likes` | `userId` + `postId` together, to show like state |
| `comment_likes` | `userId` + `commentId`, and `userId` + `replyId` — the table covers both |
| `announcements` | `publishedAt` desc, `expiresAt` window (once #9 lands) |
| `flagged_content` | dashboard-side triage only |

### Why

Appwrite needs an index to filter or order on a column. Without one these reads
are a full collection scan at best, and `Index not found` at worst — and the
failure arrives when the table gets big, which is to say in production and not
in testing.

The community feed is the most exposed: it orders every post by `createdAt` and
pages with a cursor, on a table with no index at all.

### Contract

Suggested, following the conventions already in the file:

```ts
posts:         [{ key: "idx_posts_created",    type: "key",    columns: ["createdAt"], orders: ["DESC"] }]
comments:      [{ key: "idx_comments_post",    type: "key",    columns: ["postId", "createdAt"], orders: ["ASC", "ASC"] }]
replies:       [{ key: "idx_replies_comment",  type: "key",    columns: ["commentId", "createdAt"], orders: ["ASC", "ASC"] }]
post_likes:    [{ key: "idx_post_like_member", type: "unique", columns: ["userId", "postId"] }]
comment_likes: [
  { key: "idx_comment_like_member", type: "key", columns: ["userId", "commentId"] },
  { key: "idx_reply_like_member",   type: "key", columns: ["userId", "replyId"] },
]
announcements: [{ key: "idx_ann_published",    type: "key",    columns: ["publishedAt"], orders: ["DESC"] }]
learning_achievements: [{ key: "idx_achievement_member", type: "key", columns: ["userId", "earnedAt"], orders: ["ASC", "DESC"] }]
```

`post_likes` is `unique` on purpose — it makes double-liking impossible at the
database rather than in a race between two taps. `comment_likes` cannot be,
because one row covers either a comment or a reply and the unused column is
blank; a unique pair would collide on the first two blanks. If you want the same
guarantee there, the cleaner fix is a single `targetId` + `targetType` pair
instead of two nullable columns — your call, the app reads it either way.

### Today

Working, because the tables are small. That is the only reason.

### Done when

`pnpm appwrite:inspect` reports no missing indexes, and the community feed's
query plan uses one.

---

## 5. `flagged_content.contentType` — add `question` — **P1**

### Ask

Add `"question"` to the enum. It is currently `["post", "comment", "reply"]`.
Adding `"material"` at the same time is worth considering for the same reason.

### Why

**This is the highest-value schema change on the list.**

A reviewer app's entire credibility is the answer key. When a member spots a
wrong answer, a bad explanation, or a typo that changes the meaning of an item,
there is currently no route for them to tell us — the report flow exists, but it
can only be pointed at community posts.

So today the feedback goes to a Facebook group, or a one-star review, or
nowhere. Meanwhile the wrong item stays wrong and every member who reaches it
loses a little more trust in the rest of the bank.

The reporting infrastructure already exists and works (`lib/moderation.ts`,
`components/community/report-dialog.tsx`). This is one enum option away from
being a content quality pipeline: members find your errors for you, the
dashboard triages them, encoders fix them.

The reasons list will need one more preset on the app side — "The answer is
wrong" — which is our change, not yours.

### Contract

```ts
options: ["post", "comment", "reply", "question"]
optionLabels: { ..., question: "Question" }
```

`contentId` holds the question's `sku` rather than its `$id` — gotcha 5, the sku
is the stable identity and the one an encoder can search for.

### Done when

A member can report a question from inside a session, and it lands in the same
moderation queue.

---

## 6. A bookmarks table — **P2**

### Ask

Either add a table for saved questions, or remove `"bookmarked"` from
`user_settings.questionSource`. Both are fine. The current state is not.

### Why

`user_settings.questionSource` offers `["all", "unanswered", "incorrect",
"bookmarked"]`. The app renders all four
(`components/settings/study-preferences-section.tsx:44`). Three of them work.

`"bookmarked"` cannot, because no table stores a bookmark. The app falls through
to returning **every** question (`lib/session/question-pool.ts:161`) — so a
member selects "Only bookmarked ones", gets the entire paper, and is given no
indication anything went wrong. A setting that silently does the opposite of
what it says is worse than a setting that is not there.

Separately: "save this question for later" is a feature members of every
reviewer app expect, and it is the natural companion to the "incorrect" filter
that already works well.

### Contract

Proposed, following the conventions of the other member tables:

```ts
user_bookmarks: defineTable({
  tableId: "user_bookmarks",
  accessModel: "member_private",
  domain: "members",
  fields: [
    { key: "userId",      kind: "string",   required: true,  size: 64 },
    { key: "questionSku", kind: "string",   required: true,  size: 64 },
    { key: "categoryId",  kind: "string",   required: false, size: 64 },
    { key: "createdAt",   kind: "datetime", required: true },
  ],
  indexes: [
    { key: "idx_bookmark_member", type: "unique", columns: ["userId", "questionSku"] },
    { key: "idx_bookmark_recent", type: "key",    columns: ["userId", "createdAt"], orders: ["ASC", "DESC"] },
  ],
})
```

`member_private` so a member only ever sees their own, and the unique index so
bookmarking twice is a no-op rather than a duplicate. `questionSku` rather than
`$id` for the same reason as #5.

Keep the required-column count low if you can — every required column is one the
app must send on create with no stored default (gotcha 3).

### Today

The option is shipped and broken. If this table is not coming, say so and we
will pull the option from the picker in the next build.

---

## 7. Access code redemption Function — **P2**

### Ask

Expose access code redemption as a callable Function.

### Why

`access_codes` is `server_only` — correct, since a readable code table is a
free-premium table. But it means redemption is impossible from the client, so
the feature described in §6 of the notes does not exist for members.

Schools and review centres buying seats in bulk is the natural sales motion for
a board-exam reviewer, and it is the one channel that does not hand Google 15%.

### Contract

Env var: `EXPO_PUBLIC_APPWRITE_ACCESS_CODE_FUNCTION_ID`.

```jsonc
// POST /  — request
{ "code": "PSWRC-2026-A1B2" }
```

```jsonc
// 200
{ "ok": true, "planName": "Yearly", "endsAt": "2027-03-12T00:00:00.000Z" }

// 4xx
{ "ok": false, "reason": "expired", "message": "That code expired on 1 March." }
```

§6 asks for the four failure reasons to stay distinct — *not recognised*, *no
longer active*, *expired*, *already used* — so please send `reason` as a stable
machine value alongside the human `message`. The app shows the message; the
reason lets it pick the right recovery action ("ask your review centre for a new
code" reads very differently from "you have already used this one").

### Done when

A member can type a code in the app and premium turns on.

---

## 8. Fulltext indexes — **P2**

### Ask

Fulltext indexes on the columns worth searching:

- `questions.prompt`
- `learning_materials.title`, and `content` if the size allows
- `subjects.name`, `topics.title`
- `exam_categories.title`

### Why

There is no search anywhere in the app — zero `Query.search` calls — and it
cannot be added, because `CmsIndexType` declares `"fulltext"` and **no table
defines one**.

For a bank of several hundred questions and a growing library of lessons, "I
remember a question about the Social Work Law but I cannot find it" has no
answer today except scrolling. Search is usually the second-most-used feature in
a reference app, after the thing it references.

### Done when

`Query.search("prompt", "...")` returns results instead of an error.

---

## 9. Confirm `announcements` publishing is live — **P2**

### Ask

Confirm the dashboard can publish announcements and that rows exist, then tell
us the intended audience-filtering rule.

### Why

The Updates tab in the app is **a hardcoded TypeScript file**
(`data/news-data.ts`) — six fixed items with `dateLabel: "Today"` and "Mar 19,
2026", permanently stale, unchangeable without an app release.

Meanwhile `announcements` is `app_readonly`, has `title`, `content`,
`publishedAt`, `expiresAt`, and an `audience` enum that already models exactly
the right targets — `all`, `free`, `premium`, `expired`, plus every `memberType`.
Not one line of app code touches it.

This is the biggest ratio of *already built* to *not used* in the whole project.
It is also the only channel we have for telling a free member why to subscribe,
which makes `audience: "expired"` — "members whose premium ran out" — arguably
the most valuable row in the database.

### Contract

The app will read directly (no Function needed) and filter client-side:

```ts
Query.lessThanEqual("publishedAt", now)
Query.orderDesc("publishedAt")
// then drop rows whose expiresAt has passed, and rows whose audience
// does not match this member's membership state or memberType
```

Two things to confirm:

1. **The index from #4** (`publishedAt` DESC), or the ordering has nothing to
   stand on.
2. **Audience filtering is client-side and therefore not private.** Because the
   table is `app_readonly`, every member can read every row regardless of
   `audience` — a free member can see the premium announcement if they look. That
   is fine for "New questionnaires added"; it is not fine for anything
   containing a discount code or a member's name. Please write announcements on
   that assumption, or tell us if you would rather this go through a Function.

### Done when

Announcements published in the dashboard appear in the app, and
`data/news-data.ts` is deleted.

---

## 10. Row read permission on `subscriptions` — **P3**

### Ask

Confirm that when the server creates a `subscriptions` row it grants the owning
member read permission on it.

### Why

`subscriptions` is `server_private` — row security on, no table-level grants —
which means a member *can* read their own row if the row carries the grant. The
app does not currently read it at all.

Everything the app knows about membership comes from the four cached fields on
`user_profiles`. §6 is explicit that those are a cache and `subscriptions` is the
truth, and we have already seen the two disagree: a lapsed subscription leaves
`isPremium: true` until a sweep clears it, which is why the app now gates on
`hasActivePremium` (flag **and** date) rather than the flag.

With read access to the member's own row, a proper "Manage membership" screen
becomes possible — real plan, real `endsAt`, `autoRenew`, `source`, and the
correct wording for the state they are actually in. §6 makes that distinction
matter: with `autoRenew` false the honest label is "Access ends 12 Mar", not
"Cancelled", because they paid for that period and still have it.

### Contract

Read-only, the member's own rows:

```ts
Query.equal("userId", userId), Query.orderDesc("startsAt"), Query.limit(1)
```

Nothing is written by the app — §10 lists `subscriptions` under *never written
by the app*, and that stays true.

### Done when

A signed-in member's own subscription row comes back from the SDK.

---

## Smaller notes

- **`.env.example` is missing an entry.** `lib/appwrite.ts:51` reads
  `EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID`, and `.env.example` does not
  list it. Anyone setting up from the example file gets a delete-account button
  that reports "not configured". This one is a mobile-side fix and is noted here
  only so it does not get raised twice.

- **Server-side aggregates.** Anything comparing one member to another —
  leaderboards, "you are in the top 20%", a national average score — cannot be
  built in the app. `user_progress`, `user_daily_activity` and
  `user_weekly_reports` are all `member_private`, so a query returns only the
  caller's rows, with no error to signal the rest were withheld. If ranking is
  ever wanted, it needs a Function or a precomputed public table. Not requesting
  one yet — flagging it so nobody plans a leaderboard around tables that cannot
  produce it.

- **Diagnostics.** `app/diagnostics.tsx` probes every readable table and reports
  a 401 with the table named. If a member reports a blank screen, that output
  says whether it is our bug or a table permission that drifted, which is faster
  than either side reading the other's code. Section 11 of the v2 notes has the
  same split.

---

## Round two — answered in v4

Everything schema-side from the first round landed in v3 and the app now builds
on all of it: bookmarks, question reporting, search, the membership read, and
the Updates tab. Four items from that round are still open, and two new ones
came out of the v3 reply.

> **Closed in v4.** Both new items below were fixed. `member_shared` is gone —
> `posts`, `comments` and `replies` are `member_public`, no member can edit
> another's words, and it needed no Function: `likesCount` became a read-only
> reconciled cache instead. v4 also closed a leak neither round had asked about
> (`user_profiles` was exposing every member's email and PRC licence number to
> every signed-in account) and added `user_public_profiles`, `user_blocks` and
> `announcement_reads`. `subscription_plans` is still empty.

### Still open from round one

**#1 Play purchase verification.** v3 says `applyGooglePurchase()` and
`applyGoogleNotification()` are real, implemented and live in the CMS today —
they verify against Play, acknowledge, write `subscriptions` and `payments`, and
re-sync the cached membership fields. What is missing is only the Appwrite
Function wrapping them and the HTTP endpoint Google posts notifications to. The
contract in [section 1](#1-play-purchase-verification-function--rtdn-handler--p0)
is confirmed as the right shape; build to it and no mobile change is needed
beyond the billing library itself.

**#2 Password recovery.** Console work: SMTP plus an allowed redirect URL. Still
the cheapest item on either list and still the one whose absence is quietly
costing the most users.

**#3 Premium question access.** Confirmed exposed and unfixed. v3 explains the
ordering constraint clearly — Appwrite cannot express *"readable only where
`isFree` is true"*, so locking `questions` before the Function exists would take
the free samples down with the paid ones. Function first, lockdown second. The
app keeps its client-side `Query.equal('isFree', true)` restriction meanwhile,
including on the new search path.

The alternative v3 raises is worth a decision rather than a default: **split the
answer key off the question** — leave `prompt`, `choices` and `isFree` on a
readable table, move `answerIndex` and `explanation` to a `server_only`
companion. That protects the part that is actually the product with no Function
on the read path. Its cost is offline scoring: a session that cannot see the
answer cannot mark itself. **Our position from the app side:** offline is not
built today and the Function is the cleaner model, so we would rather wait for
the Function than split the table — but if the Function is months away, the
split buys real protection now and offline can be designed around it.

**#7 Access code redemption.** Same shape as #1 — `redeemAccessCode()` exists
and already returns the four distinct failure reasons; only the Function
wrapper is missing.

### New — raised by v3

**A. `subscription_plans` has zero rows.** The premium screen reads real plans
out of it and renders nothing, which means the paywall currently has no offer
behind it *regardless of billing*. Somebody has to author the plans in the
dashboard, and that is worth doing before #1 rather than after: it is the only
one of these a non-engineer can unblock, and until it happens no amount of
billing work produces a screen anybody can buy from.

**B. The `member_shared` hole should not stay open.** v3 names it as the largest
known risk in the permission model and leaves it unclosed: `posts`, `comments`
and `replies` grant table-level `update` to every member, because `likesCount`
is a denormalised counter one member increments on another member's row and
Appwrite cannot scope a grant to a single column.

The side effect is that **any signed-in member can rewrite any other member's
post body.** Not read — rewrite. Nothing in the app offers it, so it needs the
SDK and intent, but a community feature where anyone can silently edit anyone
else's words is a different kind of problem from a content leak: it is
unattributable, and the author is the last to know.

The fix v3 states is the right one and is the same one already used elsewhere:
move the counter into a Function — there is a precedent in
`EXPO_PUBLIC_APPWRITE_COMMUNITY_POST_LIKE_FUNCTION_ID` — then drop these three
tables to `member_public`. **We would put this above #7 and arguably above #3**,
because the exposure is a write rather than a read, and because a like-counter
Function is a smaller build than either.

### Confirmed and closed

- **Audience is not privacy.** Agreed on both sides. `announcements` is
  `app_readonly`, every member can read every row whatever its `audience`, and
  the app filters for relevance only. The Updates tab is built on that
  assumption — nothing with a discount code or a member's name in it should be
  written as an announcement. If a genuinely private one is ever needed, we will
  ask for it then.
- **`.env.example`.** Ours; fixed on our side.
- **Server-side aggregates.** Still impossible on `member_private` tables, and
  `user_bookmarks` joins that list. Nothing has been planned around a
  leaderboard.

---

## Round three — what is still open

v4 closed everything schema-side. The app now writes both profile rows on
sign-up, reads bylines from `user_public_profiles`, filters `isDeleted` on every
community read, soft-deletes instead of deleting, blocks, and tracks read
announcements server-side.

What remains has not changed since round one, and it is all Functions and
console work:

| # | Ask | Why it is still blocking |
| - | --- | --- |
| 1 | **Play purchase verification Function + RTDN** | No way to pay us. The CMS helpers exist; the Function wrapper and the notification endpoint do not. |
| 2 | **Password recovery** (SMTP + redirect URL) | A member who forgets their password is locked out permanently. Cheapest item on any of these lists. |
| 3 | **Premium question access Function** | The paid question bank is still readable in full by any signed-in account. |
| 7 | **Access code redemption Function** | Institutional sales have no path. |
| 22 | **Account deletion Function** | New in v4's section 22 — see below. |
| A | **Author the `subscription_plans` rows** | Still zero. The premium screen has no offer to show regardless of #1. |

### New: the account-deletion Function (v4 §22)

`EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID` has been read by the app since
before v3 and the Function behind it has never existed, so the delete-account
button in Settings currently fails with "not configured".

**Google Play requires a working account-deletion path for any app with
accounts, and it is checked at review.** That makes this a launch blocker
alongside #1 rather than a nice-to-have — an app that cannot delete an account
does not get published, so it now ranks with billing rather than below it.

v4 says `deleteMemberData(userId)` already exists in the CMS and handles the
fourteen-table cascade. The remaining work is the same wrapper as #1 and #7,
with the ordering constraint v4 names: **`deleteMemberData(userId)` first, then
`users.delete(userId)`** — deleting the auth account first strands every row
behind a session that can never exist again.

Contract, matching the others:

```jsonc
// 200
{ "ok": true }
// 4xx
{ "ok": false, "message": "We could not delete your account. Please try again." }
```

`userId` from the session JWT, never the body.

### One thing to keep in mind on the CMS side

v4's §20 makes the boundary explicit and it is worth restating, because the next
mistake of this kind will look just as reasonable as the last one:

**Adding a column to `user_public_profiles` publishes it to every member of the
app.** Not to the screens that render it — to everyone with a session and an
SDK. The three that are there now (display name, avatar, member type) are the
whole set the forum needs. A premium badge, a streak count, a school name or a
"member since" date would each look harmless on a post and each be a queryable
list of the entire membership.

`user_profiles` is private by default now, and that is where anything else goes.
