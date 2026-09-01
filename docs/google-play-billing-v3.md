# Google Play Billing — v3 (backend handoff)

**For:** the dashboard / CMS backend
**From:** the mobile app
**Against:** `MOBILE-SCHEMA-NOTES-v6.md` and the v6 `schema.ts`

Supersedes `google-play-billing-v2.md`. **v2 contains one statement that is now
wrong**, and it is load-bearing — see the next section. Everything else in v2
still holds and is repeated here so this document stands alone.

---

## Read this first — what changed from v2

### The token indexes moved onto hash columns

v2 told you the purchase-token lookup was indexed on `purchaseToken`. In v6 it is
not. Every token index now targets a **SHA-256 hash column** stored beside the
token.

| Table | Index | Type | Column **now** | Column in v2 (wrong) |
| --- | --- | --- | --- | --- |
| `subscriptions` | `idx_subscription_token` | **unique** | `purchaseTokenHash` | ~~`purchaseToken`~~ |
| `subscriptions` | `idx_subscription_linked_token` | key | `linkedPurchaseTokenHash` | ~~`linkedPurchaseToken`~~ |
| `payments` | `idx_payment_token` | key | `purchaseTokenHash` | *(not in v2)* |
| `billing_notifications` | `idx_notification_token` | key | `purchaseTokenHash`, `publishedAt` | *(not in v2)* |

**Why.** Appwrite will not index a string column longer than 767 characters, and
a Play purchase token needs 1024 to be stored without truncation. Both limits are
real, so the column that *holds* the token and the column that *finds* it cannot
be the same one.

**What this means for the Functions — this is the part that breaks silently:**

- On write, compute `SHA-256(purchaseToken)` and store it in `purchaseTokenHash`
  **as well as** storing the full token in `purchaseToken`. Verifying and
  acknowledging with Google needs the real value; every lookup needs the hash.
- On read, **query by `purchaseTokenHash`, never by `purchaseToken`.** A query
  against the unindexed token column will fail or scan.
- Same for `linkedPurchaseToken` / `linkedPurchaseTokenHash` on upgrades.

If the hash is not written, the unique index protects nothing and applying the
same purchase twice grants two subscriptions. That failure is invisible until it
costs money.

### `payments.refundedAt` was added

A refunded charge is **not deleted**. It keeps its row with `status: 'refunded'`
and a `refundedAt` date. A purchase history that quietly loses rows cannot be
reconciled.

### Mobile-side items 1 and 2 are done

`MOBILE-SCHEMA-NOTES-v6.md` §26 lists four things the app must build. The two
that were unblocked are complete:

- **Grace period handling** — the membership screen now renders all eight
  `subscriptions.status` values, plus a neutral fallback for any Play adds later.
- **The widened enums** — verified compiling against the v6 `schema.ts`.

Items 3 and 4 (Play Billing client, checkout flow) are blocked on the products
and Functions below.

---

## What the backend still owns

| Concern | Owner |
| --- | --- |
| Play Console products, prices, base plans | **Backend / Play account holder** |
| Service account, API access, Pub/Sub topic | **Backend** |
| The two Functions | **Backend** |
| Authoring plan rows | **Backend / dashboard** |
| Play Billing client, checkout UI, membership copy | Mobile |
| Entitlement checks | Mobile — done, no changes coming |

---

## Tables — nothing to create

