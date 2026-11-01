import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import { formatCpfCnpj } from '../utils/inputFormatting'
import { isPositiveId, validateCollaborator } from '../utils/collaborator'
import { validateManagerInvite } from '../utils/manager'
import type { ManagerDetails, ManagerDetailsResponse, ManagerFormValues, ManagerInviteValues, ManagerSummary, ManagerSummaryResponse, PromoteManagerRequest, UpdateManagerRequest } from '../types/manager'

export class ManagersApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ManagersApiError'
  }
}

async function requestManagers<T>(path: string, method = 'GET', payload?: object, signal?: AbortSignal): Promise<T> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new ManagersApiError('Entre na sua conta para gerenciar os gestores.')
    const token = await user.getIdToken()
    signal?.throwIfAborted()
    const response = await fetch(`${getSystemApiBaseUrl()}${path}`, {
      method, signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    })
    const text = await response.text()
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* O servidor pode retornar erros sem JSON. */ }
    const result = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null
    if (!response.ok || result?.success === false) {
      const details = Array.isArray(result?.errors) ? result.errors.filter((item): item is string => typeof item === 'string').join(' ') : ''
      throw new ManagersApiError(details || (typeof result?.message === 'string' && result.message) ||
        (response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : response.status === 403 ? 'Você não tem permissão para gerenciar estes gestores.' : response.status === 404 ? 'Gestor, colaborador, cargo ou unidade não encontrado no seu workspace.' : 'Não foi possível concluir a operação de gestores. Tente novamente.'))
    }
    if (result?.success !== true) throw new ManagersApiError('A API retornou uma resposta inválida para gestores.')
    return result.data as T
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof ManagersApiError) throw error
    throw new ManagersApiError('Não foi possível conectar à API de gestores. Tente novamente.', { cause: error })
  }
}

function managerPath(id: string): string {
  if (!isPositiveId(id)) throw new ManagersApiError('Identificador do gestor inválido.')
  return `/managers/${id}`
}

function toManager(row: ManagerSummaryResponse): ManagerSummary {
  if (!row || !Number.isSafeInteger(row.id) || row.id <= 0
    || !Number.isSafeInteger(row.unitId) || row.unitId <= 0
    || typeof row.name !== 'string' || typeof row.email !== 'string' || typeof row.unitName !== 'string'
    || !['PRE_CADASTRADO', 'ATIVO', 'DESATIVADO'].includes(row.status)
    || (row.profilePhotoUrl != null && typeof row.profilePhotoUrl !== 'string')
    || (row.avatarInitials != null && typeof row.avatarInitials !== 'string')) {
    throw new ManagersApiError('A API retornou dados inválidos para o gestor.')
  }
  return { id: String(row.id), name: row.name, email: row.email, unitId: String(row.unitId), unit: row.unitName, status: row.status,
    profilePhotoUrl: row.profilePhotoUrl && /^https?:\/\//i.test(row.profilePhotoUrl) ? row.profilePhotoUrl : null,
    avatarInitials: row.avatarInitials || null }
}

function toDetails(row: ManagerDetailsResponse): ManagerDetails {
  const manager = toManager(row)
  if (!Number.isSafeInteger(row.roleId) || row.roleId <= 0 || typeof row.roleName !== 'string'
    || (row.cpf != null && typeof row.cpf !== 'string')
    || (row.workModel != null && row.workModel !== '' && !['HIBRIDO', 'REMOTO', 'PRESENCIAL'].includes(row.workModel))) {
    throw new ManagersApiError('A API retornou detalhes inválidos para o gestor.')
  }
  const cpf = row.cpf?.trim() ?? ''
  const digits = cpf.replace(/[.\-\s]/g, '')
  return { ...manager, roleId: String(row.roleId), position: row.roleName, cpf: /^\d{11}$/.test(digits) ? formatCpfCnpj(digits) : cpf,
    modality: row.workModel || '' }
}

export async function listManagers(signal?: AbortSignal): Promise<ManagerSummary[]> {
  const data = await requestManagers<ManagerSummaryResponse[]>('/managers', 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new ManagersApiError('A API retornou uma lista de gestores inválida.')
  return data.map(toManager)
}

export async function getManager(id: string, signal?: AbortSignal): Promise<ManagerDetails> {
  return toDetails(await requestManagers<ManagerDetailsResponse>(managerPath(id), 'GET', undefined, signal))
}

export async function promoteManager(values: ManagerInviteValues): Promise<ManagerDetails> {
  const errors = validateManagerInvite(values, [values.collaboratorId])
  if (!isPositiveId(values.collaboratorId) || Object.keys(errors).length) throw new ManagersApiError('Selecione um colaborador ativo e um status válido.')
  const payload: PromoteManagerRequest = { collaboratorId: Number(values.collaboratorId), status: values.status === 'active' ? 'ATIVO' : 'DESATIVADO' }
  return toDetails(await requestManagers<ManagerDetailsResponse>('/managers', 'POST', payload))
}

export async function updateManager(id: string, values: ManagerFormValues): Promise<ManagerDetails> {
  const errors = validateCollaborator(values)
  if (Object.keys(errors).length) throw new ManagersApiError(Object.values(errors).join(' '))
  const payload: UpdateManagerRequest = { name: values.name.trim(), cpf: values.cpf.replace(/[.\-\s]/g, ''), email: values.email.trim().toLowerCase(),
    roleId: Number(values.roleId), unitId: Number(values.unitId), workModel: values.modality as UpdateManagerRequest['workModel'], status: values.status }
  return toDetails(await requestManagers<ManagerDetailsResponse>(managerPath(id), 'PUT', payload))
}

export async function changeManagerStatus(id: string, status: 'ATIVO' | 'DESATIVADO'): Promise<ManagerDetails> {
  if (status !== 'ATIVO' && status !== 'DESATIVADO') throw new ManagersApiError('Status inválido. Selecione ativo ou desativado.')
  return toDetails(await requestManagers<ManagerDetailsResponse>(`${managerPath(id)}/status`, 'PATCH', { status }))
}

export async function demoteManager(id: string): Promise<ManagerDetails> {
  return toDetails(await requestManagers<ManagerDetailsResponse>(`${managerPath(id)}/demote`, 'PATCH'))
}
