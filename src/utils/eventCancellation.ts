export interface EventCancellationValidation {
  values: { reason: string } | null
  errors: { reason?: string }
}

export function validateEventCancellation(reason: string): EventCancellationValidation {
  const normalized = reason.trim()
  if (normalized.length < 3 || normalized.length > 1000) return {
    values: null, errors: { reason: 'Informe uma justificativa de 3 a 1000 caracteres.' },
  }
  return { values: { reason: normalized }, errors: {} }
}
