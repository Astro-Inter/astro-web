import { useState } from 'react'
import type { WorkspaceAddressField, WorkspaceAddressState, WorkspaceUnitAddress } from '../types/address'

function emptyUnit(id: number): WorkspaceUnitAddress {
  return { id, name: '', cep: '', state: '', city: '', neighborhood: '', street: '', number: '', complement: '' }
}

export function useWorkspaceAddresses() {
  const [address, setAddress] = useState<WorkspaceAddressState>({
    units: [emptyUnit(1), emptyUnit(2)],
    activeId: 1,
    nextId: 3,
  })
  const activeIndex = address.units.findIndex((unit) => unit.id === address.activeId)
  const activeUnit = address.units[activeIndex]

  function changeField(field: WorkspaceAddressField, value: string) {
    setAddress((current) => ({
      ...current,
      units: current.units.map((unit) => unit.id === current.activeId ? { ...unit, [field]: value } : unit),
    }))
  }

  function addUnit() {
    setAddress((current) => ({
      units: [...current.units, emptyUnit(current.nextId)],
      activeId: current.nextId,
      nextId: current.nextId + 1,
    }))
  }

  function removeUnit() {
    setAddress((current) => {
      if (current.units.length === 1) {
        return { ...current, units: [emptyUnit(current.activeId)] }
      }

      const currentIndex = current.units.findIndex((unit) => unit.id === current.activeId)
      const remaining = current.units.filter((unit) => unit.id !== current.activeId)
      return {
        ...current,
        units: remaining,
        activeId: remaining[Math.min(currentIndex, remaining.length - 1)].id,
      }
    })
  }

  function moveUnit(direction: -1 | 1) {
    const next = address.units[activeIndex + direction]
    if (next) setAddress((current) => ({ ...current, activeId: next.id }))
  }

  return { address, activeIndex, activeUnit, changeField, addUnit, removeUnit, moveUnit }
}
