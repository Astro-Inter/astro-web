import { useEffect, useRef, useState } from 'react'
import { loadExplorerCatalog, queryExplorer } from '../services/dashboards'
import type { AnalyticsFilters, AnalyticsWidget, ExplorerCatalog, ExplorerQuery, ExplorerResult } from '../types/dashboard'

export function useExplorerCatalog() {
  const [catalog, setCatalog] = useState<ExplorerCatalog>()
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('')
    loadExplorerCatalog(controller.signal).then(result => { if (!controller.signal.aborted) { setCatalog(result); setLoading(false) } }).catch((failure: unknown) => { if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : 'Não foi possível ler o catálogo.'); setLoading(false) } })
    return () => controller.abort()
  }, [attempt])
  return { catalog, error, loading, retry: () => setAttempt(value => value + 1) }
}
export function useExplorerData(widgets: AnalyticsWidget[], filters: AnalyticsFilters, workspaceId: string, attempt: number) {
  const selection = JSON.stringify(widgets.filter(widget => widget.datasetId === 'custom' && widget.query).map(widget => ({ id: widget.id, query: widget.query })))
  const key = JSON.stringify([selection, filters, workspaceId, attempt])
  const lastAttempt = useRef(attempt)
  const [state, setState] = useState<{ key: string; results: Record<string, ExplorerResult>; errors: Record<string, string>; pending: boolean }>({ key: '', results: {}, errors: {}, pending: true })
  useEffect(() => {
    const controller = new AbortController(), requested = JSON.parse(selection) as { id: string; query: ExplorerQuery }[]
    const refresh = lastAttempt.current !== attempt; lastAttempt.current = attempt
    const results: Record<string, ExplorerResult> = {}, errors: Record<string, string> = {}
    const groups = [...new Set(requested.map(widget => JSON.stringify(widget.query)))]
    let cursor = 0, completed = 0
    async function worker() {
      while (!controller.signal.aborted && cursor < groups.length) {
        const serialized = groups[cursor++], targets = requested.filter(widget => JSON.stringify(widget.query) === serialized)
        try { const result = await queryExplorer(JSON.parse(serialized) as ExplorerQuery, filters, workspaceId, controller.signal, refresh); for (const widget of targets) results[widget.id] = result }
        catch (failure) { for (const widget of targets) errors[widget.id] = failure instanceof Error ? failure.message : 'Não foi possível calcular este indicador.' }
        completed++
        if (!controller.signal.aborted) setState({ key, results: { ...results }, errors: { ...errors }, pending: completed < groups.length })
      }
    }
    void Promise.all(Array.from({ length: Math.min(3, groups.length) }, worker)).then(() => { if (!controller.signal.aborted) setState({ key, results, errors, pending: false }) })
    return () => controller.abort()
  }, [selection, filters, workspaceId, key])
  return state.key === key ? state : { key, results: {}, errors: {}, pending: true }
}
