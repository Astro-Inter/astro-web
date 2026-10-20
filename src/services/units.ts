import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import type { Unit } from '../types/unit'
import type { UnitResponse, UnitNrResponse, UnitNrOptionResponse, UnitNrRequest } from '../types/unit'

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
  if (!unit || !Number.isSafeInteger(unit.id_unidade) || unit.id_unidade <= 0 || typeof unit.nome !== 'string'
    || !Number.isSafeInteger(unit.quantidade_colaboradores) || unit.quantidade_colaboradores < 0
    || typeof unit.status !== 'string' || !['ativo', 'inativo'].includes(unit.status.trim().toLowerCase())) {
    throw new UnitsApiError('A API retornou dados inválidos para a unidade.')
  }
  return { id: String(unit.id_unidade), name: unit.nome, collaboratorCount: unit.quantidade_colaboradores, active: unit.status.trim().toLowerCase() === 'ativo' }
}

export async function listUnits(signal?: AbortSignal): Promise<Unit[]> {
  const data = await requestUnits<UnitResponse[]>('/units', 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new UnitsApiError('A API retornou uma lista de unidades inválida.')
  return data.map(toUnit)
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
  data.forEach((row) => validateNr(row?.nr, row?.descricao))
  return data
}

export async function listUnitNrOptions(id: string, signal?: AbortSignal): Promise<UnitNrOptionResponse[]> {
  const data = await requestUnits<UnitNrOptionResponse[]>(`${unitPath(id)}/nrs`, 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new UnitsApiError('A API retornou opções de NRs inválidas.')
  data.forEach((row) => {
    validateNr(row?.nr, row?.descricao)
    if (typeof row.ativo !== 'boolean') throw new UnitsApiError('A API retornou um vínculo de NR inválido.')
  })
  return data
}

export async function updateUnitNrs(id: string, nrs: UnitNrRequest[]): Promise<void> {
  if (nrs.some((row) => !Number.isSafeInteger(row.nr) || row.nr <= 0 || typeof row.ativo !== 'boolean')
    || new Set(nrs.map((row) => row.nr)).size !== nrs.length) throw new UnitsApiError('Seleção de NRs inválida.')
  await requestUnits<void>(`${unitPath(id)}/nrs`, 'POST', nrs)
}
