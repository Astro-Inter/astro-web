import { useCallback, useState } from 'react'
import type { PostalAddress, WorkspaceAddressField, WorkspaceAddressState, WorkspaceUnitAddress } from '../types/address'
import { usePostalCodeLookup } from './usePostalCodeLookup'
import { mergePostalAddress } from '../utils/workspaceUnits'

function emptyUnit(id: number): WorkspaceUnitAddress {
  return { id, name: '', cep: '', state: '', city: '', neighborhood: '', street: '', number: '', complement: '' }
}

export function useWorkspaceAddresses(initialUnits?: WorkspaceUnitAddress[]) {
  const [address, setAddress] = useState<WorkspaceAddressState>({
    units: initialUnits?.length ? initialUnits : initialUnits ? [emptyUnit(1)] : [emptyUnit(1), emptyUnit(2)],
    activeId: initialUnits?.[0]?.id ?? 1,
    nextId: initialUnits?.length ? Math.max(...initialUnits.map(unit => unit.id)) + 1 : initialUnits ? 2 : 3,
  })
  const activeIndex = address.units.findIndex((unit) => unit.id === address.activeId)
  const activeUnit = address.units[activeIndex]

  const applyPostalAddress = useCallback((unit: WorkspaceUnitAddress, result: PostalAddress) => {
    setAddress(current => ({ ...current, units: current.units.map(item => mergePostalAddress(item, unit, result)) }))
  }, [])
  const { state: lookupState, lookup, reset: resetPostalCode } = usePostalCodeLookup(address.activeId, applyPostalAddress)
  const postalCode = lookupState.unitId === activeUnit.id && lookupState.cep === activeUnit.cep.replace(/\D/g, '')
    ? lookupState : { ...lookupState, status: 'idle' as const, message: '' }

  function changeField(field: WorkspaceAddressField, value: string) {
    if (field === 'cep') lookup({ ...activeUnit, cep: value })
    setAddress((current) => ({
      ...current,
      units: current.units.map((unit) => unit.id === current.activeId ? { ...unit, [field]: value } : unit),
    }))
  }

  function addUnit() {
    resetPostalCode()
    setAddress((current) => ({
      units: [...current.units, emptyUnit(current.nextId)],
      activeId: current.nextId,
      nextId: current.nextId + 1,
    }))
  }

  function removeUnit() {
    resetPostalCode()
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
    if (next) {
      resetPostalCode()
      setAddress((current) => ({ ...current, activeId: next.id }))
    }
  }

  function selectUnit(id: number) {
    if (!address.units.some(unit => unit.id === id)) return
    resetPostalCode()
    setAddress(current => ({ ...current, activeId: id }))
  }

  return { address, activeIndex, activeUnit, changeField, addUnit, removeUnit, moveUnit, selectUnit, postalCode, retryPostalCode: () => lookup(activeUnit) }
}
