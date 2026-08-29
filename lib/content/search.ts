import { Query } from "../appwrite"
import { listPage } from "../db"
import type { ContentViewer } from "./access"

/**
 * ─── Search ───────────────────────────────────────────────────────────────
 *
 * New in v3, and it could not exist before it: `Query.search` requires a
 * fulltext index and no table had one. There are six now (section 16).
 *
 * `questions.prompt` is the one members reach for. *"I remember an item about
 * the Social Work Law but I cannot find it"* had no answer in this app except
 * scrolling, which for a bank of several hundred items is not an answer.
 *
 * Three properties of fulltext decide the shape of everything below, and each
 * one is a bug if you forget it:
 *
 *   • **Whole words only.** `soc` does not match `social`. A search-as-you-type
 *     field that sends every keystroke returns nothing for the first four of
 *     them and looks broken, so `toSearchTerm` appends a trailing `*`.
 *   • **No sorting alongside it.** Combining `Query.search` with an `orderDesc`
 *     on a different column is an error, not a slow query. Nothing here orders.
 *   • **The index does not know about entitlement.** Searching `questions`
 *     searches the paid bank too, so the `isFree` restriction has to be applied
 *     here exactly as the pool reads apply it (section 19, item 3).
 */

/** Below this, fulltext has nothing useful to match and will mostly return noise. */
export const MIN_SEARCH_LENGTH = 3

const RESULTS_PER_TABLE = 12

export type SearchResultKind =
  | "question"
  | "material"
  | "subject"
  | "topic"
  | "category"

export type SearchResult = {
  kind: SearchResultKind
  id: string
  title: string
  /** One line of context — which subject, which paper, whether it is locked. */
  subtitle: string
  /** Everything a caller needs to route without a second read. */
  categoryId?: string
  questionnaireId?: string
  subjectId?: string
  topicId?: string
  isLocked?: boolean
}

export type SearchResults = {
  questions: SearchResult[]
  materials: SearchResult[]
  subjects: SearchResult[]
  topics: SearchResult[]
  categories: SearchResult[]
  /** True when nothing anywhere matched — one flag beats five length checks. */
  isEmpty: boolean
}

export const EMPTY_SEARCH_RESULTS: SearchResults = {
  questions: [],
  materials: [],
  subjects: [],
  topics: [],
  categories: [],
  isEmpty: true,
}

/**
 * A raw input turned into something fulltext will actually match.
 *
 * The trailing `*` is what makes typing feel live. A leading one would be more
 * useful still and is not supported — `*ocial` matches nothing — so partial
 * words only complete forwards, and that is worth knowing before someone files
 * it as a bug.
 */
export function toSearchTerm(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, " ")

  if (trimmed.length < MIN_SEARCH_LENGTH) {
    return null
  }

  return trimmed.endsWith("*") ? trimmed : `${trimmed}*`
}

function truncate(value: string, limit = 110) {
  const clean = value.replace(/\s+/g, " ").trim()
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean
}

// ─── Per-table searches ─────────────────────────────────────────────────────

async function searchQuestions(
  term: string,
  viewer: ContentViewer
): Promise<SearchResult[]> {
  // Entitlement is not something the index knows. A member who is not paying
  // gets the free samples only — the same restriction the session pool applies,
  // for the same reason: the app should not hand out what it is selling.
  const { rows } = await listPage(
    "questions",
    [
      Query.search("prompt", term),
      ...(viewer.isPremium ? [] : [Query.equal("isFree", true)]),
      Query.select([
        "$id",
        "sku",
        "categoryId",
        "questionnaireId",
        "prompt",
        "difficulty",
        "isFree",
      ]),
    ],
    RESULTS_PER_TABLE
  )

  return rows.map((row) => ({
    kind: "question" as const,
    id: row.$id,
    title: truncate(row.prompt ?? ""),
    subtitle: row.isFree ? "Free sample" : (row.difficulty ?? "Question"),
    categoryId: row.categoryId ?? "",
    questionnaireId: row.questionnaireId ?? "",
  }))
}

