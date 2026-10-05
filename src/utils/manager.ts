import type { ManagerDetailsValues, ManagerInviteValues } from '../types'

export interface ManagerInviteValidationErrors {
  collaboratorId?: string
  status?: string
}

export function validateManagerInvite(values: ManagerInviteValues, collaboratorIds: readonly string[]): ManagerInviteValidationErrors {
  const errors: ManagerInviteValidationErrors = {}

  if (!collaboratorIds.includes(values.collaboratorId)) errors.collaboratorId = 'Selecione o e-mail do colaborador.'
  if (values.status !== 'active' && values.status !== 'inactive') errors.status = 'Selecione o status.'

  return errors
}

export interface ManagerDetailsValidationErrors {
  name?: string
  email?: string
  cpf?: string
  password?: string
  unit?: string
  position?: string
  modality?: string
}

export function validateManagerDetails(values: ManagerDetailsValues, password: string): ManagerDetailsValidationErrors {
  const errors: ManagerDetailsValidationErrors = {}
  const name = values.name.trim()
  const position = values.position.trim()

  if (name.length < 2) errors.name = 'Informe um nome com pelo menos 2 caracteres.'
  else if (name.length > 80) errors.name = 'O nome deve ter no máximo 80 caracteres.'
  if (values.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Informe um e-mail válido.'
  if (values.cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(values.cpf)) errors.cpf = 'Informe um CPF com 11 dígitos.'
  if (password.length < 8) errors.password = 'A senha deve ter pelo menos 8 caracteres.'
  else if (password.length > 128) errors.password = 'A senha deve ter no máximo 128 caracteres.'
  if (!values.unit) errors.unit = 'Selecione uma unidade.'
  if (!position) errors.position = 'Selecione um cargo.'
  if (!values.modality) errors.modality = 'Selecione a modalidade.'

  return errors
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toLocaleUpperCase('pt-BR')
}
