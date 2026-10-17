import type { AccountFormValues } from '../types/account'
import { isPositiveId, isValidCpf } from './collaborator'

export function validateAccountPhoto(file: File | null): string {
  if (!file || file.size === 0) return 'Selecione uma imagem que não esteja vazia.'
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Selecione uma imagem JPEG, PNG ou WebP.'
  if (file.size > 5 * 1024 * 1024) return 'A foto deve ter no máximo 5 MB.'
  return ''
}

export type AccountValidationErrors = Partial<Record<keyof AccountFormValues, string>>

export function validateAccountDetails(values: AccountFormValues): AccountValidationErrors {
  const errors: AccountValidationErrors = {}
  if (values.name.trim().length < 2 || values.name.trim().length > 255) errors.name = 'Informe um nome entre 2 e 255 caracteres.'
  if (!isValidCpf(values.cpf)) errors.cpf = 'Informe um CPF válido.'
  if (values.email.trim().length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!isPositiveId(values.roleId)) errors.roleId = 'Selecione um cargo.'
  if (!isPositiveId(values.unitId)) errors.unitId = 'Selecione uma unidade.'
  if (!['HIBRIDO', 'REMOTO', 'PRESENCIAL'].includes(values.workModel)) errors.workModel = 'Selecione a modalidade.'
  return errors
}