async function searchMaterials(
  term: string,
  viewer: ContentViewer,
  field: "title" | "content"
): Promise<SearchResult[]> {
  const { rows } = await listPage(
    "learning_materials",
    [
      Query.search(field, term),
      Query.equal("isPublished", true),
      // Never `content` in the projection, whichever column was searched. The
      // body of a paid lesson has no business on the device of somebody who
      // has not bought it, and a search result needs a title, not a body.
      Query.select([
        "$id",
        "topicId",
        "subjectId",
        "title",
        "type",
        "isPremium",
      ]),
    ],
    RESULTS_PER_TABLE
  )

  return rows.map((row) => {
    const isLocked = Boolean(row.isPremium) && !viewer.isPremium

    return {
      kind: "material" as const,
      id: row.$id,
      title: row.title ?? "",
      subtitle: isLocked ? "Part of the membership" : (row.type ?? "Reading"),
      topicId: row.topicId ?? "",
      subjectId: row.subjectId ?? "",
      isLocked,
    }
  })
}

async function searchSubjects(term: string): Promise<SearchResult[]> {
  const { rows } = await listPage(
    "subjects",
    [
      Query.search("name", term),
      Query.equal("isPublished", true),
      Query.select(["$id", "name", "topicCount"]),
    ],
    RESULTS_PER_TABLE
  )

  return rows.map((row) => ({
    kind: "subject" as const,
    id: row.$id,
    title: row.name ?? "",
    subtitle: `${row.topicCount ?? 0} topic${row.topicCount === 1 ? "" : "s"}`,
    subjectId: row.$id,
  }))
}

async function searchTopics(term: string): Promise<SearchResult[]> {
  const { rows } = await listPage(
    "topics",
    [
      Query.search("title", term),
      Query.equal("isPublished", true),
      Query.select(["$id", "title", "subjectId", "materialCount"]),
    ],
    RESULTS_PER_TABLE
  )

  return rows.map((row) => ({
    kind: "topic" as const,
    id: row.$id,
    title: row.title ?? "",
    subtitle: `${row.materialCount ?? 0} lesson${
      row.materialCount === 1 ? "" : "s"
    }`,
    subjectId: row.subjectId ?? "",
    topicId: row.$id,
  }))
}

async function searchCategories(
  term: string,
  viewer: ContentViewer
): Promise<SearchResult[]> {
  const { rows } = await listPage(
    "exam_categories",
    [
      Query.search("title", term),
      Query.equal("isPublished", true),
      Query.select(["$id", "title", "questionCount", "isPremium"]),
    ],
    RESULTS_PER_TABLE
  )

  return rows.map((row) => {
    const isLocked = Boolean(row.isPremium) && !viewer.isPremium

    return {
      kind: "category" as const,
      id: row.$id,
      title: row.title ?? "",
      subtitle: isLocked
        ? "Part of the membership"
        : `${row.questionCount ?? 0} question${
            row.questionCount === 1 ? "" : "s"
          }`,
      categoryId: row.$id,
      isLocked,
    }
  })
}

// ─── The one entry point ────────────────────────────────────────────────────

export type SearchScope = "all" | "questions" | "library"

export async function searchContent(params: {
  term: string
  viewer: ContentViewer
  scope?: SearchScope
  /**
   * Searching inside lesson bodies is the most useful and the most expensive
   * — `content` is a 20,000-character column. Off by default, so the fast
   * search runs on every keystroke and this one runs when they ask for it.
   */
  includeLessonText?: boolean
}): Promise<SearchResults> {
  const term = toSearchTerm(params.term)

  if (!term) {
    return EMPTY_SEARCH_RESULTS
  }

  const scope = params.scope ?? "all"
  const wantsQuestions = scope === "all" || scope === "questions"
  const wantsLibrary = scope === "all" || scope === "library"

  const [questions, materialsByTitle, materialsByText, subjects, topics, categories] =
    await Promise.all([
      wantsQuestions ? searchQuestions(term, params.viewer) : [],
      wantsLibrary ? searchMaterials(term, params.viewer, "title") : [],
      wantsLibrary && params.includeLessonText
        ? searchMaterials(term, params.viewer, "content")
        : [],
      wantsLibrary ? searchSubjects(term) : [],
      wantsLibrary ? searchTopics(term) : [],
      wantsQuestions ? searchCategories(term, params.viewer) : [],
    ])

  // A lesson whose title and body both match is one result, not two — and the
  // title hit is the better one, so it wins the position.
  const seen = new Set(materialsByTitle.map((row) => row.id))
  const materials = [
    ...materialsByTitle,
    ...materialsByText.filter((row) => !seen.has(row.id)),
  ]

  return {
    questions,
    materials,
    subjects,
    topics,
    categories,
    isEmpty:
      questions.length === 0 &&
      materials.length === 0 &&
      subjects.length === 0 &&
      topics.length === 0 &&
      categories.length === 0,
  }
}
