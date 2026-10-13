import type { CollaboratorFormValues, CollaboratorStatus } from '../types/collaborator'

export const collaboratorStatusLabels: Record<CollaboratorStatus, string> = {
  PRE_CADASTRADO: 'Pré-cadastrado', ATIVO: 'Ativo', DESATIVADO: 'Desativado',
}
export const collaboratorModalityLabels = { HIBRIDO: 'Híbrido', REMOTO: 'Remoto', PRESENCIAL: 'Presencial' }
export type CollaboratorValidationErrors = Partial<Record<keyof CollaboratorFormValues, string>>

export function isPositiveId(id: string): boolean {
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))
}

export function isValidCpf(value: string): boolean {
  const cpf = value.replace(/[.\-\s]/g, '')
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  for (const length of [9, 10]) {
    let sum = 0
    for (let index = 0; index < length; index++) sum += Number(cpf[index]) * (length + 1 - index)
    const digit = (sum * 10 % 11) % 10
    if (digit !== Number(cpf[length])) return false
  }
  return true
}

export function validateCollaborator(values: CollaboratorFormValues): CollaboratorValidationErrors {
  const errors: CollaboratorValidationErrors = {}
  if (values.name.trim().length < 2 || values.name.trim().length > 255) errors.name = 'Informe um nome entre 2 e 255 caracteres.'
  if (!isValidCpf(values.cpf)) errors.cpf = 'Informe um CPF válido.'
  const email = values.email.trim()
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Informe um e-mail válido.'
  if (!isPositiveId(values.roleId)) errors.roleId = 'Selecione um cargo.'
  if (!isPositiveId(values.unitId)) errors.unitId = 'Selecione uma unidade.'
  if (!['HIBRIDO', 'REMOTO', 'PRESENCIAL'].includes(values.modality)) errors.modality = 'Selecione a modalidade.'
  if (!['PRE_CADASTRADO', 'ATIVO', 'DESATIVADO'].includes(values.status)) errors.status = 'Selecione um status válido.'
  return errors
}
