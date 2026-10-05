import type { ManagerInviteValues } from '../types'

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
