import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import { validatePosition } from '../utils/position'
import { validateNrSelection } from '../utils/nrSelection'
import type { Position, PositionFormValues } from '../types/position'
import type { RoleResponse, RoleNrResponse, RoleNrOptionResponse, RoleNrRequest } from '../types/role'

export class RolesApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'RolesApiError'
  }
}

async function requestRoles<T>(path: string, method = 'GET', payload?: object, signal?: AbortSignal): Promise<T> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new RolesApiError('Entre na sua conta para gerenciar os cargos.')
    const token = await user.getIdToken()
    const url = `${getSystemApiBaseUrl()}${path}${method === 'GET' ? `?${new URLSearchParams({ firebase_uid: user.uid })}` : ''}`
    const response = await fetch(url, {
      method, signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}) },
      ...(method !== 'GET' ? { body: JSON.stringify({ firebaseUid: user.uid, ...payload }) } : {}),
    })
    const text = await response.text()
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* A API pode retornar erro sem JSON. */ }
    const result = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null
    if (!response.ok || result?.success === false) {
      const details = Array.isArray(result?.errors) ? result.errors.filter((item): item is string => typeof item === 'string').join(' ') : ''
      throw new RolesApiError(details || (typeof result?.message === 'string' && result.message) ||
        (response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : response.status === 403 ? 'Você não tem permissão para gerenciar estes cargos.' : 'Não foi possível concluir a operação de cargos. Tente novamente.'))
    }
    if (result?.success !== true) throw new RolesApiError('A API retornou uma resposta inválida para cargos.')
    return result.data as T
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof RolesApiError) throw error
    throw new RolesApiError('Não foi possível conectar à API de cargos. Tente novamente.', { cause: error })
  }
}

function rolePath(id: string): string {
  if (!/^[1-9]\d*$/.test(id)) throw new RolesApiError('Identificador do cargo inválido.')
  return `/roles/${id}`
}

function positionPayload(values: PositionFormValues): { name: string; status: string } {
  const errors = validatePosition(values, values.active ? 'active' : 'inactive')
  if (Object.keys(errors).length) throw new RolesApiError(errors.name ?? errors.status ?? 'Cargo inválido.')
  return { name: values.name.trim(), status: values.active ? 'ativo' : 'inativo' }
}

function toPosition(role: RoleResponse): Position {
  if (!role || !Number.isSafeInteger(role.roleId) || role.roleId <= 0 || typeof role.name !== 'string'
    || !Number.isSafeInteger(role.collaboratorCount) || role.collaboratorCount < 0
    || typeof role.status !== 'string' || !['ativo', 'inativo'].includes(role.status.trim().toLowerCase())) {
    throw new RolesApiError('A API retornou dados inválidos para o cargo.')
  }
  return { id: String(role.roleId), name: role.name, collaboratorCount: role.collaboratorCount, active: role.status.trim().toLowerCase() === 'ativo' }
}

export async function listRoles(signal?: AbortSignal): Promise<Position[]> {
  const data = await requestRoles<RoleResponse[]>('/roles', 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new RolesApiError('A API retornou uma lista de cargos inválida.')
  return data.map(toPosition)
}

export async function createRole(values: PositionFormValues): Promise<void> {
  await requestRoles<void>('/roles', 'POST', positionPayload(values))
}

export async function updateRole(id: string, values: PositionFormValues): Promise<Position> {
  return toPosition(await requestRoles<RoleResponse>(rolePath(id), 'PUT', positionPayload(values)))
}

export async function toggleRoleStatus(id: string): Promise<boolean> {
  const active = await requestRoles<boolean>(`${rolePath(id)}/status`, 'PATCH')
  if (typeof active !== 'boolean') throw new RolesApiError('A API retornou um status inválido.')
  return active
}

function validateNr(nr: number, description: string): void {
  if (!Number.isSafeInteger(nr) || nr <= 0 || typeof description !== 'string') throw new RolesApiError('A API retornou dados inválidos para as NRs.')
}

export async function listRoleNrs(id: string, signal?: AbortSignal): Promise<RoleNrResponse[]> {
  const data = await requestRoles<RoleNrResponse[]>(`${rolePath(id)}/nrs`, 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new RolesApiError('A API retornou uma lista de NRs inválida.')
  data.forEach((row) => validateNr(row.nrCode, row.description))
  return data
}

export async function listRoleNrOptions(id: string, signal?: AbortSignal): Promise<RoleNrOptionResponse[]> {
  const data = await requestRoles<RoleNrOptionResponse[]>(`${rolePath(id)}/nrs/options`, 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new RolesApiError('A API retornou opções de NRs inválidas.')
  data.forEach((row) => {
    validateNr(row.nr, row.description)
    if (typeof row.active !== 'boolean') throw new RolesApiError('A API retornou um vínculo de NR inválido.')
  })
  return data
}

export async function updateRoleNrs(id: string, nrs: RoleNrRequest[]): Promise<void> {
  const error = validateNrSelection(nrs)
  if (error) throw new RolesApiError(error)
  await requestRoles<void>(`${rolePath(id)}/nrs`, 'POST', { nrs })
}
