import { useEffect, useRef, useState } from 'react'
import { loadAnalytics } from '../services/dashboards'
import type { AnalyticsDashboard, AnalyticsFilters, AnalyticsView } from '../types/dashboard'

export function useAnalyticsData(views: AnalyticsView[], filters: AnalyticsFilters, workspaceId: string, attempt: number) {
  const selection = [...new Set(views)].sort().join(',')
  const lastAttempt = useRef(attempt)
  const key = JSON.stringify([selection, filters, workspaceId, attempt])
  const [state, setState] = useState<{ key: string; results: Partial<Record<AnalyticsView, AnalyticsDashboard>>; errors: Partial<Record<AnalyticsView, string>>; pending: boolean }>({ key: '', results: {}, errors: {}, pending: true })
  useEffect(() => {
    const controller = new AbortController()
    const refresh = lastAttempt.current !== attempt; lastAttempt.current = attempt
    const requested = selection.split(',').filter(Boolean) as AnalyticsView[]
    void Promise.allSettled(requested.map(view => loadAnalytics(view, filters, workspaceId, controller.signal, refresh))).then(results => {
      if (controller.signal.aborted) return
      const data: Partial<Record<AnalyticsView, AnalyticsDashboard>> = {}
      const errors: Partial<Record<AnalyticsView, string>> = {}
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') data[requested[index]] = result.value
        else errors[requested[index]] = result.reason instanceof Error ? result.reason.message : 'Não foi possível carregar esta visão.'
      })
      setState({ key, results: data, errors, pending: false })
    })
    return () => controller.abort()
  }, [selection, filters, workspaceId, key])
  return state.key === key ? state : { key, results: {}, errors: {}, pending: true }
}
