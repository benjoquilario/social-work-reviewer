import { COLLECTIONS, DB_ID, Query, tablesDB } from "../appwrite"
import { getBoardExamCatalogSet } from "../board-exam-catalog"
import type { UserAnswerDocument } from "../schema"
import type { ExamAttempt } from "./types"

const QUIZ_SESSION_QUERY_LIMIT = 500

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

export async function listUserQuizSessions(params: {
  userId: string
  examIds?: string[]
}) {
  const queries = [
    Query.equal("userId", params.userId),
    Query.orderDesc("answeredAt"),
    Query.limit(QUIZ_SESSION_QUERY_LIMIT),
  ]

  if (params.examIds && params.examIds.length > 0) {
    queries.unshift(Query.equal("topicId", params.examIds))
  }

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: COLLECTIONS.USER_ANSWERS,
    queries,
  })

  return summarizeQuizSessions(rows as unknown as UserAnswerDocument[])
}

export function getQuizSessionTitle(attempt: Pick<ExamAttempt, "examId">) {
  const boardExamMeta = parseBoardExamSessionExamId(attempt.examId)

  if (boardExamMeta) {
    return getBoardExamCatalogSet(boardExamMeta.setId)?.title ?? "Board Exam"
  }

  return "Quiz Session"
}
