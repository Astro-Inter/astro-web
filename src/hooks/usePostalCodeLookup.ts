import { useCallback, useEffect, useRef, useState } from 'react'
import type { PostalAddress, PostalCodeLookupState, WorkspaceUnitAddress } from '../types/address'
import { lookupPostalCode } from '../services/postalCode'

export function usePostalCodeLookup(activeId: number, onResolved: (unit: WorkspaceUnitAddress, result: PostalAddress) => void) {
  const [state, setState] = useState<PostalCodeLookupState>({ unitId: activeId, cep: '', status: 'idle', message: '' })
  const sequence = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancel = useCallback(() => {
    sequence.current++
    controller.current?.abort()
    if (timer.current) clearTimeout(timer.current)
  }, [])

  useEffect(() => cancel, [activeId, cancel])

  function lookup(unit: WorkspaceUnitAddress) {
    cancel()
    const cep = unit.cep.replace(/\D/g, '')
    if (cep.length !== 8) {
      setState({ unitId: unit.id, cep, status: 'idle', message: '' })
      return
    }
    const requestId = sequence.current
    const requestController = new AbortController()
    controller.current = requestController
    setState({ unitId: unit.id, cep, status: 'loading', message: '' })
    timer.current = setTimeout(async () => {
      try {
        const result = await lookupPostalCode(cep, requestController.signal)
        if (requestId !== sequence.current || requestController.signal.aborted) return
        onResolved(unit, result)
        setState({ unitId: unit.id, cep, status: 'success', message: 'Endereço preenchido pelo CEP. Confira os dados.' })
      } catch (error: unknown) {
        if (requestId !== sequence.current || requestController.signal.aborted) return
        setState({ unitId: unit.id, cep, status: 'error', message: error instanceof Error ? error.message : 'Não foi possível consultar o CEP. Preencha o endereço manualmente.' })
      }
    }, 350)
  }

  return { state, lookup, reset: () => {
    cancel()
    setState(current => ({ ...current, status: 'idle', message: '' }))
  } }
}
