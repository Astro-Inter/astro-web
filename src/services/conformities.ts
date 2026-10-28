import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import { conformityOriginLabels, isConformityDate, validateConformityRequest } from '../utils/conformity'
import { validateSpreadsheetFile } from '../utils/spreadsheet'
import type { ConformityDetails, ConformityFormValues, ConformityImportResult, ConformityNrOption, ConformityResponse, ConformityStatus, CreateConformityRequest, UpdateConformityRequest } from '../types/conformity'

export class ConformitiesApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ConformitiesApiError'
  }
}

export async function requestConformities<T>(path: string, method = 'GET', payload?: object, signal?: AbortSignal): Promise<T> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new ConformitiesApiError('Entre na sua conta para gerenciar as conformidades.')
    const token = await user.getIdToken()
    signal?.throwIfAborted()
    const multipart = payload instanceof FormData
    const response = await fetch(`${getSystemApiBaseUrl()}${path}`, {
      method, signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(payload && !multipart ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: multipart ? payload : JSON.stringify(payload) } : {}),
    })
    const text = await response.text()
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* O servidor pode retornar erros sem JSON. */ }
    const result = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null
    if (!response.ok || result?.success === false) {
      const details = Array.isArray(result?.errors) ? result.errors.filter((item): item is string => typeof item === 'string').join(' ') : ''
      throw new ConformitiesApiError(details || (typeof result?.message === 'string' && result.message) ||
        (response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : response.status === 403 ? 'Você não tem permissão para gerenciar estas conformidades.' : response.status === 404 ? 'Conformidade, colaborador ou NR não encontrado no seu escopo.' : response.status === 409 ? 'Já existe uma conformidade aplicável para este colaborador e NR.' : response.status === 413 ? 'A planilha deve ter no máximo 10 MB.' : 'Não foi possível concluir a operação de conformidades. Tente novamente.'))
    }
    if (result?.success !== true) throw new ConformitiesApiError('A API retornou uma resposta inválida para conformidades.')
    return result.data as T
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof ConformitiesApiError) throw error
    throw new ConformitiesApiError('Não foi possível conectar à API de conformidades. Tente novamente.', { cause: error })
  }
}

function positiveId(value: number): boolean { return Number.isSafeInteger(value) && value > 0 }
function conformityPath(id: string): string {
  if (!/^[1-9]\d*$/.test(id) || !positiveId(Number(id))) throw new ConformitiesApiError('Identificador da conformidade inválido.')
  return `/conformities/collaborators/${id}`
}

const statuses: Record<ConformityResponse['status'], ConformityStatus> = { 'Válida': 'valid', 'Vencida': 'expired', 'Sem validade': 'no-expiry' }
export function toConformity(row: ConformityResponse): ConformityDetails {
  if (!row || !positiveId(row.id) || !positiveId(row.collaboratorId) || !positiveId(row.nrId)
    || typeof row.collaboratorName !== 'string' || typeof row.collaboratorEmail !== 'string' || typeof row.nrTitle !== 'string'
    || (row.expiresAt != null && (typeof row.expiresAt !== 'string' || !isConformityDate(row.expiresAt)))
    || !Object.hasOwn(conformityOriginLabels, row.origin) || typeof row.applicable !== 'boolean'
    || !Object.hasOwn(statuses, row.status) || (row.eventCompletionId != null && !positiveId(row.eventCompletionId))
    || (row.profilePhotoUrl != null && typeof row.profilePhotoUrl !== 'string') || (row.avatarInitials != null && typeof row.avatarInitials !== 'string')) {
    throw new ConformitiesApiError('A API retornou dados inválidos para a conformidade.')
  }
  return { id: String(row.id), employeeId: String(row.collaboratorId), employeeName: row.collaboratorName, employeeEmail: row.collaboratorEmail,
    nrId: row.nrId, nr: `NR ${row.nrId}`, nrTitle: row.nrTitle, expiresAt: row.expiresAt ?? null,
    origin: conformityOriginLabels[row.origin], applicable: row.applicable, eventCompletionId: row.eventCompletionId ?? null,
    status: statuses[row.status], profilePhotoUrl: row.profilePhotoUrl && /^https?:\/\//i.test(row.profilePhotoUrl) ? row.profilePhotoUrl : null, avatarInitials: row.avatarInitials || null }
}

export function conformityPayload(values: ConformityFormValues, editing = false): UpdateConformityRequest {
  const error = validateConformityRequest(values, editing)
  if (error) throw new ConformitiesApiError(error)
  return { nrId: Number(values.nr.slice(3)), expiresAt: values.expiresAt || null }
}

export async function listConformities(signal?: AbortSignal): Promise<ConformityDetails[]> {
  const data = await requestConformities<ConformityResponse[]>('/conformities/collaborators', 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new ConformitiesApiError('A API retornou uma lista de conformidades inválida.')
  return data.map(toConformity)
}

export async function getConformity(id: string, signal?: AbortSignal): Promise<ConformityDetails> {
  return toConformity(await requestConformities<ConformityResponse>(conformityPath(id), 'GET', undefined, signal))
}

export async function createConformity(values: ConformityFormValues, signal?: AbortSignal): Promise<ConformityDetails> {
  const payload: CreateConformityRequest = { ...conformityPayload(values), collaboratorId: Number(values.employeeId) }
  return toConformity(await requestConformities<ConformityResponse>('/conformities/collaborators', 'POST', payload, signal))
}

export async function updateConformity(id: string, values: ConformityFormValues, signal?: AbortSignal): Promise<ConformityDetails> {
  return toConformity(await requestConformities<ConformityResponse>(conformityPath(id), 'PUT', conformityPayload(values, true), signal))
}

export async function changeConformityApplicability(id: string, applicable: boolean, signal?: AbortSignal): Promise<ConformityDetails> {
  if (typeof applicable !== 'boolean') throw new ConformitiesApiError('Aplicabilidade inválida.')
  return toConformity(await requestConformities<ConformityResponse>(`${conformityPath(id)}/applicability`, 'PATCH', { applicable }, signal))
}

export async function importConformities(file: File, signal?: AbortSignal): Promise<ConformityImportResult> {
  const validation = validateSpreadsheetFile(file)
  if (!validation.valid) throw new ConformitiesApiError(validation.message)
  const payload = new FormData()
  payload.append('file', file)
  const data = await requestConformities<ConformityImportResult>('/conformities/collaborators/import', 'POST', payload, signal)
  if (!data || [data.processed, data.inserted, data.updated, data.rejected].some(value => !Number.isSafeInteger(value) || value < 0)
    || !Array.isArray(data.rejectedRows) || data.rejectedRows.some(row => !row || !positiveId(row.row) || typeof row.reason !== 'string' || typeof row.cpf !== 'string' || typeof row.nr !== 'string')) {
    throw new ConformitiesApiError('A API retornou um resultado de importação inválido.')
  }
  return data
}

export async function listConformityNrs(signal?: AbortSignal): Promise<ConformityNrOption[]> {
  const data = await requestConformities<ConformityNrOption[]>('/nrs', 'GET', undefined, signal)
  if (!Array.isArray(data) || data.some(row => !row || !positiveId(row.code) || typeof row.title !== 'string')) throw new ConformitiesApiError('A API retornou uma lista de NRs inválida.')
  return data
}
