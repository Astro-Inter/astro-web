import type { PositionFormValues } from '../types'

export interface PositionValidationErrors {
  name?: string
  status?: string
}

export function validatePosition(values: PositionFormValues, status: string): PositionValidationErrors {
  const errors: PositionValidationErrors = {}
  const name = values.name.trim()

  if (name.length < 2) errors.name = 'Informe um cargo com pelo menos 2 caracteres.'
  else if (name.length > 80) errors.name = 'O cargo deve ter no máximo 80 caracteres.'

  if (status !== 'active' && status !== 'inactive') errors.status = 'Selecione o status.'

  return errors
}
