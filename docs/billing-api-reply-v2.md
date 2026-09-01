# Billing API — reply v2

**For:** the dashboard / CMS backend
**From:** the mobile app
**Re:** the updated `MOBILE-API-NOTES.md` (timeout, `409` detail, sandbox)

Supersedes `billing-api-reply.md`. Three of the five questions in that document
are answered by your update, and two of them you answered better than we asked.

**The client is built.** It is written against the contract as documented, it
compiles, and it is ready to run against the sandbox the moment you enable it.

---

## 1. Still open — `purchaseTokenHash`

The one item from our last note that the update does not touch. Repeating it
because the failure is silent rather than loud.

`MOBILE-SCHEMA-NOTES-v6.md` moved the token indexes onto hash columns:

| Table | Index | Type | Column |
| --- | --- | --- | --- |
| `subscriptions` | `idx_subscription_token` | **unique** | `purchaseTokenHash` |
| `subscriptions` | `idx_subscription_linked_token` | key | `linkedPurchaseTokenHash` |
| `payments` | `idx_payment_token` | key | `purchaseTokenHash` |
| `billing_notifications` | `idx_notification_token` | key | `purchaseTokenHash`, `publishedAt` |

Your `created: false` behaviour and the `502` retry path both depend on that
unique index firing, which needs the hash written on insert and lookups going
through it rather than the raw token.

A missing hash does not error. It lets the second call — the retry your own §4
asks us to make — create a second subscription for one purchase. If it is
already handled, this needs no reply.

---

## 2. Answered, and adopted

| Your update | What we did |
| --- | --- |
| **Timeout: 25 s**, treat a client timeout as `502` | `TIMEOUT_MS = 25_000` via `AbortController`. Abort and network failure both return the retry outcome |
| **`409` carries `subscriptionStatus`** | Parsed and surfaced as `expired` / `on_hold` / `paused`. This is better than what we asked for — we had proposed re-reading the profile, and one field on the response removes the round trip |
| **Sandbox at `/api/billing/verify/sandbox`** | Wired behind a `simulate` parameter. Same code path, same parsing — only the URL differs, so what we test is what ships |

Two questions from our last note we are treating as closed without needing an
answer: we will send `orderId` when Play gives us one, and we are not asking for
a retry cadence — see §4.

---

## 3. Confirmed — the obfuscated account identifier

Implemented exactly as specified:

```
sha256("surewin:" + userId)  ->  lowercase hex, 64 characters
```

`userId` is the Appwrite account `$id`. Verified against an independent
implementation:

```
userId  68b2f1a900112233abcd
input   surewin:68b2f1a900112233abcd
digest  f86db2d5f758c3f16726cb7470314b9e95136ac3d571f7826995adbaad98ac4f
        64 chars, lowercase
```

If your server derives anything different for that input, one of us has a bug
and this is the cheapest place to find it.

We will confirm it end to end through the sandbox's echo before a real purchase
depends on it — that facility is the most useful thing in the update, because it
turns the one security check in the flow from something only a live payment can
test into something we can assert in development.

---

## 4. What we built, and how it behaves

`lib/billing/verify.ts` and `lib/billing/account-id.ts`. Every branch is
explicit; none of them grants access locally.

| Response | Outcome | Retry? |
| --- | --- | --- |
| `200` (`created` true **or** false) | `granted` → re-read `user_profiles` | — |
| `400` | `invalid` | Never |
| `401` | Fresh JWT, one retry; still failing → `invalid` | Once, internally |
| `403` | `wrongAccount` | Never |
| `409` | `notActive` + status | Never |
| `502`, `503`, timeout, network drop | `retryLater` — token kept | Next launch |
| Any other status | `retryLater` | Next launch |

Two decisions worth stating so you can object:

**An unrecognised status retries.** Anything not listed falls to `retryLater`
rather than being treated as fatal. Retrying costs one request; not retrying
costs a membership somebody paid for.

**A missing `EXPO_PUBLIC_CMS_BASE_URL` also retries.** It is our configuration
error, not a payment failure — but the member has still been charged, so it
takes the path that preserves the token rather than the one that reports failure.

On retry cadence: we retry **once per app launch**, not on a timer, so a member
relaunching repeatedly is the worst case and each attempt is a single request
against a token you can already apply idempotently. If you would prefer a floor
between attempts, say so and we will add one.

---

## 5. Ready to test, and what we need to start

The sandbox is the only thing standing between us and a fully exercised checkout
path. When you enable it we will run:

| Case | What it proves |
| --- | --- |
| `success` | The happy path and the profile re-read |
| `already_owned` | `created: false` is treated as success, not an error |
| `invalid_token`, `wrong_product` | `400` does not retry |
| `wrong_account` | `403` does not retry |
| `not_active` | `409` reads `subscriptionStatus` into the membership copy |
| `google_unreachable`, `not_configured` | `502`/`503` keep the token |
| `delayMs: 22000` | The 25 s timeout fires and behaves as `502` |
| `obfuscatedAccountId` echo | §3 above matches on both sides |
| No JWT | A genuine `401` |

**Please enable it whenever convenient** — it needs nothing else from you, and
it unblocks the whole flow ahead of Play Console.

---

## 6. Still waiting on

| | Blocks | Notes |
| --- | --- | --- |
| **Enable the sandbox** | Nothing else — it is the cheapest unblock available | `404` while off |
| **Deploy the billing routes** | The real call | `404` today |
| **Play products, activated** | Steps 2–4; the app cannot query a product that does not exist | Product IDs are permanent |
| **Plan rows** | The paywall renders this table — **zero rows today** | Needs the Play products first |
| **Pub/Sub topic + push subscription** | Renewals, cancellations, refunds | Without it a membership works once and stops |
| **Licence testers** | Any real end-to-end test | Sideloading cannot test billing |

---

## 7. Unchanged from our last note

Still open, still ours to flag rather than fix:

- **`EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID` is unset.** The Function
  exists in `functions/account-delete/` but has no ID, so account deletion does
  not work. Play requires a working deletion path for apps holding accounts, so
  it blocks release at the same moment billing does.
- **Premium question access** (`BACKEND-REQUESTS.md` #3). `questions` is still
  `app_readonly`; a paywall over content any signed-in member can already read
  protects revenue on paper only.
- **Password recovery** (#2) still needs SMTP and a redirect URL.

---

Only §1 needs a reply, and only if the answer is "not yet".
