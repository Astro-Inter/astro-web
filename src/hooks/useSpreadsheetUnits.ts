import { useEffect, useRef, useState } from 'react'
import type { WorkspaceUnitAddress } from '../types/address'
import { readRegistrationSpreadsheet } from '../utils/spreadsheet'
import { reconcileSpreadsheetUnits } from '../utils/workspaceUnits'
import { ManagerEmailMissingError } from '../utils/spreadsheetErrors'
import { validateRegistrationEmails } from '../services/registrationValidation'

export function useSpreadsheetUnits() {
  const [state, setState] = useState({ loading: false, error: '', managerEmailMissing: false })
  const mounted = useRef(true)
  const busy = useRef(false)
  const validated = useRef<{ file: File; email: string; names: string[] } | null>(null)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; controller.current?.abort() }
  }, [])

  async function readUnits(file: File, previous: WorkspaceUnitAddress[], managerEmail: string): Promise<WorkspaceUnitAddress[] | null> {
    if (busy.current) return null
    if (validated.current?.file === file && validated.current.email === managerEmail) {
      return reconcileSpreadsheetUnits(validated.current.names, previous)
    }
    busy.current = true
    validated.current = null
    const request = new AbortController()
    controller.current = request
    setState({ loading: true, error: '', managerEmailMissing: false })
    try {
      // Permite pintar o carregamento antes da leitura e análise síncrona do Excel.
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      const { names, emails } = await readRegistrationSpreadsheet(file, managerEmail)
      request.signal.throwIfAborted()
      const emailErrors = await validateRegistrationEmails(emails, request.signal)
      if (emailErrors.length) throw new Error(emailErrors.map(error => `Linha ${error.row} · E-mail: ${error.message}`).join('\n'))
      if (!mounted.current) return null
      validated.current = { file, email: managerEmail, names }
      setState({ loading: false, error: '', managerEmailMissing: false })
      return reconcileSpreadsheetUnits(names, previous)
    } catch (error: unknown) {
      if (mounted.current) setState({ loading: false,
        managerEmailMissing: error instanceof ManagerEmailMissingError,
        error: error instanceof ManagerEmailMissingError ? '' : error instanceof Error ? error.message : 'Não foi possível validar a planilha.',
      })
      return null
    } finally {
      busy.current = false
    }
  }

  return { ...state, readUnits, clearError: () => setState(current => ({ ...current, error: '', managerEmailMissing: false })) }
}
