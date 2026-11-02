import type { WorkspaceAddressErrors, WorkspaceUnitAddress, WorkspaceUnitErrors } from '../types/address'
import { validateRegistrationUnitFields } from './workspaceRegistration'
import { validateWorkspaceUnit } from './workspaceSettings'
import { normalizeUnitName } from './workspaceUnits'

export function validateAddressUnits(units: WorkspaceUnitAddress[], settingsMode: boolean): WorkspaceUnitErrors {
  const validateUnit = settingsMode ? validateWorkspaceUnit : validateRegistrationUnitFields
  const names = new Set<string>()
  return Object.fromEntries(units.map(unit => {
    const errors = validateUnit(unit)
    const name = normalizeUnitName(unit.name)
    const duplicate = names.has(name)
    names.add(name)
    return [unit.id, { ...errors, ...(duplicate ? { name: 'O nome da unidade já foi usado. Escolha um nome diferente.' } : {}) }]
  }))
}

export function visibleAddressErrors(unit: WorkspaceUnitAddress, units: WorkspaceUnitAddress[], recorded: WorkspaceAddressErrors, settingsMode: boolean): WorkspaceAddressErrors {
  const validation = (settingsMode ? validateWorkspaceUnit : validateRegistrationUnitFields)(unit)
  return Object.fromEntries(Object.entries(recorded).flatMap(([field, message]) => {
    if (!message) return []
    const current = validation[field as keyof WorkspaceAddressErrors]
    if (current) return [[field, current]]
    if (field === 'cep') return [[field, message]]
    if (field === 'name' && units.some(other => other.id !== unit.id && normalizeUnitName(other.name) === normalizeUnitName(unit.name))) return [[field, message]]
    return []
  }))
}

export function mergePostalErrors(errors: WorkspaceUnitErrors, postalErrors: Record<number, string>): WorkspaceUnitErrors {
  return Object.fromEntries(Object.entries(errors).map(([id, fields]) => [id, {
    ...fields, ...(postalErrors[Number(id)] ? { cep: postalErrors[Number(id)] } : {}),
  }]))
}
