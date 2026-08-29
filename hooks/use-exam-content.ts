import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"

import { toContentViewer } from "@/lib/content/access"
import { getExamCategory } from "@/lib/content/exam-categories"
import {
  getQuestionSet,
  listQuestionSets,
} from "@/lib/content/question-sets"
import {
  applyQuestionPaywall,
  countDirectQuestions,
  countQuestionsInSet,
  listDirectQuestions,
  listQuestionsInSet,
} from "@/lib/content/questions"
import { queryKeys } from "@/lib/query-keys"
import { listBookmarkedSkus } from "@/lib/member/bookmarks"
import { listAnsweredSkus, listIncorrectSkus } from "@/lib/session/answers"
import { findResumableSession } from "@/lib/session/study-session"

/**
 * Reads for the exam screens, in one place.
 *
 * The paywall is applied here rather than in each screen, so no screen can
 * forget it and no screen can apply it twice.
 */

export function useContentViewer() {
  const profile = useAuth((state) => state.profile)
  return useMemo(() => toContentViewer(profile), [profile])
}

export function useExamCategory(categoryId: string) {
  const viewer = useContentViewer()

  return useQuery({
    queryKey: queryKeys.exam.category(categoryId, viewer.isPremium),
    enabled: Boolean(categoryId),
    queryFn: () => getExamCategory(categoryId, viewer),
  })
}

export function useQuestionSets(categoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.exam.sets(categoryId),
    enabled: enabled && Boolean(categoryId),
    queryFn: () => listQuestionSets(categoryId),
  })
}

export function useQuestionSet(setId: string) {
  return useQuery({
    queryKey: queryKeys.exam.set(setId),
    enabled: Boolean(setId),
    queryFn: () => getQuestionSet(setId),
  })
}

/**
 * The items for one paper, already paywalled.
 *
 * `setId` of null means the questions sitting directly under the category —
 * which is the common shape, not the exception.
 *
 * When the member cannot open the category, the **server** is asked for the
 * free sample only. The previous version downloaded the whole paid paper and
 * filtered it in the render, which meant every answer key and explanation the
 * member had not paid for was on their device. The count of what they are
 * missing comes from a separate `total`, so the paywall can still say how much
 * is behind it without shipping any of it.
 */
export function useExamQuestions(params: {
  categoryId: string
  setId: string | null
  isPremiumCategory: boolean
  enabled?: boolean
}) {
  const viewer = useContentViewer()
  const freeOnly = params.isPremiumCategory && !viewer.isPremium

  const query = useQuery({
    queryKey: [
      ...queryKeys.exam.questions(params.categoryId, params.setId),
      freeOnly,
    ],
    enabled: (params.enabled ?? true) && Boolean(params.categoryId),
    queryFn: async () => {
      const [questions, total] = await Promise.all([
        params.setId
          ? listQuestionsInSet(params.setId, { freeOnly })
          : listDirectQuestions(params.categoryId, { freeOnly }),
        // Only worth a request when something is actually being withheld.
        freeOnly
          ? params.setId
            ? countQuestionsInSet(params.setId)
            : countDirectQuestions(params.categoryId)
          : Promise.resolve(0),
      ])

      return { questions, total }
    },
    // A paper does not change mid-sitting; refetching it would rebuild the
    // pool underneath the member.
    staleTime: 10 * 60 * 1000,
  })

  const paywalled = useMemo(() => {
    const questions = query.data?.questions ?? []

    const result = applyQuestionPaywall(
      questions,
      { isPremium: params.isPremiumCategory },
      viewer
    )

    if (!freeOnly) {
      return result
    }

    // The read was already narrowed, so `hiddenCount` has to come from the
    // total rather than from what came back.
    return {
      ...result,
      hiddenCount: Math.max((query.data?.total ?? 0) - result.visible.length, 0),
      isSample: true,
    }
  }, [freeOnly, params.isPremiumCategory, query.data, viewer])

  return { ...query, ...paywalled }
}

/**
 * The unfinished sitting on this exact paper, if there is one.
 *
 * The setup screen reads it so the button can say "Continue" rather than
 * "Start" — the session layer would resume it either way, and a button that
 * says one thing and does another is worse than no badge at all.
 */
export function useResumableSession(params: {
  categoryId: string
  questionnaireId: string
  enabled?: boolean
}) {
  const userId = useAuth((state) => state.user?.$id) ?? ""

  return useQuery({
    queryKey: [
      "session",
      "resumable",
      userId,
      params.categoryId,
      params.questionnaireId,
    ],
    enabled: (params.enabled ?? true) && Boolean(userId && params.categoryId),
    queryFn: () =>
      findResumableSession({
        userId,
        categoryId: params.categoryId,
        questionnaireId: params.questionnaireId,
      }),
    staleTime: 15 * 1000,
  })
}

/** SKUs this member has already answered, and the ones they got wrong. */
export function useAnswerHistory(params: {
  categoryId: string
  questionnaireId?: string
  enabled?: boolean
}) {
  const userId = useAuth((state) => state.user?.$id) ?? ""

  return useQuery({
    queryKey: queryKeys.member.answerStats(
      userId,
      `${params.categoryId}:${params.questionnaireId ?? ""}`
    ),
    enabled: (params.enabled ?? true) && Boolean(userId && params.categoryId),
    queryFn: async () => {
      // All three sources `questionSource` can ask for, fetched together.
      // `bookmarked` was the odd one out until v3 added the table — the option
      // shipped, nothing stored a bookmark, and choosing it silently returned
      // the whole paper.
      const [answered, incorrect, bookmarked] = await Promise.all([
        listAnsweredSkus({
          userId,
          categoryId: params.categoryId,
          questionnaireId: params.questionnaireId,
        }),
        listIncorrectSkus({
          userId,
          categoryId: params.categoryId,
          questionnaireId: params.questionnaireId,
        }),
        listBookmarkedSkus({ userId, categoryId: params.categoryId }),
      ])

      return { answered, incorrect, bookmarked }
    },
  })
}
