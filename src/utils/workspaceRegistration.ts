import type { CompanyInformation } from '../types/company'
import type { WorkspaceAddressField, WorkspaceUnitAddress } from '../types/address'
import type { WorkspaceRegistrationData, WorkspaceRegistrationDraft } from '../types/workspaceRegistration'
import { validateSpreadsheetFile } from './spreadsheet'

export function validateManagerEmail(email: string): string {
  return email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? '' : 'Informe um e-mail válido para o gestor.'
}

export function validateWorkspaceAccessKey(accessKey: string): string {
  return /^\d{6}$/.test(accessKey) ? '' : 'Informe os seis dígitos do código recebido por e-mail.'
}

export function validateRegistrationPassword(password: string, confirmation: string): string {
  return Object.values(validateRegistrationPasswordFields(password, confirmation))[0] ?? ''
}

export function validateRegistrationPasswordFields(password: string, confirmation: string): { password?: string; confirmation?: string } {
  const errors: { password?: string; confirmation?: string } = {}
  if (!password || password.length > 128) errors.password = 'Informe uma senha de até 128 caracteres.'
  if (!confirmation) errors.confirmation = 'Confirme sua senha.'
  else if (password !== confirmation) errors.confirmation = 'A confirmação deve ser igual à senha.'
  return errors
}

export function validateRegistrationCompany(company: CompanyInformation): string {
  return Object.values(validateRegistrationCompanyFields(company))[0] ?? ''
}

export function validateRegistrationCompanyFields(company: CompanyInformation): Partial<Record<keyof CompanyInformation, string>> {
  const errors: Partial<Record<keyof CompanyInformation, string>> = {}
  if (!company.name.trim() || company.name.trim().length > 120) errors.name = 'Informe o nome da empresa (até 120 caracteres).'
  if (!/^\d{14}$/.test(company.cnpj.replace(/\D/g, ''))) errors.cnpj = 'Informe um CNPJ com 14 dígitos.'
  return errors
}

export function validateRegistrationUnitFields(unit: WorkspaceUnitAddress): Partial<Record<WorkspaceAddressField, string>> {
  const errors: Partial<Record<WorkspaceAddressField, string>> = {}
  for (const [field, label, maximum] of [
    ['name', 'nome', 80], ['city', 'cidade', 80], ['neighborhood', 'bairro', 80], ['street', 'rua', 120],
  ] as const) {
    if (unit[field].trim().length < 2 || unit[field].trim().length > maximum) errors[field] = `Informe ${label} com 2 a ${maximum} caracteres.`
  }
  if (!/^\d{8}$/.test(unit.cep.replace(/\D/g, ''))) errors.cep = 'Informe um CEP com 8 dígitos.'
  if (!unit.state.trim() || unit.state.trim().length > 2) errors.state = 'Informe a sigla do estado (até 2 caracteres).'
  if (!unit.number.trim() || unit.number.trim().length > 12) errors.number = 'Informe o número do endereço (até 12 caracteres).'
  if (unit.complement.trim().length > 120) errors.complement = 'O complemento deve ter até 120 caracteres.'
  return errors
}

export function validateRegistrationUnits(units: WorkspaceUnitAddress[]): string {
  if (!units.length) return 'Adicione pelo menos uma unidade.'
  const names = new Set<string>()
  for (const [index, unit] of units.entries()) {
    const prefix = `Sede ${index + 1}: `
    const message = Object.values(validateRegistrationUnitFields(unit))[0]
    if (message) return `${prefix}${message}`
    const name = unit.name.trim().toLowerCase()
    if (names.has(name)) return `${prefix}o nome da unidade já foi usado. Escolha um nome diferente.`
    names.add(name)
  }
  return ''
}

export function buildWorkspaceRegistration(draft: WorkspaceRegistrationDraft): WorkspaceRegistrationData {
  const error = validateManagerEmail(draft.email)
    || validateRegistrationPassword(draft.password, draft.password)
    || validateRegistrationCompany(draft.company)
    || validateRegistrationUnits(draft.units)
  if (error) throw new Error(error)
  if (!draft.file) throw new Error('Selecione a planilha de colaboradores.')
  const fileValidation = validateSpreadsheetFile(draft.file, 5 * 1024 * 1024)
  if (!fileValidation.valid) throw new Error(fileValidation.message)
  const data: WorkspaceRegistrationData = {
    email: draft.email.trim(),
    password: draft.password,
    workspace: { name: draft.company.name.trim(), cnpj: draft.company.cnpj.replace(/\D/g, '') },
    units: draft.units.map(unit => ({
      name: unit.name.trim(), cep: unit.cep.replace(/\D/g, ''), state: unit.state.trim().toUpperCase(),
      city: unit.city.trim(), neighborhood: unit.neighborhood.trim(), street: unit.street.trim(), number: unit.number.trim(),
      ...(unit.complement.trim() ? { addressLine2: unit.complement.trim() } : {}),
    })),
  }
  // Reserva espaço para cabeçalhos e delimitadores do multipart.
  if (new Blob([JSON.stringify(data)]).size + draft.file.size > 6 * 1024 * 1024 - 4096) {
    throw new Error('Os dados e a planilha ultrapassam o limite de 6 MB da requisição.')
  }
  return data
}
