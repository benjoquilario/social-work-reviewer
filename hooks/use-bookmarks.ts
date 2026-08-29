import { useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/contexts/auth-context"
import {
  listBookmarks,
  toggleBookmark,
  type Bookmark,
} from "@/lib/member/bookmarks"
import { queryKeys } from "@/lib/query-keys"

/**
 * ─── Saved questions ──────────────────────────────────────────────────────
 *
 * A star on a question is the one control in a sitting that has nothing to do
 * with answering it, so it has to cost nothing: tapping it must not block the
 * question, must not wait for a round trip, and must not lose the tap if the
 * request fails while they have already moved on.
 *
 * Hence an optimistic set. The cache is updated on tap, the write goes out
 * behind it, and a failure rolls the set back to exactly what it was — not to
 * a refetch, which would race the next tap.
 *
 * Scoped by category on purpose. A bookmarked-only session in one category
 * should not have to read every question the member ever saved, which is what
 * `user_bookmarks.categoryId` is denormalised for.
 */

export function useBookmarks(categoryId?: string) {
  const userId = useAuth((state) => state.user?.$id) ?? ""
  const queryClient = useQueryClient()
  const queryKey = queryKeys.member.bookmarks(userId, categoryId)

  const query = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: () => listBookmarks({ userId, categoryId }),
    staleTime: 5 * 60 * 1000,
  })

  const bookmarks = query.data ?? []
  const skus = new Set(bookmarks.map((bookmark) => bookmark.questionSku))

  const mutation = useMutation({
    mutationFn: async (input: { questionSku: string; isSaved: boolean }) =>
      toggleBookmark({
        userId,
        questionSku: input.questionSku,
        categoryId,
        isSaved: input.isSaved,
      }),

    onMutate: async (input) => {
      // Cancel first, or an in-flight refetch resolves after the optimistic
      // write and puts the old list back.
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Bookmark[]>(queryKey) ?? []

      queryClient.setQueryData<Bookmark[]>(queryKey, (current = []) =>
        input.isSaved
          ? current.filter((row) => row.questionSku !== input.questionSku)
          : [
              {
                id: `optimistic-${input.questionSku}`,
                questionSku: input.questionSku,
                categoryId: categoryId ?? null,
                createdAt: new Date().toISOString(),
              },
              ...current,
            ]
      )

      return { previous }
    },

    onError: (_error, _input, context) => {
      // Back to exactly what it was. A refetch here would race the next tap.
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
      // The unscoped list is what the saved-questions screen reads.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.member.bookmarks(userId, undefined),
      })
    },
  })

  const isSaved = useCallback(
    (questionSku: string) => skus.has(questionSku),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.data]
  )

  const toggle = useCallback(
    (questionSku: string) => {
      if (!userId || !questionSku) {
        return
      }

      mutation.mutate({ questionSku, isSaved: skus.has(questionSku) })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation, query.data, userId]
  )

  return {
    bookmarks,
    skus,
    isSaved,
    toggle,
    isLoading: query.isLoading,
    isEnabled: Boolean(userId),
  }
}