All five billing tables exist in v6 with columns and indexes in place.

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
purchaseToken  purchaseTokenHash
linkedPurchaseToken  linkedPurchaseTokenHash
orderId  productId  basePlanId  offerId  obfuscatedAccountId
autoRenewing  isAcknowledged  acknowledgedAt
latestNotificationType  latestNotificationAt  cancelledAt  note  createdAt
```

### `subscriptions` indexes

| Index | Type | Columns | Why |
| --- | --- | --- | --- |
| `idx_subscription_token` | **unique** | `purchaseTokenHash` | The lookup billing cannot work without. Unique is what makes applying a purchase twice update one row instead of granting two |
| `idx_subscription_linked_token` | key | `linkedPurchaseTokenHash` | Finds the row an upgrade replaced |
| `idx_subscription_order` | key | `orderId` | Notifications arrive carrying an order ID |
| `idx_subscription_acknowledged` | key | `status`, `isAcknowledged` | **The refund alarm** — see below |
| `idx_subscription_user_status` | key | `userId`, `status` | The member's current access |
| `idx_subscription_expiry` | key | `status`, `endsAt` | The expiry sweep |

---

## Rows — author the plans

`subscription_plans` has **zero rows**, verified against the live database. The
paywall renders whatever is in this table, so a finished checkout has nothing to
sell.

The Play Console product must exist first — `googleProductId` has to point at
something real, and product IDs are permanent and cannot be reused after
deletion.

| Field | Required | Notes |
| --- | --- | --- |
| `name` | ✅ | Card title, e.g. "Premium Monthly" |
| `googleProductId` | ✅ | **Exact** Play product ID. Uniquely indexed |
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

---

## Function 1 — purchase verification

Wraps `applyGooglePurchase()`, already written. This is the wrapper, not the
logic.

### Contract

```
POST  (Appwrite Function execution, authenticated)

in    { purchaseToken, productId, orderId }
out   { ok: true, subscription }
      { ok: false, message }

