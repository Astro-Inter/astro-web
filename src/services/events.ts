import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import { listRoles, listRoleNrOptions } from './roles'
import { eventRequest } from '../utils/eventApi'
import type { EventConfiguration } from '../types/eventCreation'
import type { CollaboratorEventDetailsResponse, CollaboratorEventResponse, EventCalendarResponse, EventCandidateResponse, EventCompletionResponse, EventNrOption, EventResponse } from '../types/events'

export class EventsApiError extends Error {
  constructor(message: string, options?: ErrorOptions) { super(message, options); this.name = 'EventsApiError' }
}

async function requestEvents<T>(path: string, method = 'GET', payload?: object, signal?: AbortSignal): Promise<T> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new EventsApiError('Entre na sua conta para acessar os eventos.')
    const token = await user.getIdToken()
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new EventsApiError('Sua sessão mudou. Entre novamente para acessar os eventos.')
    const multipart = payload instanceof FormData
    const response = await fetch(`${getSystemApiBaseUrl()}${path}`, {
      method, signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(payload && !multipart ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: multipart ? payload : JSON.stringify(payload) } : {}),
    })
    const text = await response.text()
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new EventsApiError('Sua sessão mudou. Entre novamente para acessar os eventos.')
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* A API pode responder sem JSON. */ }
    const result = body && typeof body === 'object' ? body as Record<string, unknown> : null
    if (!response.ok || result?.success === false) {
      const errors = Array.isArray(result?.errors) ? result.errors.filter((item): item is string => typeof item === 'string').join(' ') : ''
      throw new EventsApiError(errors || (typeof result?.message === 'string' && result.message)
        || (response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : response.status === 403 ? 'Você não tem permissão para esta operação de eventos.' : 'Não foi possível concluir a operação de eventos. Tente novamente.'))
    }
    if (result?.success !== true || !('data' in result)) throw new EventsApiError('A API retornou uma resposta inválida para eventos.')
    return result.data as T
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof EventsApiError) throw error
    throw new EventsApiError('Não foi possível conectar à API de eventos. Tente novamente.', { cause: error })
  }
}

function idPath(id: string): string {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new EventsApiError('Identificador do evento inválido.')
  return `/events/${id}`
}
const validId = (id: number) => Number.isSafeInteger(id) && id > 0
const validDate = (date: string) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(date) && Number.isFinite(new Date(date).getTime())
const validStatus = (status: string) => ['ATIVO', 'CONCLUIDO', 'CANCELADO'].includes(status)

function detail(data: EventResponse): EventResponse {
  if (!data || !validId(data.id) || !validId(data.managerId) || typeof data.title !== 'string' || typeof data.description !== 'string'
    || (data.nrId !== null && !validId(data.nrId)) || (data.externalLink !== null && typeof data.externalLink !== 'string')
    || !validStatus(data.status) || !['COLABORADOR', 'GESTOR'].includes(data.completionMode) || typeof data.mandatoryEvidence !== 'boolean'
    || [data.canEdit, data.canCancel, data.detailsEditable].some(flag => typeof flag !== 'boolean') || !Array.isArray(data.eventClasses)
    || data.eventClasses.some(group => !group || !validId(group.id) || typeof group.name !== 'string' || !validDate(group.startDate) || !validDate(group.endDate)
      || group.endDate <= group.startDate || typeof group.editable !== 'boolean' || !Array.isArray(group.participants)
      || group.participants.some(person => !person || !validId(person.id) || typeof person.name !== 'string' || (person.email !== null && typeof person.email !== 'string')))) {
    throw new EventsApiError('A API retornou detalhes inválidos para o evento.')
  }
  return data
}

