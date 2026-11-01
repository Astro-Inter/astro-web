import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import { listUnitNrOptions, listUnits } from './units'
import { formApiStatuses, formRequest, isFormId, isFormReferenceId } from '../utils/formApi'
import { isFormCardAppearance } from '../data/formCardAppearance'
import { validateAndSanitizeFormFilters } from '../utils/formFilters'
import { matchesCountRange, validateListFilters } from '../utils/listFilters'
import type { FormQuestionFilters } from '../types/forms'
import type { CreateFormValues, FormDetailsResponse, FormEditorOptions, FormManagerOptions, FormRecipientsResponse, FormsPageResponse, FormStatus, FormSummaryResponse } from '../types/forms'

export class FormsApiError extends Error {
  readonly status?: number
  constructor(message: string, options?: ErrorOptions, status?: number) { super(message, options); this.name = 'FormsApiError'; this.status = status }
}

export async function requestForms<T>(path: string, method = 'GET', payload?: object, signal?: AbortSignal): Promise<T> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new FormsApiError('Entre na sua conta para acessar os formulários.')
    const token = await user.getIdToken()
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new FormsApiError('Sua sessão mudou. Entre novamente.')
    const response = await fetch(`${getSystemApiBaseUrl()}${path}`, {
      method, signal, headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    })
    const text = await response.text()
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new FormsApiError('Sua sessão mudou. Entre novamente.')
    if (method === 'DELETE' && response.status === 204) return undefined as T
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* Erros de proxy podem vir sem JSON. */ }
    const result = body && typeof body === 'object' ? body as Record<string, unknown> : null
    if (!response.ok || result?.success === false) {
      const errors = Array.isArray(result?.errors) ? result.errors.filter((item): item is string => typeof item === 'string').join(' ') : ''
      throw new FormsApiError(errors || (typeof result?.message === 'string' && result.message)
        || (response.status === 401 ? 'Sua sessão expirou. Entre novamente.'
          : response.status === 403 ? 'Você não tem permissão para esta operação de formulários.'
            : response.status === 404 ? 'Formulário ou vínculo não encontrado no seu workspace.'
              : response.status === 409 ? 'O formulário recebeu respostas ou foi alterado. Consulte novamente antes de tentar outra vez.'
                : 'Não foi possível concluir a operação de formulários. Tente novamente.'), undefined, response.status)
    }
    if (result?.success !== true || !('data' in result)) throw new FormsApiError('A API retornou uma resposta inválida para formulários.')
    return result.data as T
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof FormsApiError) throw error
    throw new FormsApiError('Não foi possível conectar à API de formulários. Tente novamente.', { cause: error })
  }
}

function formPath(id: string): string {
  if (!isFormId(id)) throw new FormsApiError('Identificador do formulário inválido.')
  return `/forms/${id}`
}
const positiveId = (id: number) => isFormReferenceId(String(id))
const nullableText = (value: unknown) => value === null || typeof value === 'string'
const validStatus = (value: string) => ['RASCUNHO', 'PENDENTE', 'CONCLUIDO'].includes(value)
const validDate = (value: string | null) => value === null || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value)
const validAppearance = (value: unknown) => value == null || isFormCardAppearance(value)
const validSummary = (row: FormSummaryResponse) => row && validAppearance(row.appearance) && isFormId(row.id) && nullableText(row.title) && nullableText(row.description)
  && Number.isSafeInteger(row.questionCount) && row.questionCount >= 0 && row.questionCount <= 100 && validStatus(row.status)

