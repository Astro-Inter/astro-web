import type { FormListFilters } from '../types/forms'

export interface FormFiltersValidation {
  values: FormListFilters | null
  errors: Partial<Record<keyof FormListFilters, string>>
}

export function validateAndSanitizeFormFilters(input: FormListFilters): FormFiltersValidation {
  const errors: FormFiltersValidation['errors'] = {}
  const search = typeof input.search === 'string' ? input.search.trim() : ''
  if (typeof input.search !== 'string' || search.length > 240) errors.search = 'Informe uma busca de até 240 caracteres.'
  if (!['', 'pending', 'completed', 'draft'].includes(input.status)) errors.status = 'Selecione um status de formulário válido.'
  if (!Number.isSafeInteger(input.page) || input.page < 0) errors.page = 'Informe uma página inteira a partir de zero.'
  if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > 100) errors.size = 'Informe de 1 a 100 formulários por página.'
  return { values: Object.keys(errors).length ? null : { ...input, search }, errors }
}
