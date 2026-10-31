import { useEffect, useRef, useState } from 'react'
import { queryExplorer } from '../services/dashboards'
import { validateAndSanitizeExplorerQuery } from '../utils/dashboardQuery'
import type { AnalyticsFilters, ExplorerCatalog, ExplorerQuery, ExplorerResult } from '../types/dashboard'

interface PreviewState { key: string; pending: boolean; result?: ExplorerResult; error?: string }
interface ExplorerPreviewResult { pending: boolean; result?: ExplorerResult; error?: string; calculate: () => Promise<void> }

export function useExplorerPreview(query: ExplorerQuery, filters: AnalyticsFilters, workspaceId: string, catalog: ExplorerCatalog): ExplorerPreviewResult {
  const key = JSON.stringify([query, filters, workspaceId])
  const [state, setState] = useState<PreviewState>({ key: '', pending: false })
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current?.abort(); request.current = null }, [key])
  const current = state.key === key ? state : { key, pending: false }
  async function calculate(): Promise<void> {
    if (request.current) return
    const validation = validateAndSanitizeExplorerQuery(query, catalog)
    if (!validation.values) { setState({ key, pending: false, error: Object.values(validation.errors)[0] }); return }
    const controller = new AbortController()
    request.current = controller
    setState({ key, pending: true, result: current.result })
    try {
      const result = await queryExplorer(validation.values, filters, workspaceId, controller.signal, !!current.result)
      if (!controller.signal.aborted) setState({ key, pending: false, result })
    } catch (error: unknown) {
      if (!controller.signal.aborted) setState({ key, pending: false, error: error instanceof Error ? error.message : 'Não foi possível calcular a prévia.' })
    } finally { if (request.current === controller) request.current = null }
  }
  return { ...current, calculate }
}
