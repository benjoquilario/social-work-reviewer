# CMS API Notes for the Mobile App

**For:** the mobile app
**From:** the dashboard / CMS backend
**Base URL:** `https://cms-social-work-reviewer.appwrite.network`

Companion to `MOBILE-SCHEMA-NOTES-v6.md`, which covers everything the app reads
**directly from Appwrite**. This document covers the small number of things that
go through the CMS over HTTP instead, and why they have to.

---

> ### Deployment status — read this before you start
>
> **The endpoints below are written and tested but not yet deployed.** As of
> now, `POST /api/billing/verify` returns **404** on the URL above. The CMS
> itself is live; the billing routes ship with the next deploy.
>
> Build against this document, but expect 404 until we tell you it is out. The
> shapes will not change.

---

## Contents

1. [What goes through this API, and what does not](#1-what-goes-through-this-api-and-what-does-not)
2. [Authentication — the Appwrite JWT](#2-authentication--the-appwrite-jwt)
3. [`POST /api/billing/verify`](#3-post-apibillingverify)
4. [Status codes, and what to do about each](#4-status-codes-and-what-to-do-about-each)
5. [The obfuscated account identifier](#5-the-obfuscated-account-identifier)
6. [The purchase flow end to end](#6-the-purchase-flow-end-to-end)
7. [Endpoints you should never call](#7-endpoints-you-should-never-call) — and the sandbox, in §6b
8. [Checklist](#8-checklist)

---

## 1. What goes through this API, and what does not

Almost nothing. The app talks to **Appwrite directly** for everything it reads,
and to the CMS only for the one thing Appwrite cannot be trusted to do.

| What                                                  | How                                  |
| ----------------------------------------------------- | ------------------------------------ |
| Plans, subjects, questions, materials, announcements  | Appwrite SDK — `app_readonly` tables |
| The member's own profile, settings, answers, progress | Appwrite SDK — row permissions       |
| The member's own subscription row                     | Appwrite SDK — read only             |
| **Reporting a completed purchase**                    | **This API**                         |

The reason for the exception: a purchase token sent from a client is a _claim,
not a fact_. Anyone can post one. It has to be checked against Google by
something holding a credential the app must never have, so it cannot be an
Appwrite write and it cannot be done on the device.

Everything else stays on the SDK. Do not route reads through the CMS.

---

## 2. Authentication — the Appwrite JWT

One header:

```
Authorization: Bearer <jwt>
```

The JWT comes from the Appwrite SDK, from the member's existing session:

```ts
const { jwt } = await account.createJWT()
```

**The account that JWT resolves to is the account that gets the membership.**
There is no `userId` field in any request body, and if you send one it is
ignored — an endpoint that accepted one would be a way to grant premium to
whoever the caller names.

JWTs are short-lived (about 15 minutes). Create one per purchase rather than
holding one; on a `401`, mint a fresh JWT and retry once.

---

## 3. `POST /api/billing/verify`

```
POST https://cms-social-work-reviewer.appwrite.network/api/billing/verify
Authorization: Bearer <appwrite jwt>
Content-Type: application/json
```

### Request

```jsonc
{
  "purchaseToken": "hjfkl...", // required — from the purchase
  "productId": "premium_monthly", // required — must match what Play sold
  "orderId": "GPA.3311-2233-4455-66778", // optional — we read it from Play anyway
  "obfuscatedAccountId": "9f2c...", // optional — see section 5
}
```

`POST` only. A `GET` gets `405`.

### Success — `200`

```jsonc
{
  "ok": true,
  "subscription": {
    "id": "68b2...", // the subscriptions row id
    "created": true, // false when this token was already applied
    "expiresAt": "2026-10-01T09:14:22Z", // Play's expiry, not ours
  },
}
```

`created: false` is **not** an error. It means this purchase had already been
recorded — a retry, or the app re-reporting on launch — and the existing row was
updated. Treat it exactly like `true`.

After a `200`, re-read `user_profiles`. `isPremium` is set by then, and
`hasActivePremium(profile)` is what every screen should gate on.

### Failure — everything else

```jsonc
{ "ok": false, "message": "That purchase is for a different product." }
```

`message` is safe to log. It is written for a developer, **not for a member** —
do not put it on screen. Map the status code to your own copy.

A `409` carries one extra field, so you do not need a second call to find out
which kind of not-active it is:

```jsonc
{
  "ok": false,
  "message": "That subscription is on hold.",
  "subscriptionStatus": "on_hold", // expired | on_hold | paused
}
```

Same vocabulary as `subscriptions.status`, so it drops into the copy the
membership screen already has. Present on `409` only.

### Timeout — set **25 s**

We cap each call to Google at 10 s and make at most two of them, so 20 s is our
worst case. Set your client above that, and treat a client timeout exactly like
a `502`: keep the token, retry on next launch.

---

## 4. Status codes, and what to do about each

This is the part worth implementing carefully. "Invalid purchase" and "we could
not reach Google" need opposite behaviour, and they are both `ok: false`.

| Code  | Means                                                               | Retry?                     | What the member should see                             |
| ----- | ------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------ |
| `200` | Granted                                                             | —                          | Premium unlocked                                       |
| `400` | Play does not recognise the token, or it is for a different product | **No**                     | "We could not confirm that purchase. Contact support." |
| `401` | JWT missing, expired, or invalid                                    | **Once**, with a fresh JWT | Nothing — it should be invisible                       |
| `403` | The purchase belongs to a different account                         | **No**                     | "That purchase is registered to another account."      |
| `409` | The subscription is expired, on hold, or paused                     | **No**                     | Send them to the paywall                               |
| `502` | We could not reach Google                                           | **Yes — later**            | "Confirming your purchase…" — do not say it failed     |
| `503` | Verification is not configured on the server                        | **Yes — later**            | Same as `502`                                          |

### `502` and `503` are the dangerous ones

Both mean **the member has been charged and we have not recorded it.** Neither
is their fault and neither is permanent.

Do not show an error and do not discard the token. Retry on next launch: Play
keeps re-reporting an unacknowledged purchase, so the token is still available
from the billing client, and the endpoint is safe to call again with it — that
path is covered by our test matrix. The same applies to the network dropping
before the response arrives, which is indistinguishable from `502` at your end
and handled the same way.

**Never grant access locally because a call failed.** Entitlement comes from
`user_profiles`, which only the server writes.

---

## 5. The obfuscated account identifier

**This is the one line of app code that stops a purchase token being redeemed on
somebody else's account**, and it needs both sides to compute the same value.

When you launch the billing flow, set Play's obfuscated account identifier to:

```
sha256("surewin:" + userId)   →  lowercase hex, 64 characters
```

where `userId` is the Appwrite account `$id`. Play caps this field at 64
characters and a sha256 hex digest is exactly 64, so it fits without truncation.

We compute the same value server-side and compare it against the account in the
JWT. If they disagree, the request is `403`.

**Do not send the raw `userId` or the email.** Play can see this value, and an
account id is a real identifier for a real person. The hash is stable, derives
from nothing secret, and tells Google nothing.

### Until you ship it, the check is not active

Right now the server accepts three things, in descending order of preference:

1. The digest above — the intended state.
2. The raw `userId` — accepted so an early build is not broken.
3. **Nothing at all** — logged as a warning and allowed through.

Case 3 exists so that purchases from builds predating this change still work. It
also means that **until the app sets the identifier, a shared or stolen purchase
token grants a membership to whoever posts it first.** It is one line at your
end and it closes that.

If you would rather derive it some other way, say so and we will match you. The
only requirement is that both sides agree.

---

## 6. The purchase flow end to end

```
1. Read plans from Appwrite
      Query.equal('isActive', true), Query.orderAsc('order')

2. Ask Play for product details
      queryProductDetails(plan.googleProductId)

3. Render PLAY'S formatted price — never subscription_plans.price,
   which is an admin reporting placeholder

4. launchBillingFlow(), with the obfuscated account id from section 5

5. In the purchase listener:
      POST /api/billing/verify
      Authorization: Bearer <fresh jwt>
      { purchaseToken, productId, orderId }

6. On 200 → re-read user_profiles → hasActivePremium(profile) is true
   On 502/503/network → keep the token, retry next launch
```

Steps 1 to 4 are pure Appwrite and Play. Only step 5 touches this API.

### The states that are not "success"

Handle these before you ship, because the happy path is the easy one:

| State                             | What to do                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Pending**                       | Play is still processing — common with cash payment methods. Do not call verify yet, do not grant, do not error. "We will confirm shortly" |
| **Cancelled**                     | They dismissed the sheet. Not an error. Return to the paywall silently                                                                     |
| **Already owned**                 | An unconsumed purchase exists. Send it to `/api/billing/verify` rather than starting a new flow                                            |
| **Network failure after payment** | Charged, unrecorded. Retry verification on next launch                                                                                     |

### Renewals are not your problem

You never call this endpoint for a renewal. Google notifies the server directly,
the subscription row is updated there, and the app finds out by re-reading
`user_profiles` like it does for everything else. The app's only job is the
first report of a purchase it just made.

---

## 6b. Building before Play exists — the sandbox

```
POST /api/billing/verify/sandbox
Authorization: Bearer <real appwrite jwt>

{ "simulate": "google_unreachable" }
```

Same auth, same response shapes, but it **talks to nothing and grants nothing**

- so you can build the whole checkout flow before Play Console products, plan
  rows or Pub/Sub exist. `GET` the same URL for the case list.

| `simulate`                       | Status                         |
| -------------------------------- | ------------------------------ |
| `success`                        | 200                            |
| `already_owned`                  | 200, `created:false`           |
| `invalid_token`, `wrong_product` | 400                            |
| `unauthenticated`                | 401                            |
| `wrong_account`                  | 403                            |
| `not_active`                     | 409, with `subscriptionStatus` |
| `google_unreachable`             | 502                            |
| `not_configured`                 | 503                            |

The JWT is checked for real, so a missing one still gets a genuine `401`. Every
response carries `"sandbox": true`, and sending `obfuscatedAccountId` gets you
back whether it matches what the server derives - which is how to confirm your
§5 implementation before a real purchase tests it.

Add `"delayMs": 22000` to rehearse your client timeout against something that
actually hangs.

Off unless we enable it, and `404` when off.

---

## 7. Endpoints you should never call

**`/api/billing/notifications`** is Google's, not yours. It is where Pub/Sub
posts renewals, cancellations and refunds, it is authenticated with a shared
secret that does not exist in the app, and calling it does nothing useful. It is
mentioned here only so nobody finds it in a network trace and wonders.

Also, from `MOBILE-SCHEMA-NOTES-v6.md` §26 and worth repeating:

- **Never write** `isPremium`, `premiumUntil`, `planName` or
  `subscriptionStatus`. Cached answers, server-maintained.
- **Never write** `subscriptions` or `payments`. The app has read on its own
  subscription row and nothing else.
- **Never read** `billing_notifications`. It is `server_only` and will `401`.
- **Never ship a credential that could grant membership.** No service account,
  no API key. Product IDs are not secret and arrive from `subscription_plans` at
  runtime, so adding a plan needs no release.

---

## 8. Checklist

- [ ] Mint a **fresh JWT** per verification call; retry once on `401`.
- [ ] Set the **obfuscated account identifier** (§5). One line, and it is the
      only thing making a stolen token worthless.
- [ ] Send **three fields**, never a `userId`.
- [ ] Distinguish **`502`/`503` from `400`/`403`/`409`** — retry the first pair,
      never the second. Getting this backwards either abandons a purchase the
      member paid for, or retries forever against a token that will never work.
- [ ] Keep the token and **retry on next launch** after any network failure or
      `5xx`.
- [ ] Handle **pending, cancelled, already-owned** as distinct from failure.
- [ ] Re-read **`user_profiles`** after a `200`; never grant access locally.
- [ ] Show **Play's price**, not the stored one.

### What we still owe you

|                                     | Status                                                              |
| ----------------------------------- | ------------------------------------------------------------------- |
| Deploying these routes              | Next deploy — currently 404                                         |
| Play Console products, activated    | Blocked on the Play developer account                               |
| Plan rows in `subscription_plans`   | **Zero today.** The paywall has nothing to render until these exist |
| Pub/Sub topic and push subscription | After the service account is set up                                 |

The first purchase cannot be tested until all four are done, plus your account
enrolled as a licence tester. **Billing only works for a Play-delivered build —
sideloading cannot test it.**

Questions, or a different shape that suits the app better: tell us. Everything
above is cheap to change while there are no plan rows and no purchases.
