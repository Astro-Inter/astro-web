import { useEffect, useRef, useState } from 'react'
import { lookupPostalCode } from '../services/postalCode'
import type { WorkspaceUnitAddress } from '../types/address'

export function useRegistrationPostalValidation() {
  const [validating, setValidating] = useState(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  async function validate(units: WorkspaceUnitAddress[]): Promise<Record<number, string> | null> {
    if (controller.current && !controller.current.signal.aborted) return null
    const request = new AbortController()
    controller.current = request
    setValidating(true)
    const errors: Record<number, string> = {}
    try {
      // Consulta uma vez cada CEP, mesmo quando várias unidades o compartilham.
      for (const cep of new Set(units.map(unit => unit.cep.replace(/[.\s-]/g, '')))) {
        try {
          await lookupPostalCode(cep, request.signal)
        } catch (error: unknown) {
          if (request.signal.aborted) return null
          const message = error instanceof Error && error.message.startsWith('CEP não encontrado')
            ? 'CEP não encontrado. Confira o número informado.'
            : 'Não foi possível validar o CEP. Tente novamente.'
          for (const unit of units) {
            if (unit.cep.replace(/[.\s-]/g, '') === cep) errors[unit.id] = message
          }
        }
      }
      return request.signal.aborted ? null : errors
    } finally {
      if (!request.signal.aborted) setValidating(false)
      request.abort()
    }
  }

  return { validating, validate }
}
