import type { LegacyQuestionnaireDocument, LegacyQuestionnaireQuestionType } from "./schema"

export type BoardExamCatalogSet = {
  id: string
  categoryId: string
  questionnaireKey: string
  title: string
  setCode: string
  description: string
  order: number
  questionType: LegacyQuestionnaireQuestionType
  isPremium?: boolean
  storageFileId?: string
  storageFileName?: string
  loadLocal: () => LegacyQuestionnaireDocument
}

export type BoardExamCatalogCategory = {
  id: string
  questionnaireKey: string
  title: string
  description: string
  code: string
  order: number
  sets: BoardExamCatalogSet[]
}

function readLocalQuestionnaire(
  value:
    | LegacyQuestionnaireDocument
    | {
        default: LegacyQuestionnaireDocument
      }
) {
  return "default" in value ? value.default : value
}

export const boardExamCatalog: BoardExamCatalogCategory[] = [
  {
    id: "history_social_conditions_issues_co_drill",
    questionnaireKey: "history_social_conditions_issues_co_drill",
    title: "History, Social Conditions, Issues, and CO Drill",
    description:
      "Board exam drill focused on history, social conditions, current issues, and community organization.",
    code: "HSCI",
    order: 1,
    sets: [
      {
        id: "history_social_conditions_issues_co_drill-set-a",
        categoryId: "history_social_conditions_issues_co_drill",
        questionnaireKey: "history_social_conditions_issues_co_drill",
        title: "Set A",
        setCode: "Set A",
        description:
          "Multiple-choice practice questions for board exam review.",
        order: 1,
        questionType: "multiple_choice",
        storageFileName: "set-a.json",
        loadLocal: () =>
          readLocalQuestionnaire(
            require("../questionaires/board_exams/history_social_conditions_issues_co_drill/set-a.json")
          ),
      },
    ],
  },
]

export function listBoardExamCatalogCategories() {
  return [...boardExamCatalog].sort((left, right) => left.order - right.order)
}

export function getBoardExamCatalogCategory(categoryId: string) {
  return boardExamCatalog.find((category) => category.id === categoryId) ?? null
}

export function getBoardExamCatalogSet(setId: string) {
  for (const category of boardExamCatalog) {
    const match = category.sets.find((set) => set.id === setId)
    if (match) {
      return match
    }
  }

  return null
}
