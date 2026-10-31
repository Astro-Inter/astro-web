import type { RoleNrRequest } from '../types/role'

export function validateNrSelection(nrs: readonly RoleNrRequest[]): string | null {
  return nrs.some(row => !Number.isSafeInteger(row.nr) || row.nr <= 0 || typeof row.ativo !== 'boolean')
    || new Set(nrs.map(row => row.nr)).size !== nrs.length ? 'Seleção de NRs inválida.' : null
}
