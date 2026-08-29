import { useCallback } from "react"
import { Stack, useRouter } from "expo-router"
import { Search as SearchIcon } from "lucide-react-native"
import { ActivityIndicator, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { SearchResult } from "@/lib/content/search"
import { MIN_SEARCH_LENGTH } from "@/lib/content/search"
import { useThemePalette } from "@/hooks/use-theme"
import { useSearch } from "@/hooks/use-search"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { ScreenHeader } from "@/components/screen-header"
import { SearchResultRow } from "@/components/search/search-result-row"

/**
 * ─── Search ───────────────────────────────────────────────────────────────
 *
 * Possible for the first time in v3 — `Query.search` needs a fulltext index and
 * until now no table had one.
 *
 * Grouped by kind rather than merged into one ranked list, because the engine's
 * ranking cannot be combined with our own ordering (section 16) and a merged
 * list would put a subject title above the exact question somebody was looking
 * for. Questions come first: that is what people are searching for.
 */

type SectionProps = {
  title: string
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
}

function ResultSection({ title, results, onSelect }: SectionProps) {
  if (results.length === 0) {
    return null
  }

  return (
    <View className="gap-1.5">
      <Text variant="eyebrow" className="px-1">
        {title}
      </Text>
      <View className="gap-1.5">
        {results.map((result) => (
          <SearchResultRow
            key={`${result.kind}-${result.id}`}
            result={result}
            onPress={onSelect}
          />
        ))}
      </View>
    </View>
  )
}

export default function SearchScreen() {
  const router = useRouter()
  const theme = useThemePalette()
  const search = useSearch("all")

  /**
   * Where a hit goes.
   *
   * A question routes to its category rather than to itself: there is no
   * single-question screen, and dropping somebody into the middle of a paper
   * with no way back is worse than landing them one level up with the paper
   * open.
   */
  const handleSelect = useCallback(
    (result: SearchResult) => {
      switch (result.kind) {
        case "question":
        case "category":
          router.push(`/board-exams/${result.categoryId}`)
          break
        case "material":
          router.push(`/learn/${result.id}`)
          break
        case "topic":
          router.push(`/learn/topic/${result.id}`)
          break
        case "subject":
          router.push(`/review/${result.id}`)
          break
      }
    },
    [router]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-4">
        <ScreenHeader title="Search" />

        <View className="pb-3">
          <Input
            value={search.term}
            onChangeText={search.setTerm}
            placeholder="A question, a lesson, a topic"
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            leading={
              <SearchIcon
                size={16}
                color={theme.mutedForeground}
                strokeWidth={2.2}
              />
            }
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {search.term.trim().length === 0 ? (
          <EmptyState
            title="What are you looking for?"
            description="Search the question bank by wording, or the library by lesson, topic and subject."
          />
        ) : search.isTooShort ? (
          // Said plainly, because a fulltext index genuinely cannot answer a
          // two-letter query and silence would read as "nothing found".
          <EmptyState
            title="Keep typing"
            description={`Search needs at least ${MIN_SEARCH_LENGTH} letters to match a whole word.`}
          />
        ) : search.isLoading || search.isTyping ? (
          <View className="items-center py-10">
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : search.results.isEmpty ? (
          <EmptyState
            title="Nothing matched"
            description="Search matches whole words, so try a fuller one — or a different term."
            action={
              !search.includeLessonText ? (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => search.setIncludeLessonText(true)}
                >
                  <Text>Search inside lessons too</Text>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <View className="gap-5">
            <ResultSection
              title="Questions"
              results={search.results.questions}
              onSelect={handleSelect}
            />
            <ResultSection
              title="Exam categories"
              results={search.results.categories}
              onSelect={handleSelect}
            />
            <ResultSection
              title="Lessons"
              results={search.results.materials}
              onSelect={handleSelect}
            />
            <ResultSection
              title="Topics"
              results={search.results.topics}
              onSelect={handleSelect}
            />
            <ResultSection
              title="Subjects"
              results={search.results.subjects}
              onSelect={handleSelect}
            />

            {!search.includeLessonText ? (
              // Opt-in, because `content` is a 20,000-character column and
              // running it on every keystroke is the one search that would be
              // felt on a slow connection.
              <Button
                size="sm"
                variant="outline"
                onPress={() => search.setIncludeLessonText(true)}
              >
                <Text>Also search inside lesson text</Text>
              </Button>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
