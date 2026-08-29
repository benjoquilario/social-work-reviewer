/**
 * ─── Query keys ───────────────────────────────────────────────────────────
 *
 * One place, so an invalidation cannot miss a cache it was meant to clear.
 * Keys are built as functions rather than string templates because
 * `queryClient.invalidateQueries({ queryKey: qk.exam.all })` then matches every
 * key beneath it.
 */

export const queryKeys = {
  exam: {
    all: ["exam"] as const,
    categories: (mode: string | undefined, isPremium: boolean) =>
      ["exam", "categories", mode ?? "any", isPremium] as const,
    category: (categoryId: string, isPremium: boolean) =>
      ["exam", "category", categoryId, isPremium] as const,
    sets: (categoryId: string) => ["exam", "sets", categoryId] as const,
    set: (setId: string) => ["exam", "set", setId] as const,
    questions: (categoryId: string, setId: string | null) =>
      ["exam", "questions", categoryId, setId ?? "direct"] as const,
  },
  member: {
    all: ["member"] as const,
    settings: (userId: string) => ["member", "settings", userId] as const,
    activityFeed: (userId: string) => ["member", "activity", userId] as const,
    timeline: (userId: string) => ["member", "timeline", userId] as const,
    resumable: (userId: string) => ["member", "resumable", userId] as const,
    answerStats: (userId: string, categoryId: string) =>
      ["member", "answer-stats", userId, categoryId] as const,
    bookmarks: (userId: string, categoryId: string | undefined) =>
      ["member", "bookmarks", userId, categoryId ?? "all"] as const,
    subscription: (userId: string) =>
      ["member", "subscription", userId] as const,
  },
  announcements: {
    all: ["announcements"] as const,
    list: (audienceKey: string) =>
      ["announcements", "list", audienceKey] as const,
  },
  search: {
    all: ["search"] as const,
    query: (scope: string, term: string, isPremium: boolean) =>
      ["search", scope, term, isPremium] as const,
  },
  session: {
    all: ["session"] as const,
    detail: (sessionId: string) => ["session", sessionId] as const,
    answers: (sessionId: string) => ["session", sessionId, "answers"] as const,
  },
} as const
