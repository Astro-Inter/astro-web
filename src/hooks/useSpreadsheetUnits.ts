import { useEffect, useRef, useState } from 'react'
import type { WorkspaceUnitAddress } from '../types/address'
import { readSpreadsheetUnitNames } from '../utils/spreadsheet'
import { reconcileSpreadsheetUnits } from '../utils/workspaceUnits'

export function useSpreadsheetUnits() {
  const [state, setState] = useState({ loading: false, error: '' })
  const mounted = useRef(true)
  const busy = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function readUnits(file: File, previous: WorkspaceUnitAddress[], managerEmail: string): Promise<WorkspaceUnitAddress[] | null> {
    if (busy.current) return null
    busy.current = true
    setState({ loading: true, error: '' })
    try {
      const names = await readSpreadsheetUnitNames(file, managerEmail)
      if (!mounted.current) return null
      setState({ loading: false, error: '' })
      return reconcileSpreadsheetUnits(names, previous)
    } catch (error: unknown) {
      if (mounted.current) setState({ loading: false, error: error instanceof Error ? error.message : 'Não foi possível validar a planilha.' })
      return null
    } finally {
      busy.current = false
    }
  }

  return { ...state, readUnits, clearError: () => setState(current => ({ ...current, error: '' })) }
}
