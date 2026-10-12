import type { CreateFormValues, FormQuestion } from '../types/forms'

const key = 'astro-create-forms-draft'
const kinds = new Set(['option', 'text', 'photo', 'date', 'nr', 'unit'])
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function text(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length <= maximum
}
function question(value: unknown): value is FormQuestion {
  return record(value) && text(value.id, 100) && typeof value.kind === 'string' && kinds.has(value.kind)
    && text(value.title, 140) && text(value.answer, 10000)
    && typeof value.multiple === 'boolean' && typeof value.required === 'boolean'
    && (value.maxFiles === undefined || (Number.isInteger(value.maxFiles) && Number(value.maxFiles) >= 1 && Number(value.maxFiles) <= 10))
    && (value.maxFileSizeMb === undefined || (typeof value.maxFileSizeMb === 'number' && value.maxFileSizeMb > 0 && value.maxFileSizeMb <= 100))
    && Array.isArray(value.options) && value.options.length <= 100
    && value.options.every(option => record(option) && text(option.id, 100) && text(option.value, 80)
      && (option.isOther === undefined || typeof option.isOther === 'boolean'))
}
export function isFormDraft(value: unknown): value is CreateFormValues {
  return record(value) && text(value.name, 100) && text(value.description, 240)
    && text(value.manager, 200) && text(value.nr, 200) && text(value.unit, 200) && text(value.deadline, 10)
    && Array.isArray(value.questions) && value.questions.length <= 100 && value.questions.every(question)
    && new Set(value.questions.map(item => item.id)).size === value.questions.length
}

export function loadFormDraft(storage: Pick<Storage, 'getItem' | 'removeItem'>): CreateFormValues | null {
  try {
    const saved = storage.getItem(key)
    if (!saved) return null
    const parsed: unknown = saved.length <= 2_000_000 ? JSON.parse(saved) : null
    if (record(parsed) && parsed._versao === 1 && isFormDraft(parsed.values)) return parsed.values
    storage.removeItem(key)
  } catch {
    try { storage.removeItem(key) } catch { /* Navegadores podem bloquear o armazenamento. */ }
  }
  return null
}

export function saveFormDraft(storage: Pick<Storage, 'setItem'>, values: CreateFormValues): void {
  if (!isFormDraft(values)) throw new Error('Revise os campos do rascunho: há valores fora dos limites permitidos.')
  storage.setItem(key, JSON.stringify({ _versao: 1, values }))
}

export function removeFormDraft(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(key)
}
