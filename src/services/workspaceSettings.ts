import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import { validateWorkspaceCompany, validateWorkspaceManagerId, workspaceUnitPayload } from '../utils/workspaceSettings'
import { validateSpreadsheetFile } from '../utils/spreadsheet'
import type { CompanyInformation } from '../types/company'
import type { WorkspaceUnitAddress } from '../types/address'
import type { SpreadsheetImportMessage, WorkspaceImportResult, WorkspaceManagerTransferResult, WorkspaceResponse } from '../types/workspaceSettings'

export class WorkspaceApiError extends Error {
  readonly status: number
  readonly rows: SpreadsheetImportMessage[]
  constructor(message: string, status = 0, rows: SpreadsheetImportMessage[] = []) {
    super(message)
    this.name = 'WorkspaceApiError'
    this.status = status
    this.rows = rows
  }
}

function importMessages(value: unknown): SpreadsheetImportMessage[] {
  if (!Array.isArray(value)) return []
  return value.filter((row): row is SpreadsheetImportMessage => row !== null && typeof row === 'object'
    && Number.isSafeInteger(row.row) && row.row > 0 && typeof row.field === 'string' && typeof row.message === 'string')
}

export async function requestWorkspace<T>(path: string, method = 'GET', payload?: object | FormData, signal?: AbortSignal): Promise<T> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new WorkspaceApiError('Entre na sua conta para configurar o workspace.', 401)
    const token = await user.getIdToken()
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new WorkspaceApiError('Sua sessão mudou. Entre novamente.', 401)
    const multipart = payload instanceof FormData
    const response = await fetch(`${getSystemApiBaseUrl()}${path}`, {
      method, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000),
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(payload && !multipart ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: multipart ? payload : JSON.stringify(payload) } : {}),
    })
    const text = await response.text()
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new WorkspaceApiError('Sua sessão mudou. Entre novamente.', 401)
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* O servidor pode responder sem JSON. */ }
    const result = body && typeof body === 'object' ? body as Record<string, unknown> : null
    if (!response.ok || result?.success === false) {
      const fallback: Record<number, string> = {
        400: 'Confira os dados informados.', 401: 'Sua sessão expirou. Entre novamente.',
        403: 'Somente o responsável ativo pode configurar o workspace.', 404: 'Recurso não encontrado. Verifique se a API de configurações está disponível.',
        409: 'Há um conflito de dados. Confira as informações.', 413: 'A planilha excede o limite de 10 MiB.', 422: 'Corrija as linhas da planilha e envie novamente.',
      }
      const details = Array.isArray(result?.errors) ? result.errors.filter((value): value is string => typeof value === 'string') : []
      const message = typeof result?.message === 'string' ? result.message : ''
      throw new WorkspaceApiError([...new Set([message, ...details].map(value => value.trim()).filter(Boolean))].join(' ') || fallback[response.status] || 'Não foi possível concluir a operação.', response.status, importMessages(result?.data))
    }
    if (result?.success !== true || !('data' in result)) throw new WorkspaceApiError('A API retornou uma resposta inválida para o workspace.')
    return result.data as T
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof WorkspaceApiError) throw error
    throw new WorkspaceApiError('Não foi possível conectar à API do workspace. Confira a conexão e tente novamente.')
  }
}

function toWorkspace(value: WorkspaceResponse): WorkspaceResponse {
  if (!value || !Number.isSafeInteger(value.id) || value.id <= 0 || typeof value.name !== 'string' || typeof value.cnpj !== 'string') {
    throw new WorkspaceApiError('A API retornou informações inválidas da empresa.')
  }
  return { id: value.id, name: value.name, cnpj: value.cnpj }
}

export async function getWorkspace(signal?: AbortSignal): Promise<WorkspaceResponse> {
  return toWorkspace(await requestWorkspace<WorkspaceResponse>('/workspace', 'GET', undefined, signal))
}

export async function updateWorkspace(company: CompanyInformation, signal?: AbortSignal): Promise<WorkspaceResponse> {
  const errors = validateWorkspaceCompany(company)
  if (Object.keys(errors).length) throw new WorkspaceApiError(Object.values(errors).join(' '))
  return toWorkspace(await requestWorkspace<WorkspaceResponse>('/workspace', 'PUT', {
    name: company.name.trim(), cnpj: company.cnpj.replace(/[./\s-]/g, ''),
  }, signal))
}

export async function importWorkspace(file: File, units: WorkspaceUnitAddress[], signal?: AbortSignal): Promise<WorkspaceImportResult> {
  const validation = validateSpreadsheetFile(file)
  if (!validation.valid) throw new WorkspaceApiError(validation.message)
  if (units.length > 100) throw new WorkspaceApiError('Informe no máximo 100 unidades novas por importação.')
  const payload = units.map(workspaceUnitPayload)
  const form = new FormData()
  form.append('file', file)
  if (payload.length) form.append('data', new Blob([JSON.stringify({ units: payload })], { type: 'application/json' }))
  const result = await requestWorkspace<WorkspaceImportResult>('/workspace/import', 'POST', form, signal)
  if (!result || [result.created, result.updated, result.unchanged, result.unitsCreated, result.rolesCreated].some(value => !Number.isSafeInteger(value) || value < 0)
    || !Array.isArray(result.ignored) || importMessages(result.ignored).length !== result.ignored.length) throw new WorkspaceApiError('A importação respondeu sem um resumo válido. Confira os dados antes de reenviar.')
  return result
}

export async function transferWorkspaceManager(id: string, signal?: AbortSignal): Promise<WorkspaceManagerTransferResult> {
  const error = validateWorkspaceManagerId(id)
  if (error) throw new WorkspaceApiError(error)
  const result = await requestWorkspace<WorkspaceManagerTransferResult>('/workspace/manager-transfer', 'POST', { newManagerId: Number(id) }, signal)
  if (!result || [result.workspaceId, result.previousManagerId, result.newManagerId].some(value => !Number.isSafeInteger(value) || value <= 0)) {
    throw new WorkspaceApiError('A transferência respondeu sem confirmação válida. Atualize sua sessão antes de tentar novamente.')
  }
  return result
}