export function parseFormDetails(row: FormDetailsResponse): FormDetailsResponse {
  if (!row || !validAppearance(row.appearance) || !isFormId(row.id) || !positiveId(row.workspaceId) || !positiveId(row.senderManagerId)
    || [row.managerId, row.nrCode, row.unitId].some(id => id !== null && !positiveId(id))
    || !nullableText(row.title) || !nullableText(row.description) || !validStatus(row.status) || !validDate(row.dueDate)
    || typeof row.createdAt !== 'string' || typeof row.updatedAt !== 'string' || !nullableText(row.respondedAt)
    || !Array.isArray(row.questions) || row.questions.length > 100
    || row.questions.some(q => !q || !positiveId(q.id) || !['texto', 'alternativa', 'foto', 'data'].includes(q.type)
      || !nullableText(q.question) || typeof q.required !== 'boolean' || (q.multiple !== null && typeof q.multiple !== 'boolean')
      || !Array.isArray(q.answer) || (q.options !== null && (!Array.isArray(q.options)
        || new Set(q.options.map(o => o?.id)).size !== q.options.length
        || q.options.some(o => !o || !positiveId(o.id) || typeof o.text !== 'string' || typeof o.other !== 'boolean')))
      || (q.type === 'foto' && (!positiveId(q.maxFiles ?? 0) || (q.maxFiles ?? 0) > 10 || !positiveId(q.maxFileSizeMb ?? 0) || (q.maxFileSizeMb ?? 0) > 100)))
    || new Set(row.questions.map(q => q.id)).size !== row.questions.length) {
    throw new FormsApiError('A API retornou detalhes inválidos para o formulário.')
  }
  return row
}

async function listFormsPage(search: string, status: FormStatus | '', page: number, size: number, signal?: AbortSignal): Promise<FormsPageResponse> {
  const validation = validateAndSanitizeFormFilters({ search, status, page, size })
  if (!validation.values) throw new FormsApiError(`Filtros ou paginação de formulários inválidos. ${Object.values(validation.errors)[0]}`)
  const filters = validation.values
  const query = new URLSearchParams({ page: String(filters.page), size: String(filters.size) })
  if (filters.search) query.set('search', filters.search)
  if (filters.status) query.set('status', formApiStatuses[filters.status])
  const data = await requestForms<FormsPageResponse>(`/forms?${query}`, 'GET', undefined, signal)
  if (!data || !Array.isArray(data.items) || data.items.some(row => !validSummary(row))
    || data.page !== page || data.size !== size || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0
    || !Number.isSafeInteger(data.totalPages) || data.totalPages !== Math.ceil(data.totalElements / size)
    || data.items.length > size) throw new FormsApiError('A API retornou uma lista de formulários inválida.')
  return data
}

export async function listForms(search: string, status: FormStatus | '', page: number, size: number, signal?: AbortSignal, quantities?: FormQuestionFilters): Promise<FormsPageResponse> {
  const validation = validateAndSanitizeFormFilters({ search, status, page, size })
  if (!validation.values) throw new FormsApiError(`Filtros ou paginação de formulários inválidos. ${Object.values(validation.errors)[0]}`)
  if (quantities && (quantities.minimum || quantities.maximum)) {
    const errors = validateListFilters([{ id: 'minimum', label: 'Mínimo', kind: 'number' }, { id: 'maximum', label: 'Máximo', kind: 'number', minimumField: 'minimum' }], { ...quantities })
    if (Object.keys(errors).length) throw new FormsApiError(Object.values(errors)[0])
    // O endpoint não filtra quantidade de perguntas. Filtra o conjunto completo
    // antes de paginar, para não ocultar resultados existentes em outras páginas.
    const all: FormSummaryResponse[] = []
    for (const bucket of (status ? [status] : ['draft', 'pending', 'completed']) as FormStatus[]) {
      const first = await listFormsPage(search, bucket, 0, 100, signal)
      all.push(...first.items)
      for (let next = 1; next < first.totalPages; next++) {
        signal?.throwIfAborted()
        all.push(...(await listFormsPage(search, bucket, next, 100, signal)).items)
      }
    }
    const matches = all.filter(form => matchesCountRange(form.questionCount, quantities.minimum, quantities.maximum))
    return { items: matches.slice(page * size, (page + 1) * size), page, size, totalElements: matches.length, totalPages: Math.ceil(matches.length / size) }
  }
  if (status) return listFormsPage(search, status, page, size, signal)
  // A API pagina por status. Compõe a página global nessa ordem sem carregar
  // todos os formulários nem ordenar somente os quatro cards já recebidos.
  const statuses: FormStatus[] = ['draft', 'pending', 'completed']
  const firstPages = await Promise.all(statuses.map(value => listFormsPage(search, value, 0, size, signal)))
  const totalElements = firstPages.reduce((total, result) => total + result.totalElements, 0)
  const items: FormSummaryResponse[] = []
  let offset = page * size
  for (const [index, first] of firstPages.entries()) {
    if (offset >= first.totalElements) { offset -= first.totalElements; continue }
    while (offset < first.totalElements && items.length < size) {
      signal?.throwIfAborted()
      const bucketPage = Math.floor(offset / size)
      const result = bucketPage === 0 ? first : await listFormsPage(search, statuses[index], bucketPage, size, signal)
      const entries = result.items.slice(offset % size, offset % size + size - items.length)
      if (!entries.length) throw new FormsApiError('A lista de formulários mudou. Tente novamente.')
      items.push(...entries)
      offset += entries.length
    }
    offset = 0
    if (items.length === size) break
  }
  signal?.throwIfAborted()
  return { items, page, size, totalElements, totalPages: Math.ceil(totalElements / size) }
}
export async function getForm(id: string, signal?: AbortSignal): Promise<FormDetailsResponse> {
  return parseFormDetails(await requestForms<FormDetailsResponse>(formPath(id), 'GET', undefined, signal))
}
export async function createForm(values: CreateFormValues, draft = false, signal?: AbortSignal): Promise<FormDetailsResponse> {
  return parseFormDetails(await requestForms<FormDetailsResponse>('/forms', 'POST', formRequest(values, draft ? 'RASCUNHO' : 'PENDENTE'), signal))
}
export async function updateForm(id: string, values: CreateFormValues, existing: FormDetailsResponse, signal?: AbortSignal): Promise<FormDetailsResponse> {
  if (existing.id !== id) throw new FormsApiError('Consulte o formulário antes de salvar.')
  return parseFormDetails(await requestForms<FormDetailsResponse>(formPath(id), 'PUT', formRequest(values, existing.status, existing), signal))
}
export async function deleteForm(id: string, signal?: AbortSignal): Promise<void> {
  await requestForms<void>(formPath(id), 'DELETE', undefined, signal)
}
export async function publishForm(id: string, signal?: AbortSignal): Promise<FormDetailsResponse> {
  return parseFormDetails(await requestForms<FormDetailsResponse>(`${formPath(id)}/publish`, 'POST', undefined, signal))
}

