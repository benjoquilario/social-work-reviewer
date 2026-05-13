export type QuizQuestion = {
  id: string
  questionId: string
  categoryId: string
  prompt: string
  choices: string[]
  choiceIds: string[]
  answerIndex: number
  explanation: string
  sourceQuestionId?: number
  questionnaireKey?: string
  setName?: "Set A" | "Set B" | "Set C" | "Set D"
}
