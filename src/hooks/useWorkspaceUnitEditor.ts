import { useEffect, useRef, useState } from 'react'
import type { WorkspaceUnitAddress } from '../types/address'
import { saveUnitAddress } from '../services/units'
import { workspaceUnitPayload } from '../utils/workspaceSettings'
import { useWorkspaceAddresses } from './useWorkspaceAddresses'

export function useWorkspaceUnitEditor(initialUnits: WorkspaceUnitAddress[]) {
  const addresses = useWorkspaceAddresses(initialUnits)
  const baseline = useRef(new Map(initialUnits.filter(unit => unit.persistedId).map(unit => [unit.id, JSON.stringify({ ...unit, source: unit.source ?? 'manual' })])))
  const [message, setMessage] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function save(): Promise<string | null> {
    if (request.current && !request.current.signal.aborted) return 'Aguarde a gravação em andamento.'
    const controller = new AbortController()
    request.current = controller
    const units = addresses.address.units
    try {
      units.forEach(workspaceUnitPayload)
      for (const unit of units) {
        controller.signal.throwIfAborted()
        if (baseline.current.get(unit.id) === JSON.stringify(unit)) continue
        const saved = { ...await saveUnitAddress(unit, controller.signal), id: unit.id }
        controller.signal.throwIfAborted()
        addresses.applySavedUnit(unit.id, saved)
        baseline.current.set(unit.id, JSON.stringify(saved))
      }
      setMessage('Unidades atualizadas.')
      return null
    } catch (error: unknown) {
      const details = error instanceof Error ? error.message : 'Não foi possível salvar as unidades.'
      const message = `As unidades são salvas individualmente. As já confirmadas foram mantidas; confira as demais antes de reenviar. ${details}`
      if (!controller.signal.aborted) setMessage(message)
      return message
    } finally { if (request.current === controller) request.current = null }
  }
  return { addresses, save, message }
}
