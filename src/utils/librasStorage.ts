import type { LibrasWidgetSnapshot } from '../types/accessibility'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Migra o objeto legado do SDK sem remover suas preferências ou alterar seu estado original. */
export function parseLibrasWidgetStorage(raw: string | null): LibrasWidgetSnapshot | null {
  if (!raw) return null
  try {
    const saved: unknown = JSON.parse(raw)
    if (!record(saved) || saved._versao !== undefined && saved._versao !== 1
      || !record(saved.state) || typeof saved.state.isOpen !== 'boolean') return null
    return { ...saved, _versao: 1, state: { ...saved.state, isOpen: false } }
  } catch {
    return null
  }
}
