import { account, APPWRITE_CONFIG } from "../appwrite"
import { getObfuscatedAccountId } from "./account-id"

/**
 * ─── Reporting a purchase to the CMS ──────────────────────────────────────
 *
 * The one thing the app cannot do through the Appwrite SDK. A purchase token
 * sent from a client is a claim, not a fact — anyone can post one — so it has
 * to be checked against Google by something holding a credential the app must
 * never carry. Contract in `MOBILE-API-NOTES.md`.
 *
 * **The distinction this module exists to preserve** is between a purchase that
 * will never be valid and one that has not been recorded *yet*. Both come back
 * `ok: false`, and treating them alike is how a member who has been charged
 * gets told their payment failed. The status code is the only thing separating
 * them, which is why every branch below is spelled out rather than collapsed
 * into a boolean.
 *
 * Nothing here grants access. Entitlement is read from `user_profiles`, which
 * only the server writes; a `granted` result means "re-read the profile", not
 * "unlock the app".
 */

const VERIFY_PATH = "/api/billing/verify"
const SANDBOX_PATH = "/api/billing/verify/sandbox"

/**
 * Above the server's own worst case: it caps each call to Google at 10 s and
 * makes at most two, so 20 s is the longest a real answer can take. Timing out
 * earlier would turn a slow success into a retry, and the retry would be
 * competing with a request still in flight.
 */
const TIMEOUT_MS = 25_000

/** Not-active reasons a `409` distinguishes, same vocabulary as `subscriptions.status`. */
export type NotActiveStatus = "expired" | "on_hold" | "paused"

export type VerifyOutcome =
  /** Recorded. Re-read `user_profiles`; do not unlock anything locally. */
  | { kind: "granted"; subscriptionId: string; expiresAt: string | null }
  /** Play does not recognise it, or it is for another product. Never retry. */
  | { kind: "invalid"; message: string }
  /** The purchase belongs to a different account. Never retry. */
  | { kind: "wrongAccount"; message: string }
  /** Expired, on hold, or paused. Never retry — send them to the paywall. */
  | { kind: "notActive"; status: NotActiveStatus | null; message: string }
  /**
   * Charged but not recorded: `502`, `503`, a timeout, or the network dropping.
   * **Keep the token and retry on next launch.** Play keeps re-reporting an
   * unacknowledged purchase, so it is still there, and the endpoint is safe to
   * call again with it.
   */
  | { kind: "retryLater"; message: string }

export type VerifyInput = {
  purchaseToken: string
  productId: string
  orderId?: string
  userId: string
  /** Drives a sandbox case instead of a real verification. See §6b. */
  simulate?: string
  /** Sandbox only: makes the server hang, to rehearse the client timeout. */
  delayMs?: number
}

function baseUrl() {
  return APPWRITE_CONFIG.cmsBaseUrl.trim().replace(/\/+$/, "")
}

export function isBillingApiConfigured() {
  return baseUrl().length > 0
}

/**
 * One attempt. Mints its own JWT, because they last about 15 minutes and a
 * retry after a `401` needs a fresh one rather than the one that just failed.
 */
async function attempt(
  url: string,
  body: Record<string, unknown>
): Promise<Response> {
  const { jwt } = await account.createJWT()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function verifyPurchase(
  input: VerifyInput
): Promise<VerifyOutcome> {
  if (!isBillingApiConfigured()) {
    // Configuration, not a payment problem — but the member has still been
    // charged, so it takes the retry path rather than an error.
    return {
      kind: "retryLater",
      message:
        "EXPO_PUBLIC_CMS_BASE_URL is not set, so the purchase could not be reported.",
    }
  }

  const url = `${baseUrl()}${input.simulate ? SANDBOX_PATH : VERIFY_PATH}`

  // No `userId` in the body. The server takes the member from the JWT, and an
  // endpoint that accepted one would be a way to grant premium to whoever the
  // caller names.
  const body: Record<string, unknown> = {
    purchaseToken: input.purchaseToken,
    productId: input.productId,
    obfuscatedAccountId: await getObfuscatedAccountId(input.userId),
  }

  if (input.orderId) body.orderId = input.orderId
  if (input.simulate) body.simulate = input.simulate
  if (input.delayMs !== undefined) body.delayMs = input.delayMs

  let response: Response

  try {
    response = await attempt(url, body)

    // A JWT can expire between minting and arriving. One retry with a fresh
    // one; a second failure is a real auth problem, not a stale token.
    if (response.status === 401) {
      response = await attempt(url, body)
    }
  } catch {
    // AbortError and network failures are indistinguishable from a `502` at
    // this end, and the safe reading of both is that the charge may have gone
    // through.
    return {
      kind: "retryLater",
      message: "Could not reach the billing service.",
    }
  }

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean
    message?: string
    subscriptionStatus?: string
    subscription?: { id?: string; created?: boolean; expiresAt?: string }
  } | null

  const message = payload?.message ?? `Verification failed (${response.status}).`

  if (response.ok && payload?.ok) {
    // `created: false` is not an error — the purchase was already recorded and
    // the existing row updated. Same outcome for the member either way.
    return {
      kind: "granted",
      subscriptionId: payload.subscription?.id ?? "",
      expiresAt: payload.subscription?.expiresAt ?? null,
    }
  }

  switch (response.status) {
    case 400:
      return { kind: "invalid", message }
    case 403:
      return { kind: "wrongAccount", message }
    case 409:
      return {
        kind: "notActive",
        status: isNotActiveStatus(payload?.subscriptionStatus)
          ? payload.subscriptionStatus
          : null,
        message,
      }
    case 401:
      // Survived a fresh-JWT retry, so the session is the problem.
      return { kind: "invalid", message }
    default:
      // 502, 503, and anything unforeseen. Retrying costs one request; not
      // retrying costs a membership somebody paid for.
      return { kind: "retryLater", message }
  }
}

function isNotActiveStatus(value: unknown): value is NotActiveStatus {
  return value === "expired" || value === "on_hold" || value === "paused"
}
