import { NEWS_ITEMS } from "@/data/news-data"

/**
 * Which flagged-new items the learner has not opened yet.
 *
 * The badge on Home has to be able to *clear*, otherwise it is decoration: a
 * dot that is always on teaches people to ignore it, and then it cannot do its
 * one job when something genuinely lands. Comparing against seen IDs means
 * opening Updates turns it off, and it comes back only when a new item ships.
 */
export function getUnreadNewsIds(seenNewsIds: readonly string[]): string[] {
  const seen = new Set(seenNewsIds)

  return NEWS_ITEMS.filter((item) => item.isNew && !seen.has(item.id)).map(
    (item) => item.id
  )
}

export function hasUnreadNews(seenNewsIds: readonly string[]): boolean {
  return getUnreadNewsIds(seenNewsIds).length > 0
}

/** Every currently-published item ID, for marking the list as read. */
export function getAllNewsIds(): string[] {
  return NEWS_ITEMS.map((item) => item.id)
}
