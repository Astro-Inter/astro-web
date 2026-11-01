import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import type { Unit } from '../types/unit'
import type { UnitResponse, UnitNrResponse, UnitNrOptionResponse, UnitNrRequest } from '../types/unit'
import type { WorkspaceUnitAddress } from '../types/address'
import { workspaceUnitPayload } from '../utils/workspaceSettings'
import { validateNrSelection } from '../utils/nrSelection'

export class UnitsApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'UnitsApiError'
  }
}

async function requestUnits<T>(path: string, method = 'GET', payload?: object, signal?: AbortSignal): Promise<T> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new UnitsApiError('Entre na sua conta para gerenciar as unidades.')
    const token = await user.getIdToken()
    signal?.throwIfAborted()
    const url = `${getSystemApiBaseUrl()}${path}`
    const response = await fetch(url, {
      method, signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    })
    const text = await response.text()
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* A API pode retornar erro sem JSON. */ }
    const result = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null
    if (!response.ok || result?.success === false) {
      const details = Array.isArray(result?.errors) ? result.errors.filter((item): item is string => typeof item === 'string').join(' ') : ''
      throw new UnitsApiError(details || (typeof result?.message === 'string' && result.message) ||
        (response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : response.status === 403 ? 'Você não tem permissão para gerenciar estas unidades.' : 'Não foi possível concluir a operação de unidades. Tente novamente.'))
    }
    if (result?.success !== true) throw new UnitsApiError('A API retornou uma resposta inválida para unidades.')
    return result.data as T
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof UnitsApiError) throw error
    throw new UnitsApiError('Não foi possível conectar à API de unidades. Tente novamente.', { cause: error })
  }
}

function unitPath(id: string): string {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new UnitsApiError('Identificador da unidade inválido.')
  return `/units/${id}`
}

function toUnit(unit: UnitResponse): Unit {
  if (!unit || !Number.isSafeInteger(unit.unitId) || unit.unitId <= 0 || typeof unit.name !== 'string'
    || !Number.isSafeInteger(unit.collaboratorCount) || unit.collaboratorCount < 0
    || typeof unit.status !== 'string' || !['ativo', 'inativo'].includes(unit.status.trim().toLowerCase())) {
    throw new UnitsApiError('A API retornou dados inválidos para a unidade.')
  }
  return { id: String(unit.unitId), name: unit.name, collaboratorCount: unit.collaboratorCount, active: unit.status.trim().toLowerCase() === 'ativo' }
}

export async function listUnits(signal?: AbortSignal): Promise<Unit[]> {
  const data = await requestUnits<UnitResponse[]>('/units', 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new UnitsApiError('A API retornou uma lista de unidades inválida.')
  return data.map(toUnit)
}

function toUnitAddress(unit: UnitResponse): WorkspaceUnitAddress {
  toUnit(unit)
  for (const value of [unit.postalCode, unit.state, unit.city, unit.neighborhood, unit.street, unit.number, unit.addressLine2]) {
    if (value != null && typeof value !== 'string') throw new UnitsApiError('A API retornou um endereço inválido.')
  }
  return { id: unit.unitId, persistedId: unit.unitId, name: unit.name, cep: unit.postalCode ?? '',
    state: unit.state ?? '', city: unit.city ?? '', neighborhood: unit.neighborhood ?? '', street: unit.street ?? '',
    number: unit.number ?? '', complement: unit.addressLine2 ?? '', source: 'manual' }
}

export async function listUnitAddresses(signal?: AbortSignal): Promise<WorkspaceUnitAddress[]> {
  const data = await requestUnits<UnitResponse[]>('/units', 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new UnitsApiError('A API retornou uma lista de unidades inválida.')
  return data.map(toUnitAddress)
}

export async function saveUnitAddress(unit: WorkspaceUnitAddress, signal?: AbortSignal): Promise<WorkspaceUnitAddress> {
  const path = unit.persistedId ? unitPath(String(unit.persistedId)) : '/units'
  return toUnitAddress(await requestUnits<UnitResponse>(path, unit.persistedId ? 'PUT' : 'POST', workspaceUnitPayload(unit), signal))
}

export async function toggleUnitStatus(id: string): Promise<boolean> {
  const active = await requestUnits<boolean>(`${unitPath(id)}/status`, 'PATCH')
  if (typeof active !== 'boolean') throw new UnitsApiError('A API retornou um status inválido.')
  return active
}

function validateNr(nr: number, description: string): void {
  if (!Number.isSafeInteger(nr) || nr <= 0 || typeof description !== 'string') throw new UnitsApiError('A API retornou dados inválidos para as NRs.')
}

export async function listUnitNrs(id: string, signal?: AbortSignal): Promise<UnitNrResponse[]> {
  const data = await requestUnits<UnitNrResponse[]>(`${unitPath(id)}/nrs/associated`, 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new UnitsApiError('A API retornou uma lista de NRs inválida.')
  data.forEach((row) => validateNr(row?.nr, row?.description))
  return data
}

export async function listUnitNrOptions(id: string, signal?: AbortSignal): Promise<UnitNrOptionResponse[]> {
  const data = await requestUnits<UnitNrOptionResponse[]>(`${unitPath(id)}/nrs`, 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new UnitsApiError('A API retornou opções de NRs inválidas.')
  data.forEach((row) => {
    validateNr(row?.nr, row?.description)
    if (typeof row.active !== 'boolean') throw new UnitsApiError('A API retornou um vínculo de NR inválido.')
  })
  return data
}

export async function updateUnitNrs(id: string, nrs: UnitNrRequest[]): Promise<void> {
  const error = validateNrSelection(nrs)
  if (error) throw new UnitsApiError(error)
  await requestUnits<void>(`${unitPath(id)}/nrs`, 'POST', { nrs })
}
