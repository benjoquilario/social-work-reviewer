import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"

import type { ResumeAttemptCard } from "@/lib/home-types"
import { formatRelativeDateLabel } from "@/lib/home-utils"
import { queryKeys } from "@/lib/query-keys"
import { listResumableSessions } from "@/lib/session/study-session"

/**
 * "Continue where you left off".
 *
 * One query against `study_sessions` — rows left `in_progress`, newest first,
 * backed by `idx_session_user_started`.
 *
 * This used to be derived by grouping every `user_answers` row the member had
 * ever written and guessing which groups looked unfinished. That was both slow
 * and wrong: a paged read could deliver a half-loaded session, so a finished
 * exam kept reappearing here.
 */
export function useResumableSessions(limit = 3) {
  const userId = useAuth((state) => state.user?.$id) ?? ""

  const query = useQuery({
    queryKey: queryKeys.member.resumable(userId),
    enabled: Boolean(userId),
    queryFn: () => listResumableSessions({ userId, limit }),
    staleTime: 30 * 1000,
  })

  const cards = useMemo<ResumeAttemptCard[]>(
    () =>
      (query.data ?? []).map((session) => {
        const answered = session.answeredCount
        const total = Math.max(session.questionCount, answered)

        return {
          id: session.sessionId,
          // The label was copied onto the row when the sitting opened, so a
          // set renamed since then does not rewrite this card.
          title: session.label || "Study session",
          subtitle:
            total > 0 ? `${answered} of ${total} answered` : "Not started yet",
          progressLabel:
            total > 0
              ? `${Math.round((answered / total) * 100)}% done`
              : "Ready to start",
          updatedLabel: formatRelativeDateLabel(session.startedAt),
          onPressParams: {
            pathname: "/quiz" as const,
            params: {
              categoryId: session.categoryId,
              setId: session.questionnaireId,
            },
          },
        }
      }),
    [query.data]
  )

  return {
    cards,
    isLoading: query.isLoading,
    error: query.error,
    hasResumableWork: cards.length > 0,
  }
}