export async function getFormRecipients(signal?: AbortSignal): Promise<FormManagerOptions> {
  const data = await requestForms<FormRecipientsResponse>('/forms/recipients', 'GET', undefined, signal)
  if (!data || !positiveId(data.currentManagerId) || !Array.isArray(data.items)
    || data.items.some(manager => !manager || !positiveId(manager.id) || typeof manager.name !== 'string' || !manager.name.trim() || typeof manager.unitName !== 'string')
    || new Set(data.items.map(manager => manager.id)).size !== data.items.length) throw new FormsApiError('A API retornou destinatários de formulário inválidos.')
  return {
    currentManagerId: String(data.currentManagerId), managersError: '',
    managers: data.items.filter(manager => manager.id !== data.currentManagerId)
      .map(manager => ({ value: String(manager.id), label: manager.unitName ? `${manager.name} — ${manager.unitName}` : manager.name })),
  }
}

export async function getFormOptions(signal?: AbortSignal): Promise<FormEditorOptions> {
  const user = firebaseAuth.currentUser
  const [recipients, units] = await Promise.all([
    getFormRecipients(signal).catch((error: unknown): FormManagerOptions => {
      if (signal?.aborted) throw error
      return { managers: [], currentManagerId: null, managersError: 'Não foi possível carregar os gestores destinatários. Tente novamente.' }
    }),
    listUnits(signal),
  ])
  signal?.throwIfAborted()
  if (firebaseAuth.currentUser !== user) throw new FormsApiError('Sua sessão mudou. Entre novamente.')
  const activeUnits = units.filter(unit => unit.active)
  // O catálogo de opções de uma unidade contém todas as NRs de usabilidade Empresa.
  // "ativo" indica apenas a associação à unidade, não a classificação da NR.
  const nrs = activeUnits[0] ? await listUnitNrOptions(activeUnits[0].id, signal) : []
  signal?.throwIfAborted()
  if (firebaseAuth.currentUser !== user) throw new FormsApiError('Sua sessão mudou. Entre novamente.')
  return {
    ...recipients,
    units: activeUnits.map(unit => ({ value: unit.id, label: unit.name })),
    nrs: nrs.map(nr => ({ value: String(nr.nr), label: `NR ${nr.nr} — ${nr.descricao}` })),
  }
}
