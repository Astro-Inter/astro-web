import type { PositionFormValues } from '../types'

export interface PositionValidationErrors {
  name?: string
  collaboratorCount?: string
  unit?: string
}

export function validatePosition(values: PositionFormValues): PositionValidationErrors {
  const errors: PositionValidationErrors = {}
  const name = values.name.trim()

  if (name.length < 2) errors.name = 'Informe um cargo com pelo menos 2 caracteres.'
  else if (name.length > 80) errors.name = 'O cargo deve ter no máximo 80 caracteres.'

  if (!/^\d{1,6}$/.test(values.collaboratorCount)) {
    errors.collaboratorCount = 'Informe uma quantidade de 0 a 999999.'
  }

  if (!values.unit) errors.unit = 'Selecione uma unidade.'

  return errors
}
