import { useEffect, useRef, useState } from 'react'
import { importWorkspace, WorkspaceApiError } from '../services/workspaceSettings'
import { listUnitAddresses } from '../services/units'
import { readImportSpreadsheetUnitNames } from '../utils/spreadsheet'
import { normalizeUnitName, reconcileSpreadsheetUnits } from '../utils/workspaceUnits'
import type { WorkspaceUnitAddress } from '../types/address'
import type { SpreadsheetImportMessage, WorkspaceImportResult } from '../types/workspaceSettings'

interface WorkspaceImportState {
  file: File | null
  units: WorkspaceUnitAddress[] | null
  reading: boolean
  error: string
  rows: SpreadsheetImportMessage[]
  result: WorkspaceImportResult | null
}

export function useWorkspaceImport() {
  const [state, setState] = useState<WorkspaceImportState>({ file: null, units: null, reading: false, error: '', rows: [], result: null })
  const controller = useRef<AbortController | null>(null)
  const busy = useRef(false)
  useEffect(() => () => controller.current?.abort(), [])

  function reset(file: File | null = null) {
    controller.current?.abort()
    setState({ file, units: null, reading: false, error: '', rows: [], result: null })
  }

  async function prepare(file: File | null): Promise<boolean> {
    if (!file || busy.current) return false
    busy.current = true
    const request = new AbortController()
    controller.current?.abort()
    controller.current = request
    setState({ file, units: null, reading: true, error: '', rows: [], result: null })
    try {
      const [names, existing] = await Promise.all([readImportSpreadsheetUnitNames(file), listUnitAddresses(request.signal)])
      request.signal.throwIfAborted()
      const existingNames = new Set(existing.map(unit => normalizeUnitName(unit.name)))
      const newNames = names.filter(name => !existingNames.has(normalizeUnitName(name)))
      if (newNames.length > 100) throw new Error('A planilha contém mais de 100 unidades novas. Divida a importação.')
      const units = reconcileSpreadsheetUnits(newNames, [])
      setState(current => ({ ...current, units, reading: false }))
      return true
    } catch (error: unknown) {
      if (!request.signal.aborted) setState(current => ({ ...current, reading: false, error: error instanceof Error ? error.message : 'Não foi possível ler a planilha.' }))
      return false
    } finally { busy.current = false }
  }

  async function save(units: WorkspaceUnitAddress[]): Promise<string | null> {
    if (!state.file) return 'Selecione a planilha.'
    try {
      const result = await importWorkspace(state.file, units, controller.current?.signal)
      if (!controller.current?.signal.aborted) setState(current => ({ ...current, result, error: '', rows: [] }))
      return null
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Não foi possível importar a planilha.'
      if (!controller.current?.signal.aborted) setState(current => ({ ...current, error: message, rows: error instanceof WorkspaceApiError ? error.rows : [] }))
      return message
    }
  }

  return { ...state, prepare, save, reset }
}
