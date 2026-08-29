import { assertContentConfigured, getRowSafe, listAll } from "../db"
import { Query } from "../appwrite"
import type { ExamCategoryDocument, QuestionnaireMode } from "../schema"
import { canOpenCategory, type ContentViewer } from "./access"

/**
 * ─── Exam categories ──────────────────────────────────────────────────────
 *
 * The parent of everything on the exam side. A category holds either lettered
 * sets, loose questions, or — unusually but legally — both.
 *
 * The three counts on the row are maintained by the CMS on every upload, set
 * change and delete. They are read-only here, and they are why the app never
 * has to query the sets table just to decide which screen to open (section 2).
 */

export type ExamCategory = {
  id: string
  title: string
  code: string | null
  description: string
  /** Where the category surfaces: a quick quiz or a board-exam paper. */
  mode: QuestionnaireMode
  order: number
  isPremium: boolean
  /** Everything in the category, sets included. */
  questionCount: number
  /** Published sets only, so a draft never opens an empty picker. */
  setCount: number
  /** Items sitting directly under the category, outside any set. */
  directQuestionCount: number
  isLocked: boolean
}

/**
 * Which screen a category opens.
 *
 * Answered from the row, never from a count query — that is the whole point of
 * the CMS maintaining `setCount`.
 */
export type CategoryDestination =
  | { kind: "sets"; setCount: number }
  | { kind: "questions"; questionCount: number }
  | { kind: "empty" }

export function getCategoryDestination(
  category: ExamCategory
): CategoryDestination {
  if (category.setCount > 0) {
    return { kind: "sets", setCount: category.setCount }
  }

  if (category.directQuestionCount > 0) {
    return {
      kind: "questions",
      questionCount: category.directQuestionCount,
    }
  }

  return { kind: "empty" }
}

export function toExamCategory(
  row: ExamCategoryDocument,
  viewer: ContentViewer
): ExamCategory {
  const isPremium = row.isPremium === true

  return {
    id: row.$id,
    title: row.title ?? "Untitled",
    code: row.code?.trim() || null,
    description: row.description?.trim() ?? "",
    mode: row.mode ?? "board_exam",
    order: row.order ?? 1,
    isPremium,
    questionCount: row.questionCount ?? 0,
    setCount: row.setCount ?? 0,
    directQuestionCount: row.directQuestionCount ?? 0,
    isLocked: !canOpenCategory({ isPremium }, viewer),
  }
}

export type ListExamCategoriesOptions = {
  mode?: QuestionnaireMode
  viewer: ContentViewer
  /** Keep categories the CMS has not put any questions in yet. Off by default. */
  includeEmpty?: boolean
}

export async function listExamCategories(
  options: ListExamCategoriesOptions
): Promise<ExamCategory[]> {
  assertContentConfigured()

  const rows = await listAll(
    "exam_categories",
    [
      Query.equal("isPublished", true),
      ...(options.mode ? [Query.equal("mode", options.mode)] : []),
      Query.orderAsc("order"),
    ],
    { label: "exam categories" }
  )

  const categories = rows.map((row) => toExamCategory(row, options.viewer))

  if (options.includeEmpty) {
    return categories
  }

  // An empty category is an authoring artefact, not something a member should
  // be able to tap into a blank screen.
  return categories.filter(
    (category) => getCategoryDestination(category).kind !== "empty"
  )
}

export async function getExamCategory(
  categoryId: string,
  viewer: ContentViewer
): Promise<ExamCategory | null> {
  assertContentConfigured()

  if (!categoryId) {
    return null
  }

  const row = await getRowSafe("exam_categories", categoryId)

  return row ? toExamCategory(row, viewer) : null
}

/**
 * Categories by ID in one request, for screens that show a mixed list —
 * "continue where you left off", the activity timeline, search results.
 */
export async function getExamCategoriesByIds(
  categoryIds: string[],
  viewer: ContentViewer
): Promise<Map<string, ExamCategory>> {
  const unique = Array.from(new Set(categoryIds.filter(Boolean)))
  const byId = new Map<string, ExamCategory>()

  if (unique.length === 0) {
    return byId
  }

  const rows = await listAll("exam_categories", [Query.equal("$id", unique)], {
    label: "exam categories by id",
  })

  for (const row of rows) {
    byId.set(row.$id, toExamCategory(row, viewer))
  }

  return byId
}
