import * as Crypto from "expo-crypto"

/**
 * ─── The obfuscated account identifier ────────────────────────────────────
 *
 * Play attaches this to a purchase and hands it back to the server, which
 * derives the same value from the account in the JWT and compares the two. That
 * comparison is the only thing standing between a purchase token and any
 * account that posts it — a token copied off another device buys nothing,
 * because the identifier travelling with it names somebody else.
 *
 * The formula is fixed by `MOBILE-API-NOTES.md` §5 and both sides must agree:
 *
 *     sha256("surewin:" + userId)  ->  lowercase hex, 64 characters
 *
 * Play caps the field at 64 characters and a SHA-256 hex digest is exactly 64,
 * so it fits without truncation. Changing the prefix, the case, or the encoding
 * silently breaks the check on the server's side and every purchase comes back
 * 403 — so this is not a place to tidy.
 *
 * **The raw account id must never be sent instead.** Play can see this value,
 * and an Appwrite `$id` identifies a real person. The digest is stable, derives
 * from nothing secret, and tells Google nothing.
 *
 * Until this ships the server logs a warning and lets the purchase through, so
 * the absence of it is not a build failure — it is an open door.
 */

const PREFIX = "surewin:"

export async function getObfuscatedAccountId(userId: string): Promise<string> {
  const trimmed = userId.trim()

  if (!trimmed) {
    throw new Error(
      "Cannot derive an obfuscated account id without a signed-in user."
    )
  }

  // HEX is the default encoding, and expo-crypto returns it lowercase — which
  // is what the server hashes to. Stated explicitly so a future edit that adds
  // an options object cannot quietly change it.
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${PREFIX}${trimmed}`,
    { encoding: Crypto.CryptoEncoding.HEX }
  )
}
