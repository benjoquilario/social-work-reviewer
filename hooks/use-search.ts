import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import {
  EMPTY_SEARCH_RESULTS,
  MIN_SEARCH_LENGTH,
  searchContent,
  type SearchScope,
} from "@/lib/content/search"
import { queryKeys } from "@/lib/query-keys"
import { useContentViewer } from "@/hooks/use-exam-content"

/**
 * Search, debounced.
 *
 * Every keystroke is five parallel fulltext reads, so sending them raw would
 * put a dozen requests in the air for one word and settle them out of order —
 * the classic result being the answer to "socia" landing after the answer to
 * "social" and overwriting it.
 *
 * 250ms is chosen to sit under the threshold where typing feels acknowledged
 * while still collapsing a whole word into one request.
 */

const DEBOUNCE_MS = 250

export function useSearch(scope: SearchScope = "all") {
  const [term, setTerm] = useState("")
  const [debounced, setDebounced] = useState("")
  const [includeLessonText, setIncludeLessonText] = useState(false)
  const viewer = useContentViewer()

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term])

  const isTermUsable = debounced.trim().length >= MIN_SEARCH_LENGTH

  const query = useQuery({
    queryKey: [
      ...queryKeys.search.query(scope, debounced.trim(), viewer.isPremium),
      includeLessonText,
    ],
    enabled: isTermUsable,
    queryFn: () =>
      searchContent({
        term: debounced,
        viewer,
        scope,
        includeLessonText,
      }),
    staleTime: 60 * 1000,
  })

  const results = query.data ?? EMPTY_SEARCH_RESULTS

  const totalCount = useMemo(
    () =>
      results.questions.length +
      results.materials.length +
      results.subjects.length +
      results.topics.length +
      results.categories.length,
    [results]
  )

  return {
    term,
    setTerm,
    /** True while the user has typed something the index cannot use yet. */
    isTooShort: term.trim().length > 0 && term.trim().length < MIN_SEARCH_LENGTH,
    /** True between the keystroke and the debounced request going out. */
    isTyping: term !== debounced,
    isLoading: query.isFetching,
    results,
    totalCount,
    hasSearched: isTermUsable && query.isFetched,
    includeLessonText,
    setIncludeLessonText,
  }
}