userId  from the JWT — never from the body
```

### It must

1. **Verify** the token against `purchases.subscriptionsv2.get`. A token posted
   by a client is a claim, not a fact.
2. **Check `obfuscatedExternalAccountId`** from Play's response against the JWT's
   user, and store it in `subscriptions.obfuscatedAccountId`. This is what stops
   one member's purchase being redeemed on another account.
3. **Acknowledge** the purchase with Google before returning.
4. **Write `purchaseTokenHash` alongside `purchaseToken`** — see the top of this
   document.
5. Write `subscriptions` and `payments`, and re-sync the cached fields on
   `user_profiles`.
6. Persist `basePlanId`, `offerId`, and `linkedPurchaseToken`
   (+ `linkedPurchaseTokenHash`) when `subscriptionsv2.get` returns them.

### Acknowledge is a deadline

**Google automatically refunds any purchase not acknowledged within three days.**
`isAcknowledged` and `acknowledgedAt` record that it happened.

### Must be safe to call twice

The app retries verification on next launch when the network drops after payment
— Play keeps re-reporting an unacknowledged purchase, so the token is still
there. A second call must update the row the first one made, not create another.
The unique index on `purchaseTokenHash` is what enforces that, which is why the
hash has to be written.

### Then

Send us the Function ID. The app reads it as
`EXPO_PUBLIC_APPWRITE_PURCHASE_VERIFY_FUNCTION_ID`, registered in
`lib/appwrite.ts` beside the three that already exist.

---

## Function 2 — the RTDN webhook

Wraps `applyGoogleNotification()`, also already written. A plain HTTP endpoint
Google's Pub/Sub push subscription can POST to. Must be publicly reachable.

| Type | Meaning | Effect | Access? |
| --- | --- | --- | --- |
| `2` RENEWED | Charged again | `endsAt` extended, renewal recorded | Yes |
| `3` CANCELED | Auto-renew off | Nothing ends — runs to `endsAt` | **Yes** |
| `5` ON_HOLD | Card failed, Play gave up | `status: on_hold` | No |
| `6` IN_GRACE_PERIOD | Card failed, Play retrying | `status: in_grace_period` | **Yes** |
| `10` PAUSED | Member paused it | `status: paused` | No |
| `12` REVOKED | Refunded / charged back | `status: refunded`, `payments.refundedAt` set | No |
| `13` EXPIRED | Period ended | `status: expired` | No |

Two are counter-intuitive and both cost money if got wrong:

> **CANCELED does not end access.** The member paid for the period and keeps it
> until `endsAt`.
>
> **IN_GRACE_PERIOD does not end access either.** Their card was declined and
> Google is still retrying. They have not cancelled and have done nothing wrong.

### Idempotency

Pub/Sub is **at-least-once** — redelivery is normal, not an error. Record each
message in `billing_notifications` keyed on `messageId` and make a repeat a
no-op. Look the subscription up by `purchaseTokenHash`.

### Upgrades

A plan change issues a new token carrying `linkedPurchaseToken` pointing at the
old one. Close the replaced subscription rather than leaving two active rows —
look it up via `linkedPurchaseTokenHash`.

---

## Credentials

None go anywhere near the app. If a credential would let a client mark itself
premium, it is in the wrong place.

| Credential | Where from | Notes |
| --- | --- | --- |
| **Service account JSON** | Google Cloud → IAM → Service Accounts | Function environment variable. A bearer credential for your revenue |
| **Service account email** | Same | Grant it permissions in Play Console |
| **Cloud project** | Play Console → Setup → API access | Link it, enable *Google Play Android Developer API* |
| **Play Console permissions** | Users and permissions | *View financial data* **and** *Manage orders and subscriptions*. Up to **24 h** to take effect |
| **Pub/Sub topic** | Google Cloud → Pub/Sub | Entered in Monetization setup. Grant Google's publisher account publish rights |
| **Push subscription** | Google Cloud → Pub/Sub | Points at the Function 2 URL |
| **Merchant account** | Play Console | Bank and tax details. Required to be paid |

### Not needed

- **The licensing key** (base64 RSA in Monetization setup) — for on-device
  signature checks. Server-side verification supersedes it.
- **Any payment provider** — no Stripe, PayPal, or GCash. Digital goods must go
  through Play Billing.
- **RevenueCat or similar** — they build what `applyGooglePurchase()` and
  `applyGoogleNotification()` already do.

---

## The alarm worth having on day one

`idx_subscription_acknowledged` exists precisely for:

```
status = 'active' AND isAcknowledged = false
```

Any row it returns is **money on its way back to the customer**. It should always
be empty.

---

## Test matrix

| Case | Expected |
| --- | --- |
| First purchase | `subscriptions` + `payments` rows, **`purchaseTokenHash` populated**, `isAcknowledged` true, profile re-synced |
| Same token verified twice | One row updated, not two created — proves the hash and the unique index |
| Notification delivered twice | Second is a no-op via `billing_notifications.messageId` |
| Renewal | `endsAt` extended, second `payments` row |
| Cancel | `autoRenewing` false, **access continues** to `endsAt` |
| Card declined | `status: in_grace_period`, **access continues** |
| Retries exhausted | `status: on_hold`, access ends |
| Refund | `status: refunded`, `payments.refundedAt` set, row kept |
| Plan upgrade | Old subscription closed via `linkedPurchaseTokenHash` |
| Token replayed from another account | Rejected — `obfuscatedAccountId` mismatch |

---

## Also on the queue

From `BACKEND-REQUESTS.md`, tracked in §19 of the v6 notes:

| # | Ask | Why it matters |
| --- | --- | --- |
| 2 | Password recovery — SMTP + redirect URL | Console configuration; no code substitutes |
| 3 | Premium question access Function | **Pair this with billing.** `questions` is still `app_readonly`, so any signed-in member can read the whole paid bank — prompt, choices, `answerIndex`, explanation. A paywall over already-readable content protects revenue on paper only |
| 7 | Access code redemption Function | `redeemAccessCode()` is written; only the wrapper is missing |

Also unset on our side: `EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID`. The
Function exists in `functions/account-delete/` but has no ID configured, so
account deletion does not work — and Play requires a working deletion path for
apps that hold accounts.

---

## Critical path

1. **Play Console products**, activated — nothing downstream can start.
2. **Plan rows** pointing at those product IDs.
3. **Function 1** — with the hash written.
4. **Function 2 + Pub/Sub.**

Both Functions wrap logic that already exists. This is wiring, not a build.
