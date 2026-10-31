import type { CompanyInformation } from '../types/company'
import type { WorkspaceAddressField, WorkspaceUnitAddress } from '../types/address'
import type { WorkspaceUnitRequest } from '../types/workspaceSettings'
import { isValidBrazilianState } from './brazilianState'

export function validateWorkspaceManagerId(id: string): string | null {
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? null : 'Selecione um gestor ativo.'
}

export function workspaceUnitSnapshot(unit: WorkspaceUnitAddress): string {
  return JSON.stringify({ ...unit, cep: unit.cep.replace(/\D/g, ''), source: unit.source ?? 'manual' })
}

export function validateWorkspaceCompany(company: CompanyInformation): Partial<Record<keyof CompanyInformation, string>> {
  const errors: Partial<Record<keyof CompanyInformation, string>> = {}
  if (company.name.trim().length < 2 || company.name.trim().length > 255) errors.name = 'Informe um nome entre 2 e 255 caracteres.'
  if (!/^\d{14}$/.test(company.cnpj.replace(/[./\s-]/g, ''))) errors.cnpj = 'Informe um CNPJ com 14 dígitos.'
  return errors
}

export function validateWorkspaceUnit(unit: WorkspaceUnitAddress): Partial<Record<WorkspaceAddressField, string>> {
  const errors: Partial<Record<WorkspaceAddressField, string>> = {}
  for (const field of ['name', 'city', 'neighborhood', 'street'] as const) {
    if (unit[field].trim().length < 2 || unit[field].trim().length > 255) errors[field] = 'Use entre 2 e 255 caracteres.'
  }
  if (!/^\d{8}$/.test(unit.cep.replace(/[\s-]/g, ''))) errors.cep = 'Informe um CEP com 8 dígitos.'
  if (!isValidBrazilianState(unit.state)) errors.state = 'Selecione uma UF brasileira válida.'
  if (!unit.number.trim() || unit.number.trim().length > 30) errors.number = 'Informe o número com até 30 caracteres.'
  if (unit.complement.trim().length > 255) errors.complement = 'Use até 255 caracteres.'
  return errors
}

export function workspaceUnitPayload(unit: WorkspaceUnitAddress): WorkspaceUnitRequest {
  const errors = validateWorkspaceUnit(unit)
  if (Object.keys(errors).length) throw new Error(`${unit.name || 'Unidade'}: ${Object.values(errors).join(' ')}`)
  return { name: unit.name.trim(), cep: unit.cep.replace(/[\s-]/g, ''), state: unit.state.trim().toUpperCase(),
    city: unit.city.trim(), neighborhood: unit.neighborhood.trim(), street: unit.street.trim(),
    number: unit.number.trim(), addressLine2: unit.complement.trim() || null }
}
