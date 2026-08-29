import { APPWRITE_CONFIG } from "../appwrite"

/**
 * ─── CMS asset URLs ───────────────────────────────────────────────────────
 *
 * Gotcha 8. A file uploaded through the dashboard is stored as a path —
 * `/api/assets/<fileId>` — while a link somebody pasted is already absolute.
 * Both land in the same column (`questions.imageUrl`,
 * `learning_materials.fileUrl`), so every render has to ask which it is.
 *
 * Getting this wrong is silent: an `<Image>` with a relative source renders
 * nothing and reports nothing.
 */

const CMS_BASE_URL = APPWRITE_CONFIG.cmsBaseUrl.trim().replace(/\/+$/, "")

export function getCmsBaseUrl() {
  return CMS_BASE_URL
}

export function isCmsBaseUrlConfigured() {
  return CMS_BASE_URL.length > 0
}

/**
 * An absolute URL for a stored asset, or null when there is nothing to show.
 *
 * Returns null rather than a broken path when a relative asset is stored but
 * no CMS base URL is configured — an empty slot is a better answer than an
 * image that will never load.
 */
export function resolveCmsAssetUrl(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (!CMS_BASE_URL) {
    if (__DEV__) {
      console.warn(
        `[assets] "${trimmed}" is a CMS-relative asset path but ` +
          "EXPO_PUBLIC_CMS_BASE_URL is not set, so it cannot be displayed."
      )
    }

    return null
  }

  return `${CMS_BASE_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`
}
