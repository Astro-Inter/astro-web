import type { PostalAddress, WorkspaceUnitAddress } from '../types/address'

export function normalizeUnitName(name: string): string {
  return name.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function reconcileSpreadsheetUnits(names: string[], previous: WorkspaceUnitAddress[]): WorkspaceUnitAddress[] {
  const existing = new Map(previous.map(unit => [normalizeUnitName(unit.name), unit]))
  let nextId = Math.max(0, ...previous.map(unit => unit.id)) + 1
  const imported: WorkspaceUnitAddress[] = names.map(name => {
    const saved = existing.get(normalizeUnitName(name))
    return saved ? { ...saved, name, source: 'spreadsheet' } : {
      id: nextId++, name, cep: '', state: '', city: '', neighborhood: '', street: '', number: '', complement: '', source: 'spreadsheet',
    }
  })
  const importedNames = new Set(names.map(normalizeUnitName))
  return [...imported, ...previous.filter(unit => unit.source === 'manual' && !importedNames.has(normalizeUnitName(unit.name)))]
}

export function mergePostalAddress(current: WorkspaceUnitAddress, requested: WorkspaceUnitAddress, result: PostalAddress): WorkspaceUnitAddress {
  if (current.id !== requested.id || current.cep.replace(/\D/g, '') !== requested.cep.replace(/\D/g, '')) return current
  const next = { ...current }
  for (const field of ['state', 'city', 'neighborhood', 'street'] as const) {
    if (current[field] === requested[field]) next[field] = result[field]
  }
  return next
}
