import { conformityPayload, requestConformities, toConformity, ConformitiesApiError } from './conformities'
import type { ConformityDetails, ConformityFormValues, ConformityResponse } from '../types/conformity'

interface UnitConformityResponse extends Omit<ConformityResponse, 'collaboratorId' | 'collaboratorName' | 'collaboratorEmail' | 'profilePhotoUrl' | 'avatarInitials' | 'eventCompletionId'> {
  type: 'UNIDADE'
  unitId: number
  unitName: string
  formResponseId: string | null
}
function path(id?: string): string {
  if (id !== undefined && (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))) throw new ConformitiesApiError('Identificador da conformidade inválido.')
  return '/conformities/units' + (id ? '/' + id : '')
}
function convert(row: UnitConformityResponse): ConformityDetails {
  if (!row || row.type !== 'UNIDADE' || (row.formResponseId != null && typeof row.formResponseId !== 'string')) throw new ConformitiesApiError('A API retornou dados inválidos para a conformidade da unidade.')
  const value = toConformity({ ...row, collaboratorId: row.unitId, collaboratorName: row.unitName, collaboratorEmail: '', profilePhotoUrl: null, avatarInitials: null, eventCompletionId: null })
  return { ...value, type: 'UNIDADE', unitId: row.unitId, formResponseId: row.formResponseId }
}
export async function listUnitConformities(signal?: AbortSignal): Promise<ConformityDetails[]> {
  try {
    const rows = await requestConformities<UnitConformityResponse[]>(path(), 'GET', undefined, signal)
    if (!Array.isArray(rows)) throw new ConformitiesApiError('A API retornou uma lista inválida de conformidades de unidades.')
    return rows.map(convert)
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof ConformitiesApiError) throw error
    throw new ConformitiesApiError('Não foi possível concluir a operação de conformidades da unidade.', { cause: error })
  }
}
export async function getUnitConformity(id: string, signal?: AbortSignal): Promise<ConformityDetails> {
  try { return convert(await requestConformities<UnitConformityResponse>(path(id), 'GET', undefined, signal)) }
  catch (error: unknown) {
    if (signal?.aborted || error instanceof ConformitiesApiError) throw error
    throw new ConformitiesApiError('Não foi possível concluir a operação de conformidades da unidade.', { cause: error })
  }
}
export async function saveUnitConformity(values: ConformityFormValues, id?: string, signal?: AbortSignal): Promise<ConformityDetails> {
  try {
    const fields = conformityPayload(values, Boolean(id))
    return convert(await requestConformities<UnitConformityResponse>(path(id), id ? 'PUT' : 'POST', id ? fields : { ...fields, unitId: Number(values.employeeId) }, signal))
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof ConformitiesApiError) throw error
    throw new ConformitiesApiError('Não foi possível concluir a operação de conformidades da unidade.', { cause: error })
  }
}
export async function changeUnitConformityApplicability(id: string, applicable: boolean, signal?: AbortSignal): Promise<ConformityDetails> {
  try {
    if (typeof applicable !== 'boolean') throw new ConformitiesApiError('Aplicabilidade inválida.')
    return convert(await requestConformities<UnitConformityResponse>(path(id) + '/applicability', 'PATCH', { applicable }, signal))
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof ConformitiesApiError) throw error
    throw new ConformitiesApiError('Não foi possível concluir a operação de conformidades da unidade.', { cause: error })
  }
}