export async function listEvents(startDate: string, endDate: string, signal?: AbortSignal): Promise<EventCalendarResponse[]> {
  if (!validDate(startDate) || !validDate(endDate) || endDate <= startDate) throw new EventsApiError('Período do calendário inválido.')
  const data = await requestEvents<EventCalendarResponse[]>(`/events?${new URLSearchParams({ startDate, endDate })}`, 'GET', undefined, signal)
  if (!Array.isArray(data) || data.some(row => !row || !validId(row.eventId) || !validId(row.eventClassId) || typeof row.eventTitle !== 'string'
    || !validDate(row.startDate) || !validDate(row.endDate) || row.endDate <= row.startDate || !validStatus(row.status))) throw new EventsApiError('A API retornou um calendário inválido.')
  return data
}
export async function getEvent(id: string, signal?: AbortSignal): Promise<EventResponse> {
  return detail(await requestEvents<EventResponse>(idPath(id), 'GET', undefined, signal))
}
export async function createEvent(value: EventConfiguration, signal?: AbortSignal): Promise<EventResponse> {
  return detail(await requestEvents<EventResponse>('/events', 'POST', eventRequest(value, false), signal))
}
export async function updateEvent(id: string, value: EventConfiguration, signal?: AbortSignal): Promise<EventResponse> {
  return detail(await requestEvents<EventResponse>(idPath(id), 'PATCH', eventRequest(value, true), signal))
}
export async function cancelEvent(id: string, reason: string, signal?: AbortSignal): Promise<EventResponse> {
  const normalized = reason.trim()
  if (normalized.length < 3 || normalized.length > 1000) throw new EventsApiError('Informe uma justificativa de 3 a 1000 caracteres.')
  return detail(await requestEvents<EventResponse>(`${idPath(id)}/cancellation`, 'PATCH', { reason: normalized }, signal))
}
export async function listEventCandidates(nrId?: string, signal?: AbortSignal): Promise<EventCandidateResponse[]> {
  if (nrId && (!/^[1-9]\d*$/.test(nrId) || !validId(Number(nrId)))) throw new EventsApiError('Identificador da NR inválido.')
  const data = await requestEvents<EventCandidateResponse[]>(`/events/eligible-candidates${nrId ? `?${new URLSearchParams({ nrId })}` : ''}`, 'GET', undefined, signal)
  if (!Array.isArray(data) || data.some(row => !row || !validId(row.id) || typeof row.name !== 'string' || (row.email !== null && typeof row.email !== 'string')
    || (row.unitName !== null && typeof row.unitName !== 'string') || (row.roleName !== null && typeof row.roleName !== 'string')
    || (row.workModel !== null && !['PRESENCIAL', 'REMOTO', 'HIBRIDO'].includes(row.workModel)))) throw new EventsApiError('A API retornou candidatos inválidos.')
  return data
}
export async function listEventNrs(signal?: AbortSignal): Promise<EventNrOption[]> {
  const user = firebaseAuth.currentUser
  const [data, roles] = await Promise.all([
    requestEvents<EventNrOption[]>('/nrs', 'GET', undefined, signal),
    listRoles(signal),
  ])
  signal?.throwIfAborted()
  if (firebaseAuth.currentUser !== user) throw new EventsApiError('Sua sessão mudou. Entre novamente para acessar os eventos.')
  if (!Array.isArray(data) || data.some(row => !row || !validId(row.code) || typeof row.title !== 'string')) throw new EventsApiError('A API retornou NRs inválidas.')
  // As opções de qualquer cargo contêm todo o catálogo de usabilidade Colaborador.
  // "ativo" informa apenas o vínculo com aquele cargo e não filtra este dropdown.
  const role = roles.find(item => item.active) ?? roles[0]
  if (!role) return []
  const options = await listRoleNrOptions(role.id, signal)
  signal?.throwIfAborted()
  if (firebaseAuth.currentUser !== user) throw new EventsApiError('Sua sessão mudou. Entre novamente para acessar os eventos.')
  const collaboratorNrs = new Set(options.map(row => row.nr))
  return data.filter(row => collaboratorNrs.has(row.code))
}

// Contratos do aplicativo do colaborador. O painel web autentica apenas gestores.
export async function listCollaboratorEvents(signal?: AbortSignal): Promise<CollaboratorEventResponse[]> {
  const data = await requestEvents<CollaboratorEventResponse[]>('/events/collaborator', 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new EventsApiError('A API retornou uma lista de eventos inválida.')
  return data
}
export async function getCollaboratorEvent(id: string, signal?: AbortSignal): Promise<CollaboratorEventDetailsResponse> {
  idPath(id)
  return requestEvents<CollaboratorEventDetailsResponse>(`/events/collaborator/${id}`, 'GET', undefined, signal)
}
export async function requestEventCompletion(id: string, files: readonly File[], signal?: AbortSignal): Promise<EventCompletionResponse> {
  if (files.length > 3 || files.some(file => file.size > 50 * 1024 * 1024)) throw new EventsApiError('Envie até três arquivos de no máximo 50 MB cada.')
  const payload = new FormData()
  files.forEach(file => payload.append('files', file))
  return requestEvents<EventCompletionResponse>(`${idPath(id)}/completion`, 'POST', payload, signal)
}
