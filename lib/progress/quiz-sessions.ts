import { COLLECTIONS, DB_ID, Query, tablesDB } from "../appwrite"
import { getBoardExamCatalogSet } from "../board-exam-catalog"
import type { UserAnswerDocument } from "../schema"
import type { ExamAttempt } from "./types"

const QUIZ_SESSION_PAGE_SIZE = 500
/** 10 × 500 = 5,000 answer rows, i.e. ~50 full 100-item board exams. */
const QUIZ_SESSION_MAX_PAGES = 10

export function parseBoardExamSessionExamId(examId: string) {
  if (!examId.startsWith("board-exam:")) {
    return null
  }

  const [, setId = "", totalQuestions = "", minutes = ""] = examId.split(":")
  const parsedTotalQuestions = Number(totalQuestions)
  const parsedMinutes = Number(minutes)

  if (!setId || !Number.isFinite(parsedTotalQuestions) || !Number.isFinite(parsedMinutes)) {
    return null
  }

  return {
    setId,
    totalQuestions: Math.max(Math.round(parsedTotalQuestions), 0),
    minutes: Math.max(Math.round(parsedMinutes), 0),
  }
}

function getAnswerTimestamp(row: UserAnswerDocument) {
  return row.answeredAt ?? row.$createdAt
}

function buildSessionSummary(
  sessionId: string,
  rows: UserAnswerDocument[]
): ExamAttempt {
  const sortedRows = [...rows].sort((left, right) =>
    getAnswerTimestamp(left).localeCompare(getAnswerTimestamp(right))
  )
  const firstRow = sortedRows[0]
  const lastRow = sortedRows[sortedRows.length - 1]
  const examId =
    firstRow?.topicId?.trim() ||
    firstRow?.questionnaireKey?.trim() ||
    `session:${sessionId}`
  const uniqueQuestionIds = new Set(
    sortedRows
      .map((row) => row.questionId?.trim())
      .filter((value): value is string => Boolean(value))
  )
  const answeredCount = uniqueQuestionIds.size
  const score = sortedRows.filter((row) => row.isCorrect).length
  const boardExamMeta = parseBoardExamSessionExamId(examId)
  const totalItems = Math.max(boardExamMeta?.totalQuestions ?? answeredCount, 1)
  const startedAt = getAnswerTimestamp(firstRow)
  const lastAnsweredAt = getAnswerTimestamp(lastRow)
  const elapsedSeconds = Math.max(
    Math.round(
      (new Date(lastAnsweredAt).getTime() - new Date(startedAt).getTime()) / 1000
    ),
    0
  )
  const isResumable = answeredCount < totalItems

  return {
    $id: sessionId,
    userId: firstRow?.userId ?? "",
    examId,
    score,
    totalItems,
    timeTaken: elapsedSeconds,
    status: isResumable ? "ongoing" : "done",
    startedAt,
    finishedAt: isResumable ? null : lastAnsweredAt,
    currentQuestionIndex: isResumable
      ? Math.min(answeredCount, Math.max(totalItems - 1, 0))
      : Math.max(totalItems - 1, 0),
    isResumable,
    lastAnsweredAt,
  }
}

export function summarizeQuizSessions(answerRows: UserAnswerDocument[]) {
  const rowsBySessionId = new Map<string, UserAnswerDocument[]>()

  for (const row of answerRows) {
    const sessionId = row.sessionId?.trim()

    if (!sessionId) {
      continue
    }

    const current = rowsBySessionId.get(sessionId) ?? []
    current.push(row)
    rowsBySessionId.set(sessionId, current)
  }

  return Array.from(rowsBySessionId.entries())
    .map(([sessionId, rows]) => buildSessionSummary(sessionId, rows))
    .sort((left, right) =>
      (right.lastAnsweredAt ?? right.startedAt).localeCompare(
        left.lastAnsweredAt ?? left.startedAt
      )
    )
}

/**
 * Every answer row for a user, newest first, gathered by cursor paging.
 *
 * A single `limit(500)` request used to back this. Because sessions are
 * reconstructed by grouping answer rows, that cap did more than shorten the
 * list: a 100-item board exam is 100 rows, so past ~5 exams the oldest session
 * in the window arrived half-loaded, `answeredCount` came out below
 * `totalItems`, and a finished exam was reported as `"ongoing"` — reappearing
 * under "Resume answering". Paging fixes the common case; `truncated` covers
 * the rest.
 */
async function listUserAnswerRows(params: {
  userId: string
  examIds?: string[]
}) {
  const baseQueries = [
    Query.equal("userId", params.userId),
    Query.orderDesc("answeredAt"),
  ]

  if (params.examIds && params.examIds.length > 0) {
    baseQueries.unshift(Query.equal("topicId", params.examIds))
  }

  const rows: UserAnswerDocument[] = []
  let cursorAfterId: string | null = null

  for (let page = 0; page < QUIZ_SESSION_MAX_PAGES; page += 1) {
    const response = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: COLLECTIONS.USER_ANSWERS,
      queries: [
        ...baseQueries,
        Query.limit(QUIZ_SESSION_PAGE_SIZE),
        ...(cursorAfterId ? [Query.cursorAfter(cursorAfterId)] : []),
      ],
    })

    const pageRows = response.rows as unknown as UserAnswerDocument[]
    rows.push(...pageRows)

    if (pageRows.length < QUIZ_SESSION_PAGE_SIZE) {
      return { rows, truncated: false }
    }

    const nextCursor = pageRows[pageRows.length - 1]?.$id ?? null

    if (!nextCursor || nextCursor === cursorAfterId) {
      return { rows, truncated: false }
    }

    cursorAfterId = nextCursor
  }

  return { rows, truncated: true }
}

export async function listUserQuizSessions(params: {
  userId: string
  examIds?: string[]
}) {
  const { rows, truncated } = await listUserAnswerRows(params)
  const sessions = summarizeQuizSessions(rows)

  if (!truncated) {
    return sessions
  }

  // We stopped mid-history, so the oldest session we saw is the one that may be
  // missing rows. Drop it rather than publish a completed attempt as resumable.
  console.warn(
    `[progress] listUserQuizSessions: userId=${params.userId} has more than ${
      QUIZ_SESSION_PAGE_SIZE * QUIZ_SESSION_MAX_PAGES
    } answer rows. Older sessions are omitted — consider persisting a quiz_sessions row per attempt instead of deriving sessions from user_answers.`
  )

  return sessions.slice(0, Math.max(sessions.length - 1, 0))
}

export function getQuizSessionTitle(attempt: Pick<ExamAttempt, "examId">) {
  const boardExamMeta = parseBoardExamSessionExamId(attempt.examId)

  if (boardExamMeta) {
    return getBoardExamCatalogSet(boardExamMeta.setId)?.title ?? "Board Exam"
  }

  return "Quiz Session"
}
