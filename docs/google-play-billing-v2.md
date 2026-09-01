# Google Play Billing — v2 (backend handoff)

**For:** the dashboard / CMS backend
**From:** the mobile app
**Against:** `MOBILE-SCHEMA-NOTES-v5.md`

Supersedes `google-play-billing.md`, which was written against v4 and before the
v5 billing audit. Everything here is checked against the v5 `schema.ts` currently
in the mobile repo.

**The short version:** no schema work is left. Two Appwrite Functions and a set of
plan rows stand between the app and taking money.

---

## Contents

1. [What changed since v1](#1-what-changed-since-v1)
2. [Who owns what](#2-who-owns-what)
3. [Tables — nothing to create](#3-tables--nothing-to-create)
4. [Rows — author the plans](#4-rows--author-the-plans)
5. [Function 1 — purchase verification](#5-function-1--purchase-verification)
6. [Function 2 — the RTDN webhook](#6-function-2--the-rtdn-webhook)
7. [Credentials the backend needs](#7-credentials-the-backend-needs)
8. [What the app already does](#8-what-the-app-already-does)
9. [How we know it works](#9-how-we-know-it-works)
10. [Also on the queue](#10-also-on-the-queue)

---

## 1. What changed since v1

The v5 audit found and fixed things v1 did not know about. Three matter to this
handoff:

- **`subscriptions.purchaseToken` had no index.** It is the column both server
  handlers look rows up by, and the only identifier a renewal notification
  carries. Without it the first real purchase would have failed *after the
  member paid*. `idx_subscription_token` now exists and is **unique**, so
  replaying a purchase updates one row instead of granting two.
- **Payment-failure states are real now.** Google does not cancel on a declined
  card — it retries for up to 30 days. Three new statuses cover it.
- **`billing_notifications` exists.** Every message Google sends is recorded, which
  is what makes a redelivered notification a no-op.

The mobile app has already been updated for all of this. Nothing below is
blocked on us.

---

## 2. Who owns what

| Concern | Owner |
| --- | --- |
| Play Console products, prices, base plans | **Backend / whoever holds the Play account** |
| Service account, API access, Pub/Sub topic | **Backend** |
| The two Functions below | **Backend** |
| Authoring plan rows | **Backend / dashboard** |
| Play Billing client, checkout UI, membership copy | Mobile |
| Entitlement checks | Mobile — already done, no changes coming |

---

## 3. Tables — nothing to create

All five billing tables exist in v5 with columns and indexes in place.

| Table | Access model | Holds |
| --- | --- | --- |
| `subscription_plans` | `app_readonly` | What can be bought |
| `subscriptions` | `server_private` | One purchased period — the source of truth |
| `payments` | `server_only` | One row per charge |
| `access_codes` | `server_only` | Redeemable codes |
| `billing_notifications` | `server_only` | Every message Google sent |

### `subscriptions` columns

```
userId  planId  planName  status  startsAt  endsAt  autoRenew  source
amountPaid  currency  accessCodeId
purchaseToken  linkedPurchaseToken  orderId  productId  basePlanId  offerId
obfuscatedAccountId  autoRenewing  isAcknowledged  acknowledgedAt
latestNotificationType  latestNotificationAt  cancelledAt  note  createdAt
```

### `subscriptions` indexes

| Index | Type | Columns | Why |
| --- | --- | --- | --- |
| `idx_subscription_token` | **unique** | `purchaseToken` | Renewal lookups; uniqueness makes replay safe |
| `idx_subscription_order` | key | `orderId` | One row per charge |
| `idx_subscription_linked_token` | key | `linkedPurchaseToken` | Finding the subscription an upgrade replaced |
| `idx_subscription_acknowledged` | key | `status`, `isAcknowledged` | **The refund alarm** — see §9 |
| `idx_subscription_user_status` | key | `userId`, `status` | The member's own row |
| `idx_subscription_expiry` | key | `status`, `endsAt` | The nightly expiry sweep |

**Nobody needs to create or alter a table.**

---

## 4. Rows — author the plans

`subscription_plans` has **zero rows**, verified against the live database. The
premium screen renders whatever is in this table, so a finished checkout would
still have nothing to sell.

Order matters: the Play Console product must exist first, because
`googleProductId` has to point at something real.

| Field | Required | Notes |
| --- | --- | --- |
| `name` | ✅ | Card title, e.g. "Premium Monthly" |
| `googleProductId` | ✅ | **Exact** Play Console product ID. Uniquely indexed |
| `price` | ✅ | Whole pesos — `299` = ₱299. A placeholder; Play's price is charged |
| `durationDays` | ✅ | `30` monthly, `365` yearly |
| `currency` | | Default `PHP` |
| `isRecurring` | | Default `true` |
| `features` | | String list, rendered as bullets |
| `order` | | Default `1`. Card order |
| `isPopular` | | Default `false`. Badges one card |
| `isActive` | | Default `true`. Retires a plan; existing subscribers keep working |
| `code`, `description` | | Optional |
| `subscriberCount` | | Server-maintained — do not set by hand |

`googleBasePlanId` is optional and only useful once a product has more than one
base plan.

---

## 5. Function 1 — purchase verification

Wraps `applyGooglePurchase()`, which is already written. This is the wrapper, not
the logic.

### Contract

```
POST  (Appwrite Function execution, authenticated)

in    { purchaseToken, productId, orderId }
out   { ok: true, subscription }
      { ok: false, message }

userId  from the JWT — never from the body
```

### It must

1. **Verify** the token against `purchases.subscriptionsv2.get`. A token posted by
   a client is a claim, not a fact — anyone can post one.
2. **Check `obfuscatedExternalAccountId`** from Play's response against the JWT's
   user. Store it in `subscriptions.obfuscatedAccountId`. This is what stops one
   member's purchase being redeemed on another account.
3. **Acknowledge** the purchase with Google before returning.
4. Write `subscriptions` and `payments`, and re-sync the cached fields on
   `user_profiles`.
5. Persist `basePlanId`, `offerId`, and `linkedPurchaseToken` when
   `subscriptionsv2.get` returns them — the columns are there.

### Acknowledge is a deadline

**Google automatically refunds any purchase not acknowledged within three days.**
`isAcknowledged` and `acknowledgedAt` record that it happened.

### Then

Give us the Function ID. The app will read it as
`EXPO_PUBLIC_APPWRITE_PURCHASE_VERIFY_FUNCTION_ID`, registered in
`lib/appwrite.ts` beside the three that already exist.

---

## 6. Function 2 — the RTDN webhook

Wraps `applyGoogleNotification()`, also already written. A plain HTTP endpoint
Google's Pub/Sub push subscription can POST to. Must be publicly reachable.

### Notification types to handle

| Type | Meaning | Effect | Access? |
| --- | --- | --- | --- |
| `2` RENEWED | Charged again | `endsAt` extended, renewal recorded | Yes |
| `3` CANCELED | Auto-renew off | Nothing ends — runs to `endsAt` | **Yes** |
| `5` ON_HOLD | Card failed, Play gave up | `status: on_hold` | No |
| `6` IN_GRACE_PERIOD | Card failed, Play retrying | `status: in_grace_period` | **Yes** |
| `10` PAUSED | Member paused it | `status: paused` | No |
| `12` REVOKED | Refunded / charged back | `status: refunded`, charges marked refunded | No |
| `13` EXPIRED | Period ended | `status: expired` | No |

Two of these are counter-intuitive and both cost money if got wrong:

> **CANCELED does not end access.** The member paid for the period and keeps it
> until `endsAt`. Cutting them off early is taking back something already sold.
>
> **IN_GRACE_PERIOD does not end access either.** Their card was declined and
> Google is still retrying. They have not cancelled and have done nothing wrong.

### Idempotency

Pub/Sub is **at-least-once** — redelivery is normal, not an error. Record each
message in `billing_notifications` keyed on `messageId` and make a repeat a no-op.
The unique `idx_subscription_token` is the second line of defence.

### Upgrades

When a member changes plan, Play issues a new token carrying
`linkedPurchaseToken` pointing at the old one. Close the replaced subscription
rather than leaving two active rows — `idx_subscription_linked_token` is there
for that lookup.

---

## 7. Credentials the backend needs

None of these go anywhere near the app. If a credential would let a client mark
itself premium, it is in the wrong place.

| Credential | Where from | Notes |
| --- | --- | --- |
| **Service account JSON** | Google Cloud → IAM → Service Accounts | Store as a Function environment variable. A bearer credential for your revenue |
| **Service account email** | Same | `name@project.iam.gserviceaccount.com`. Grant it permissions in Play Console |
| **Cloud project** | Play Console → Setup → API access | Link it, then enable the *Google Play Android Developer API* |
| **Play Console permissions** | Play Console → Users and permissions | *View financial data* **and** *Manage orders and subscriptions*. Can take **24 h** to take effect |
| **Pub/Sub topic** | Google Cloud → Pub/Sub | `projects/<project>/topics/<topic>`, entered in Monetization setup. Grant Google's publisher account rights to publish to it |
| **Push subscription** | Google Cloud → Pub/Sub | Points at the Function 2 URL |
| **Merchant account** | Play Console | Bank details and tax info. Required to actually be paid |

### Not needed

- **The licensing key** (base64 RSA in Monetization setup) — that is for on-device
  signature checks. Server-side verification supersedes it and is stronger.
- **Any payment provider** — no Stripe, PayPal, or GCash. Digital goods consumed
  in the app must go through Play Billing.
- **RevenueCat or similar** — they exist to build what `applyGooglePurchase()` and
  `applyGoogleNotification()` already do.

---

## 8. What the app already does

So the backend knows what it can rely on.

- Reads plans from `subscription_plans` with `isActive` / `order`, and renders
  Play's formatted price over the stored one.
- Gates **everything** on `hasActivePremium(profile)`, which checks
  `premiumUntil` as well as `isPremium`. Never on `subscriptions.status`.
- Reads `subscriptions` for one screen only — Manage membership.
- Handles all eight statuses in the membership copy, including the three new
  ones, with a neutral fallback for any status Play adds later.
- Never writes `subscriptions`, `payments`, `user_profiles.isPremium`,
  `premiumUntil`, `planName`, or `subscriptionStatus`.
- Does not read `billing_notifications`.

**Still to do on our side**, once the products exist: add the Play Billing client,
replace the stubbed checkout button, and pass Play's obfuscated account identifier
when launching the flow.

---

## 9. How we know it works

### The alarm worth having on day one

`idx_subscription_acknowledged` exists precisely for this query:

```
status = 'active' AND isAcknowledged = false
```

Any row it returns is **money on its way back to the customer**. It should always
be empty. This is the single most useful check on the whole system and it costs
one indexed query.

### Test matrix

| Case | Expected |
| --- | --- |
| First purchase | `subscriptions` row, `payments` row, `isAcknowledged` true, profile re-synced |
| Same notification delivered twice | Second is a no-op; one row, one charge |
| Renewal | `endsAt` extended, a second `payments` row |
| Cancel | `autoRenewing` false, **access continues** to `endsAt` |
| Card declined | `status: in_grace_period`, **access continues** |
| Retries exhausted | `status: on_hold`, access ends |
| Refund | `status: refunded`, charges marked refunded, access ends |
| Plan upgrade | Old subscription closed via `linkedPurchaseToken`, not left active |
| Token replayed from another account | Rejected — `obfuscatedAccountId` does not match the JWT |

---

## 10. Also on the queue

Open items from `BACKEND-REQUESTS.md`, tracked in §19 of the v5 notes:

| # | Ask | Why it matters |
| --- | --- | --- |
| 2 | Password recovery — SMTP + redirect URL | Console configuration; no code substitutes for it |
| 3 | Premium question access Function | **Pair this with billing.** `questions` stays `app_readonly` until it exists, so any signed-in member can read the entire paid bank — prompt, choices, `answerIndex`, explanation. A paywall over already-readable content protects revenue on paper only |
| 7 | Access code redemption Function | `redeemAccessCode()` is written; only the wrapper is missing |

---

## Critical path

1. **Play Console products** — nothing downstream can start without them.
2. **Plan rows** in the dashboard, pointing at those product IDs.
3. **Function 1**, so a purchase can be verified and acknowledged.
4. **Function 2 + Pub/Sub**, so renewals and refunds land.

Steps 3 and 4 wrap logic that already exists. This is wiring, not a build.
