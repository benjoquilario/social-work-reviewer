import { useCallback, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { Alert, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { FeedbackTiming, QuestionSource } from "@/lib/member/settings"
import { abandonStudySession } from "@/lib/session/study-session"
import {
  useAnswerHistory,
  useExamCategory,
  useExamQuestions,
  useQuestionSet,
} from "@/hooks/use-exam-content"
import { useExamSession } from "@/hooks/use-exam-session"
import { useMemberSettings } from "@/hooks/use-member-settings"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { useReport } from "@/hooks/use-report"
import { ReportDialog } from "@/components/report"
import { LockedPaper } from "@/components/exam/locked-paper"
import { ExamQuestionCard } from "@/components/exam/question-card"
import { QuestionNavigator } from "@/components/exam/question-navigator"
import { SessionFooter } from "@/components/exam/session-footer"
import { SessionResults } from "@/components/exam/session-results"
import { SessionTopBar } from "@/components/exam/session-top-bar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"

/**
 * ─── A sitting ────────────────────────────────────────────────────────────
 *
 * The screen is deliberately thin. Everything that could get the data wrong —
 * which items, in what order, which choice was really picked, what gets written
 * — lives in `useExamSession` and the modules under `lib/session`, so this file
 * is layout and navigation.
 */

type QuizParams = {
  categoryId?: string
  setId?: string
  questionCount?: string
  minutes?: string
  feedbackTiming?: string
  questionSource?: string
}

function parseNumber(value: string | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export default function QuizScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<QuizParams>()

  const user = useAuth((state) => state.user)
  const profile = useAuth((state) => state.profile)

  const categoryId = params.categoryId ?? ""
  const setId = params.setId?.trim() || ""

  const [isMapOpen, setIsMapOpen] = useState(false)
  const [isExitOpen, setIsExitOpen] = useState(false)
  const [isSubmitOpen, setIsSubmitOpen] = useState(false)

  const { settings: savedSettings, isLoading: isLoadingSettings } =
    useMemberSettings()

  /**
   * The setup screen's per-sitting overrides beat the saved preference.
   *
   * They are merged rather than written back: "a short one, at the end" is a
   * choice about today, not a change to how this member always wants to be
   * quizzed.
   */
  const settings = useMemo(() => {
    const feedbackTiming = params.feedbackTiming as FeedbackTiming | undefined
    const questionSource = params.questionSource as QuestionSource | undefined

    return {
      ...savedSettings,
      ...(feedbackTiming ? { feedbackTiming } : {}),
      ...(questionSource ? { questionSource } : {}),
    }
  }, [params.feedbackTiming, params.questionSource, savedSettings])

  const categoryQuery = useExamCategory(categoryId)
  const setQuery = useQuestionSet(setId)
  const category = categoryQuery.data ?? null
  const set = setId ? (setQuery.data ?? null) : null

  const questionsQuery = useExamQuestions({
    categoryId,
    setId: setId || null,
    isPremiumCategory: category?.isPremium ?? false,
    enabled: Boolean(category),
  })

  // Every source except "all" needs history. `bookmarked` was missing from
  // this list for as long as it was a dead setting — leaving it out now would
  // hand the pool an undefined set, which it treats as "no filter" and answers
  // with the whole paper.
  const needsHistory =
    settings.questionSource === "incorrect" ||
    settings.questionSource === "unanswered" ||
    settings.questionSource === "bookmarked"

  const historyQuery = useAnswerHistory({
    categoryId,
    questionnaireId: setId || undefined,
    enabled: Boolean(category && needsHistory),
  })

  const session = useExamSession({
    userId: user?.$id,
    profile,
    category,
    set,
    questions: questionsQuery.visible,
    settings,
    mode: setId ? "board_exam" : "quiz",
    questionLimit: parseNumber(params.questionCount),
    minutes: parseNumber(params.minutes),
    answeredSkus: historyQuery.data?.answered,
    incorrectSkus: historyQuery.data?.incorrect,
    bookmarkedSkus: historyQuery.data?.bookmarked,
    enabled:
      Boolean(user?.$id && category) &&
      !isLoadingSettings &&
      !questionsQuery.isLoading,
  })

  const label = set ? `${category?.title ?? ""} — ${set.title}` : (category?.title ?? "Session")

  // Saving and reporting the item on screen. Both are scoped to the question,
  // not the sitting, so they survive a resume and mean the same thing in a
  // review as they do mid-paper.
  const bookmarks = useBookmarks(categoryId)
  const report = useReport()
  const activeSku = session.activeQuestion?.question.sku ?? ""

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleExit = useCallback(() => {
    // The row stays `in_progress` on purpose: that is what puts this paper
    // under "Continue where you left off" rather than losing it.
    setIsExitOpen(false)
    router.back()
  }, [router])

  const handleAbandon = useCallback(async () => {
    if (session.session) {
      await abandonStudySession(session.session.sessionId)
    }

    setIsExitOpen(false)
    router.back()
  }, [router, session.session])

  const handleSubmit = useCallback(() => {
    setIsSubmitOpen(false)
    void session.submit()
  }, [session])

  const handleTimeUp = useCallback(() => {
    Alert.alert("Time is up", "Your answers have been submitted.")
    void session.submit()
  }, [session])

  const handleJump = useCallback(
    (index: number) => {
      session.goTo(index)
      setIsMapOpen(false)
    },
    [session]
  )

  const handleRetry = useCallback(() => {
    router.replace({ pathname: "/quiz", params })
  }, [params, router])

  // ─── States ───────────────────────────────────────────────────────────────

  if (!categoryId) {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 py-4">
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          tone="destructive"
          title="Nothing to answer"
          description="This link is missing the paper it should open."
          action={
            <Button
              size="sm"
              variant="outline"
              onPress={() => router.replace("/board-exams")}
            >
              <Text>Browse categories</Text>
            </Button>
          }
        />
      </SafeAreaView>
    )
  }

  if (
    questionsQuery.isLoading ||
    categoryQuery.isLoading ||
    isLoadingSettings ||
    session.status === "preparing" ||
    session.status === "idle"
  ) {
    return (
      <SafeAreaView className="flex-1 gap-3 bg-background px-4 py-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Skeleton className="h-8 rounded-md" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-14 rounded-md" />
        <Skeleton className="h-14 rounded-md" />
        <Skeleton className="h-14 rounded-md" />
      </SafeAreaView>
    )
  }

  if (session.status === "error") {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 py-4">
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          tone="destructive"
          title="Could not start this sitting"
          description={
            session.error?.message ??
            "Something went wrong opening your session. Please try again."
          }
          action={
            <Button size="sm" variant="outline" onPress={() => router.back()}>
              <Text>Go back</Text>
            </Button>
          }
        />
      </SafeAreaView>
    )
  }

  // Nothing to answer, because it is all behind the paywall. Reachable by a
  // deep link or by a subscription lapsing mid-paper, and "nothing matched"
  // would be a lie about why.
  if (session.questionCount === 0 && questionsQuery.hiddenCount > 0) {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 py-4">
        <Stack.Screen options={{ headerShown: false }} />
        <LockedPaper
          title={label}
          questionCount={questionsQuery.hiddenCount}
          onUpgrade={() => router.push("/premium")}
          onBack={() => router.replace("/board-exams")}
        />
      </SafeAreaView>
    )
  }

  if (session.questionCount === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 py-4">
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          title="Nothing matched"
          description="No questions fit the filters for this paper. Try a different source or difficulty."
          action={
            <Button size="sm" variant="outline" onPress={() => router.back()}>
              <Text>Change setup</Text>
            </Button>
          }
        />
      </SafeAreaView>
    )
  }

  if (session.status === "complete" && session.result) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <SessionResults
          label={label}
          pool={session.pool}
          answers={session.answers}
          correctCount={session.result.correctCount}
          answeredCount={session.result.answeredCount}
          durationSeconds={session.result.durationSeconds}
          showExplanations={settings.showExplanations}
          // They have just done the work and seen a score. If there is more
          // behind the paywall, this is the moment worth saying so.
          hiddenCount={questionsQuery.hiddenCount}
          onDone={() => router.back()}
          onRetry={handleRetry}
          onUpgrade={
            questionsQuery.hiddenCount > 0
              ? () => router.push("/premium")
              : undefined
          }
        />
      </SafeAreaView>
    )
  }

  // ─── The sitting ──────────────────────────────────────────────────────────

  const isLast = session.activeIndex === session.questionCount - 1

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <SessionTopBar
        position={session.activeIndex + 1}
        total={session.questionCount}
        answeredCount={session.answeredCount}
        endsAtMs={session.endsAtMs}
        onExpire={handleTimeUp}
        onOpenMap={() => setIsMapOpen(true)}
        onExit={() => setIsExitOpen(true)}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {session.activeQuestion ? (
          <ExamQuestionCard
            presented={session.activeQuestion}
            total={session.questionCount}
            selectedIndex={session.selectedIndex}
            feedbackTiming={settings.feedbackTiming}
            isRevealed={session.isRevealed}
            showExplanations={session.showExplanations}
            onSelect={session.selectChoice}
            isSaved={bookmarks.isSaved(activeSku)}
            onToggleSave={() => bookmarks.toggle(activeSku)}
            onReport={() =>
              // The SKU, not the row id: row ids are reissued on re-import, so
              // a report filed against one points at nothing by the time
              // somebody works the queue (gotcha 5).
              report.open({ contentType: "question", contentId: activeSku })
            }
          />
        ) : null}

        {session.didResume ? (
          <View className="pt-3">
            <Text variant="caption" className="text-center">
              Picked up where you left off.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <SessionFooter
        feedbackTiming={settings.feedbackTiming}
        isFirst={session.activeIndex === 0}
        isLast={isLast}
        hasSelection={session.selectedIndex !== undefined}
        isRevealed={session.isRevealed}
        allowSkip={settings.allowSkip}
        isSubmitting={session.status === "submitting"}
        onPrevious={session.goPrevious}
        onNext={session.goNext}
        onConfirm={session.confirmAnswer}
        onSubmit={() => setIsSubmitOpen(true)}
      />

      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jump to a question</DialogTitle>
          </DialogHeader>

          <View className="max-h-[50vh]">
            <QuestionNavigator
              total={session.questionCount}
              currentIndex={session.activeIndex}
              answeredIndices={session.answeredIndices}
              onJump={handleJump}
            />
          </View>
        </DialogContent>
      </Dialog>

      <ReportDialog
        open={report.isOpen}
        contentType={report.contentType}
        onOpenChange={(open) => {
          if (!open) {
            report.close()
          }
        }}
        onSubmit={report.submit}
      />

      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit this sitting?</DialogTitle>
          </DialogHeader>

          <Text variant="callout">
            {session.answeredCount === session.questionCount
              ? "You have answered everything."
              : `${session.questionCount - session.answeredCount} question${
                  session.questionCount - session.answeredCount === 1 ? "" : "s"
                } left unanswered. They will be marked as missed.`}
          </Text>

          <DialogFooter className="flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setIsSubmitOpen(false)}
            >
              <Text>Keep going</Text>
            </Button>
            <Button className="flex-1" onPress={handleSubmit}>
              <Text>Submit</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExitOpen} onOpenChange={setIsExitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave this sitting?</DialogTitle>
          </DialogHeader>

          <Text variant="callout">
            Your answers are saved. You can pick this paper back up from where
            you stopped.
          </Text>

          <DialogFooter className="flex-row">
            <Button variant="outline" className="flex-1" onPress={handleExit}>
              <Text>Save and leave</Text>
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onPress={() => void handleAbandon()}
            >
              <Text>Discard</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  )
}
