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

export type FormApiStatus = 'RASCUNHO' | 'PENDENTE' | 'CONCLUIDO'
export type FormApiQuestionType = 'texto' | 'alternativa' | 'foto' | 'data'

export interface FormOptionRequest { id?: number; text: string; other: boolean }
export interface FormQuestionRequest {
  id?: number
  type: FormApiQuestionType
  question: string
  required: boolean
  multiple?: boolean
  options?: FormOptionRequest[]
  maxFiles?: number
  maxFileSizeMb?: number
}
export interface FormRequest {
  title: string
  description: string
  managerId: number | null
  nrCode: number | null
  unitId: number | null
  dueDate: string | null
  status: FormApiStatus
  questions: FormQuestionRequest[]
}
export interface FormQuestionResponse {
  id: number
  type: FormApiQuestionType
  question: string | null
  required: boolean
  multiple: boolean | null
  options: { id: number; text: string; other: boolean }[] | null
  maxFiles: number | null
  maxFileSizeMb: number | null
  answer: unknown[]
}
export interface FormDetailsResponse {
  id: string
  workspaceId: number
  senderManagerId: number
  managerId: number | null
  title: string | null
  description: string | null
  nrCode: number | null
  unitId: number | null
  dueDate: string | null
  status: FormApiStatus
  createdAt: string
  updatedAt: string
  respondedAt: string | null
  questions: FormQuestionResponse[]
}
export interface FormSummaryResponse {
  id: string; title: string | null; description: string | null; questionCount: number; status: FormApiStatus
}
export interface FormsPageResponse {
  items: FormSummaryResponse[]; page: number; size: number; totalElements: number; totalPages: number
}
export interface FormSelectOption { value: string; label: string; tone?: 'default' | 'muted' }
export interface FormEditorOptions {
  managers: FormSelectOption[]; nrs: FormSelectOption[]; units: FormSelectOption[]
  currentManagerId: string | null; managersError: string; managersLoading?: boolean
}
export interface FormRecipientsResponse {
  currentManagerId: number
  items: { id: number; name: string; unitName: string }[]
}
export type FormManagerOptions = Pick<FormEditorOptions, 'managers' | 'currentManagerId' | 'managersError'>
