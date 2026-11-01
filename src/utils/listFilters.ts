import type { ListFilterField } from '../types/listFilters'

export function validateListFilters(fields: readonly ListFilterField[], values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    const value = values[field.id] ?? ''
    if (!value) continue
    if (field.kind === 'number') {
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) errors[field.id] = 'Informe uma quantidade inteira maior ou igual a zero.'
      else if (field.minimumField && values[field.minimumField] && Number(value) < Number(values[field.minimumField])) errors[field.id] = 'A quantidade máxima deve ser maior ou igual à mínima.'
    } else if (!field.options?.some(option => option.value === value)) errors[field.id] = 'Selecione uma opção válida.'
  }
  return errors
}

export function matchesCountRange(count: number, minimum: string, maximum: string): boolean {
  return (!minimum || count >= Number(minimum)) && (!maximum || count <= Number(maximum))
}

export function stepFilterCount(value: string, direction: -1 | 1): string {
  const count = Number(value)
  const current = Number.isSafeInteger(count) && count >= 0 ? count : 0
  return String(Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, current + direction)))
}
