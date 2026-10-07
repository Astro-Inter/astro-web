import type { EmployeeInviteValues } from '../types'

export interface EmployeeInviteValidationErrors {
  name?: string
  cpf?: string
  email?: string
  password?: string
  unit?: string
  position?: string
  modality?: string
  status?: string
}

export function validateEmployeeInvite(values: EmployeeInviteValues): EmployeeInviteValidationErrors {
  const errors: EmployeeInviteValidationErrors = {}
  const name = values.name.trim()
  const unit = values.unit.trim()
  const position = values.position.trim()

  if (name.length < 2) errors.name = 'Informe um nome com pelo menos 2 caracteres.'
  else if (name.length > 80) errors.name = 'O nome deve ter no máximo 80 caracteres.'
  if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(values.cpf)) errors.cpf = 'Informe um CPF com 11 dígitos.'
  if (values.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Informe um e-mail válido.'
  if (values.password.length < 8) errors.password = 'A senha deve ter pelo menos 8 caracteres.'
  else if (values.password.length > 128) errors.password = 'A senha deve ter no máximo 128 caracteres.'
  if (unit.length < 2) errors.unit = 'Informe a unidade.'
  else if (unit.length > 80) errors.unit = 'A unidade deve ter no máximo 80 caracteres.'
  if (position.length < 2) errors.position = 'Informe o cargo.'
  else if (position.length > 80) errors.position = 'O cargo deve ter no máximo 80 caracteres.'
  if (!values.modality) errors.modality = 'Selecione a modalidade.'
  if (values.status !== 'active' && values.status !== 'inactive') errors.status = 'Selecione o status.'

  return errors
}
