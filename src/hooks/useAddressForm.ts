import { useRef, useState, type FormEvent, type RefObject } from 'react'
import type { WorkspaceAddressErrors, WorkspaceAddressField, WorkspaceUnitAddress, WorkspaceUnitErrors } from '../types/address'
import { mergePostalErrors, validateAddressUnits, visibleAddressErrors } from '../utils/addressForm'
import type { useWorkspaceAddresses } from './useWorkspaceAddresses'

interface AddressFormOptions {
  addresses: ReturnType<typeof useWorkspaceAddresses>
  settingsMode: boolean
  onComplete: (units: WorkspaceUnitAddress[]) => void
}

interface AddressFormState {
  unitErrors: WorkspaceUnitErrors
  hasChangedUnit: boolean
}

interface AddressFormResult {
  formRef: RefObject<HTMLFormElement | null>
  errors: WorkspaceAddressErrors
  hasChangedUnit: boolean
  changeUnit: (action: () => void) => void
  updateField: (field: WorkspaceAddressField, value: string) => void
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export function useAddressForm({ addresses, settingsMode, onComplete }: AddressFormOptions): AddressFormResult {
  const [state, setState] = useState<AddressFormState>({ unitErrors: {}, hasChangedUnit: false })
  const formRef = useRef<HTMLFormElement>(null)
  const submitting = useRef(false)
  const { address, activeUnit, postalCode } = addresses
  const errors = visibleAddressErrors(activeUnit, address.units, state.unitErrors[activeUnit.id] ?? {}, settingsMode)

  function changeUnit(action: () => void): void {
    setState(current => ({ ...current, hasChangedUnit: true }))
    action()
  }

  function updateField(field: WorkspaceAddressField, value: string): void {
    addresses.changeField(field, value)
    setState(current => ({ ...current, unitErrors: {
      ...current.unitErrors, [activeUnit.id]: { ...current.unitErrors[activeUnit.id], [field]: undefined },
    } }))
  }

  function focusInvalidUnit(unit: WorkspaceUnitAddress, selector: string): void {
    if (unit.id !== activeUnit.id) changeUnit(() => addresses.selectUnit(unit.id))
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>(selector)?.focus())
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (submitting.current || postalCode.status === 'loading' || addresses.validatingPostalCodes) return
    const nextErrors = validateAddressUnits(address.units, settingsMode)
    setState(current => ({ ...current, unitErrors: nextErrors }))
    const invalidUnit = address.units.find(unit => Object.keys(nextErrors[unit.id] ?? {}).length)
    if (invalidUnit) {
      focusInvalidUnit(invalidUnit, 'input[aria-invalid="true"]')
      return
    }
    submitting.current = true
    try {
      const postalErrors = await addresses.validatePostalCodes(address.units)
      if (!postalErrors) return
      const invalidPostalUnit = address.units.find(unit => postalErrors[unit.id])
      if (invalidPostalUnit) {
        setState(current => ({ ...current, unitErrors: mergePostalErrors(nextErrors, postalErrors) }))
        focusInvalidUnit(invalidPostalUnit, '#unit-cep')
        return
      }
      onComplete(address.units)
    } finally {
      submitting.current = false
    }
  }

  return { formRef, errors, hasChangedUnit: state.hasChangedUnit, changeUnit, updateField, submit }
}
