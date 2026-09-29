export type FormQuestionKind = 'option' | 'text' | 'photo' | 'date' | 'nr' | 'unit'

export interface FormQuestion {
  id: string
  kind: FormQuestionKind
  title: string
  answer: string
  options: { id: string; value: string; isOther?: boolean }[]
  multiple: boolean
  required: boolean
  maxFiles?: number
  maxFileSizeMb?: number
}

export interface CreateFormValues {
  name: string
  description: string
  manager: string
  nr: string
  unit: string
  deadline: string
  questions: FormQuestion[]
}

export type FormStatus = 'pending' | 'completed' | 'draft'

export interface FormSummary {
  id: string
  name: string
  description: string
  questionCount: number
  status: FormStatus
  icon: 'document' | 'calendar' | 'feedback' | 'person-outline'
  color: 'purple' | 'pink' | 'blue' | 'green'
}
