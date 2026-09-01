# Billing API — reply to `MOBILE-API-NOTES.md`

**For:** the dashboard / CMS backend
**From:** the mobile app
**Re:** `POST /api/billing/verify`, and what we are building to

Short version: **the contract works, we are building to it as written, and we
have one question that could bite us both.** Everything else here is either a
correction to something we sent you earlier, or a list of what we are waiting on.

---

## 1. One question — does `/api/billing/verify` write `purchaseTokenHash`?

This is the only thing in your document we could not resolve on our side, and it
matters because your retry guarantee depends on it.

`MOBILE-SCHEMA-NOTES-v6.md` moved the purchase-token indexes onto hash columns:

| Table | Index | Type | Column |
| --- | --- | --- | --- |
| `subscriptions` | `idx_subscription_token` | **unique** | `purchaseTokenHash` |
| `subscriptions` | `idx_subscription_linked_token` | key | `linkedPurchaseTokenHash` |
| `payments` | `idx_payment_token` | key | `purchaseTokenHash` |
| `billing_notifications` | `idx_notification_token` | key | `purchaseTokenHash`, `publishedAt` |

Your §3 says `created: false` means the token was already applied and the
existing row was updated, and §4 tells us to retry `502`/`503` with the same
token. Both rely on that unique index actually firing — which it only does if
`purchaseTokenHash` is written on every insert and lookups go through the hash
rather than the raw token.

If it is already handled, ignore this; the two documents were clearly written in
parallel and yours does not need to restate the schema. We are raising it because
the failure is silent: a missing hash does not error, it just lets the same
purchase create a second subscription the first time a retry happens — which is
the exact path your §4 asks us to exercise.

---

## 2. Corrections to what we sent you

`docs/google-play-billing-v3.md` (and v2 before it) asked for an **Appwrite
Function** returning `{ ok, subscription }`, with its ID handed to us as
`EXPO_PUBLIC_APPWRITE_PURCHASE_VERIFY_FUNCTION_ID`.

**Your HTTP route supersedes that, and it is the better design.** Real status
codes carry a distinction a Function's `ok: false` cannot: `400` and `502` are
opposite instructions, and collapsing them into one boolean is how a paid-for
purchase gets abandoned. We have dropped the Function-ID expectation.

Please read those documents as superseded on the transport, and still current on
the schema — the hash columns, `payments.refundedAt`, the acknowledgement
deadline, and the `status = 'active' AND isAcknowledged = false` alarm.

---

## 3. Confirmed — the obfuscated account identifier

We will ship exactly:

```
sha256("surewin:" + userId)   →   lowercase hex, 64 characters
```

`userId` is the Appwrite account `$id`. No alternative derivation needed — your
formula is fine and we would rather match you than negotiate.

We have read §5 and understand the current state: until this ships, the server
accepts a request with no identifier at all, and a shared or stolen token grants
membership to whoever posts it first. It is on our list ahead of the checkout UI
for that reason.

---

## 4. What we have already done

So you know what you can rely on.

- **`schema.ts` is at v6**, including the hash columns. Compiles clean.
- **The membership screen handles all eight `subscriptions.status` values**,
  including `in_grace_period`, `on_hold` and `paused`, plus a neutral fallback for
  any status Play adds later.
- **Grace period reads as still-subscribed.** A declined card shows *"We could
  not charge your card. Access continues until …"* — not "your membership ended".
- **Everything still gates on `hasActivePremium(profile)`**, never on
  `subscriptions.status`.
- **`EXPO_PUBLIC_CMS_BASE_URL` is set** to
  `https://cms-social-work-reviewer.appwrite.network`.
- We write none of `isPremium`, `premiumUntil`, `planName`,
  `subscriptionStatus`, `subscriptions` or `payments`, and we do not read
  `billing_notifications`.

### What we are building next

1. A JWT helper (`account.createJWT()` is not used anywhere yet), minting one per
   verification call, retrying once on `401`.
2. The obfuscated account identifier above.
3. The Play Billing client — `expo-iap` unless it fails to build against SDK 57
   and the New Architecture.
4. The checkout flow, with `502`/`503` and the token kept for retry on next
   launch, distinct from `400`/`403`/`409`.

Items 1 and 2 do not need your endpoint live, so they will land first.

---

## 5. Questions that change how we build

Small, and none are blocking.

| | Question | Why we ask |
| --- | --- | --- |
| 1 | **Client timeout** — what should we set? | We have to turn a timeout into either "retry later" or "failed". Anything ≥ your own Google call timeout means we can treat a timeout as `502` and retry, which is the safe reading |
| 2 | **Retry cadence** — is next-launch enough, or do you want a backoff? | If a member relaunches five times in a minute we would post five times. Happy to add a floor if it helps you |
| 3 | **Is there a way to exercise this before plan rows exist?** | Even a route that verifies auth and returns a canned `200` would let us build steps 5–6 against something real instead of a mock |
| 4 | **Should we send `orderId`?** | You mark it optional and say you read it from Play anyway. We will send it unless you would rather we did not |
| 5 | **On `409`, should we re-read `user_profiles`?** | If the row moved to expired/on-hold server-side, a re-read would let the app show the real state instead of just returning to the paywall |

---

## 6. What we are waiting on

Ordered by what unblocks the most. Nothing here is mobile work.

| | Blocks | Notes |
| --- | --- | --- |
| **Deploy the billing routes** | Steps 5–6 of the flow | Currently `404`. We can build against the contract meanwhile |
| **Play Console products, activated** | Steps 2–4 — the app cannot query a product that does not exist | Product IDs are permanent and cannot be reused after deletion |
| **Plan rows in `subscription_plans`** | The paywall renders this table — **zero rows today** | Cannot be authored until the Play products exist |
| **Pub/Sub topic + push subscription** | Renewals, cancellations, refunds | Without it a membership works once and then quietly stops |
| **Licence testers enrolled** | Any end-to-end test | Billing only works for a Play-delivered build; sideloading cannot test it |

---

## 7. Not billing, but ours to flag

- **`EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID` is unset.** The Function
  exists in `functions/account-delete/` but has no ID configured, so account
  deletion does not work. Play requires a working deletion path for apps that
  hold accounts, so this becomes a release blocker at the same moment billing
  does.
- **Premium question access** (`BACKEND-REQUESTS.md` #3) is still open.
  `questions` remains `app_readonly`, so any signed-in member can read the whole
  paid bank — prompt, choices, `answerIndex`, explanation. Our client-side
  `isFree` filter stops the app leaking it; it does not stop anyone who goes
  looking. Worth landing alongside billing, because a paywall over content that
  is already readable protects revenue on paper only.
- **Password recovery** (#2) still needs SMTP and a redirect URL.

---

Nothing above needs a reply except §1, and that only if the answer is "no".
