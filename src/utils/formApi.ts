import type { CreateFormValues, FormApiQuestionType, FormApiStatus, FormDetailsResponse, FormQuestion, FormRequest, FormStatus, FormSummary, FormSummaryResponse } from '../types/forms'
import { validateAndSanitizeForm } from './forms'
import { decodeFormCardTitle, encodeFormCardTitle } from './cardTitleMetadata'

export const formApiStatuses: Record<FormStatus, FormApiStatus> = { draft: 'RASCUNHO', pending: 'PENDENTE', completed: 'CONCLUIDO' }
const statuses: Record<FormApiStatus, FormStatus> = { RASCUNHO: 'draft', PENDENTE: 'pending', CONCLUIDO: 'completed' }
const types: Record<FormApiQuestionType, FormQuestion['kind']> = { texto: 'text', alternativa: 'option', foto: 'photo', data: 'date' }
const apiTypes = { text: 'texto', option: 'alternativa', photo: 'foto', date: 'data' } as const
export const emptyFormValues: CreateFormValues = { name: '', description: '', manager: '', nr: '', unit: '', deadline: '', questions: [] }
export const isFormId = (id: string): boolean => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
export const isFormReferenceId = (id: string): boolean => /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))

export function formSummary(row: FormSummaryResponse): FormSummary {
  const title = decodeFormCardTitle(row.title)
  const appearance = row.appearance ?? title.appearance
  return { id: row.id, name: title.title || 'Formulário sem título', description: row.description ?? '', questionCount: row.questionCount,
    status: statuses[row.status], icon: appearance?.icon ?? 'document', color: appearance?.color ?? (row.status === 'CONCLUIDO' ? 'green' : row.status === 'RASCUNHO' ? 'blue' : 'purple') }
}

export function formValues(row: FormDetailsResponse): CreateFormValues {
  const title = decodeFormCardTitle(row.title)
  return { name: title.title, appearance: row.appearance ?? title.appearance, description: row.description ?? '', manager: row.managerId === null ? '' : String(row.managerId),
    nr: row.nrCode === null ? '' : String(row.nrCode), unit: row.unitId === null ? '' : String(row.unitId), deadline: row.dueDate ?? '',
    questions: row.questions.map(q => ({ id: String(q.id), kind: types[q.type], title: q.question ?? '', answer: '',
      options: (q.options ?? []).map(o => ({ id: String(o.id), value: o.text, isOther: o.other })),
      multiple: q.multiple ?? false, required: q.required,
      ...(q.type === 'foto' ? { maxFiles: q.maxFiles ?? 1, maxFileSizeMb: q.maxFileSizeMb ?? 10 } : {}),
    })) }
}

export function formRequest(input: CreateFormValues, status: FormApiStatus, existing?: FormDetailsResponse): FormRequest {
  if (status === 'CONCLUIDO') throw new Error('Formulários concluídos não podem ser alterados.')
  const validation = validateAndSanitizeForm(input, status === 'RASCUNHO')
  const error = Object.values(validation.errors)[0]
  if (error) throw new Error(error)
  const values = validation.values
  for (const [field, label] of [['manager', 'gestor'], ['nr', 'NR'], ['unit', 'unidade']] as const) {
    if (values[field] && !isFormReferenceId(values[field])) throw new Error(`Selecione um identificador válido para ${label}.`)
  }
  return { title: encodeFormCardTitle(values.name, values.appearance), description: values.description, managerId: values.manager ? Number(values.manager) : null,
    nrCode: values.nr ? Number(values.nr) : null, unitId: values.unit ? Number(values.unit) : null, dueDate: values.deadline || null, status,
    questions: values.questions.map(q => {
      if (q.kind === 'nr' || q.kind === 'unit') throw new Error('Selecione NR e unidade nas informações do formulário.')
      const old = existing?.questions.find(item => String(item.id) === q.id)
      return { ...(old ? { id: old.id } : {}), type: apiTypes[q.kind], question: q.title, required: q.required,
        ...(q.kind === 'option' ? { multiple: q.multiple, options: q.options.map(o => {
          const oldOption = old?.options?.find(item => String(item.id) === o.id)
          return { ...(oldOption ? { id: oldOption.id } : {}), text: o.isOther ? 'Outros' : o.value, other: o.isOther ?? false }
        }) } : {}),
        ...(q.kind === 'photo' ? { maxFiles: q.maxFiles, maxFileSizeMb: q.maxFileSizeMb } : {}),
      }
    }) }
}

export function formHasResponses(form: FormDetailsResponse): boolean {
  return form.status === 'CONCLUIDO' || form.respondedAt !== null || form.questions.some(q => q.answer.length > 0)
}
