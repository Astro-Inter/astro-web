import { firebaseAuth } from './firebase'
import { analyticsCatalog, validAnalyticsFilters } from '../data/dashboardCatalog'
import { isExplorerQuery } from '../data/explorer'
import type { AnalyticsDashboard, AnalyticsFilters, AnalyticsIdentity, AnalyticsView, DashboardDraft, ExplorerCatalog, ExplorerQuery, ExplorerResult, SavedDashboard } from '../types/dashboard'

export class DashboardApiError extends Error {
  status: number
  constructor(message: string, status = 0) { super(message); this.name = 'DashboardApiError'; this.status = status }
}
function baseUrl(): string {
  const configured = import.meta.env.VITE_DASHBOARD_API_URL?.trim() || 'https://astro-dashboard-api.app-4str0.workers.dev'
  const url = new URL(configured)
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new DashboardApiError('O endereço do serviço de dashboards não é válido.')
  return import.meta.env.DEV ? '/dashboard-api' : configured.replace(/\/+$/, '')
}
async function request(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<unknown> {
  const user = firebaseAuth.currentUser
  if (!user) throw new DashboardApiError('Entre na sua conta para consultar os dashboards.', 401)
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 45_000)
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await user.getIdToken(attempt === 1)
      if (firebaseAuth.currentUser?.uid !== user.uid || controller.signal.aborted) throw new DashboardApiError('A sessão mudou. Carregue a visão novamente.', 401)
      const response = await fetch(`${baseUrl()}${path}`, { ...init, signal: controller.signal,
        headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...Object.fromEntries(new Headers(init.headers)), Authorization: `Bearer ${token}` } })
      if (response.status === 401 && attempt === 0) continue
      if (firebaseAuth.currentUser?.uid !== user.uid) throw new DashboardApiError('A sessão mudou. Carregue a visão novamente.', 401)
      if (response.status === 204 && response.ok) return undefined
      let payload: unknown = null
      try { payload = await response.json() } catch { /* Respostas intermediárias podem não ter JSON. */ }
      if (!response.ok) {
        const body = payload as { error?: { message?: string } } | null
        const fallback = response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : response.status === 403 ? 'Sua conta não tem acesso aos dashboards deste workspace.' : response.status === 409 ? 'Esta visão mudou em outra sessão. Recarregue antes de salvar.' : 'Não foi possível carregar os dashboards. Tente novamente.'
        throw new DashboardApiError(body?.error?.message || fallback, response.status)
      }
      return payload
    }
    throw new DashboardApiError('Sua sessão expirou. Entre novamente.', 401)
  } catch (error) {
    if (signal?.aborted || error instanceof DashboardApiError) throw error
    throw new DashboardApiError(controller.signal.aborted ? 'A consulta demorou mais que o esperado. Tente novamente ou reduza o período.' : 'Não foi possível conectar ao serviço de dashboards. Tente novamente.')
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
}
export async function loadAnalyticsIdentity(signal?: AbortSignal): Promise<AnalyticsIdentity> {
  const identity = await request('/api/me', {}, signal) as AnalyticsIdentity
  if (!identity || !/^\d+$/.test(identity.workspaceId) || !/^\d+$/.test(identity.userId) || !['GESTOR', 'GESTOR_WORKSPACE'].includes(identity.role)) throw new DashboardApiError('Não foi possível confirmar o acesso ao workspace.')
  return identity
}
export async function loadAnalytics(view: AnalyticsView, filters: AnalyticsFilters, workspaceId: string, signal?: AbortSignal, refresh = false): Promise<AnalyticsDashboard> {
  const result = await request(`/api/dashboard?${new URLSearchParams({ ...filters, view })}`, { headers: refresh ? { 'X-Dashboard-Refresh': '1' } : {} }, signal) as AnalyticsDashboard
  if (!result || result.workspaceId !== workspaceId || result.view !== view || result.dataSource !== 'databricks' || !result.filters || result.filters.start !== filters.start || result.filters.end !== filters.end || result.filters.granularity !== filters.granularity || !Number.isFinite(Date.parse(result.generatedAt)) || !Array.isArray(result.charts) || result.charts.length !== (view === 'visao-geral' ? 3 : 5) || !Array.isArray(result.kpis)
    || result.kpis.some(k => typeof k.label !== 'string' || !Number.isSafeInteger(k.value) || k.value < 0)
    || result.charts.some(chart => !Array.isArray(chart.dimensions) || !chart.dimensions.length || chart.dimensions.some(d => typeof d !== 'string') || typeof chart.measure !== 'string' || !Array.isArray(chart.rows)
      || chart.rows.some(row => typeof row !== 'object' || row === null || !Number.isSafeInteger(row[chart.measure]) || Number(row[chart.measure]) < 0 || chart.dimensions.some(d => !['string', 'number'].includes(typeof row[d]))))) {
    throw new DashboardApiError('O serviço retornou dados incompatíveis com esta visão.')
  }
  return result
}
function saved(value: unknown): SavedDashboard {
  const item = value as SavedDashboard
  // Configurações antigas de tabela reabrem como o gráfico padrão do indicador.
  if (Array.isArray(item?.config?.widgets)) item.config.widgets = item.config.widgets.map(widget => {
    const source = analyticsCatalog.find(entry => entry.id === widget?.datasetId)
    return { ...widget, width: 'half', ...((widget?.type as string) === 'table' && source ? { type: source.types[0] } : {}) }
  })
  if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || !Number.isInteger(item.version) || item.version < 1 || !item.config || !item.config.filters || !validAnalyticsFilters(item.config.filters)
    || !Array.isArray(item.config.widgets) || item.config.widgets.length > 12 || item.config.widgets.some(w => typeof w.id !== 'string' || typeof w.title !== 'string' || !['half', 'full'].includes(w.width) || !(w.datasetId === 'custom' ? isExplorerQuery(w.query) && ['line', 'bar', 'pie'].includes(w.type) : analyticsCatalog.some(c => c.id === w.datasetId && c.types.includes(w.type))))) throw new DashboardApiError('Não foi possível ler a configuração de uma visão salva.')
  return item
}
export async function loadSavedDashboards(workspaceId: string, signal?: AbortSignal): Promise<SavedDashboard[]> {
  const result = await request('/api/saved-dashboards', {}, signal) as { workspaceId: string; items: unknown[] }
  if (result?.workspaceId !== workspaceId || !Array.isArray(result.items)) throw new DashboardApiError('Não foi possível confirmar as visões deste workspace.')
  return result.items.map(saved)
}
export async function saveDashboard(draft: DashboardDraft, existing: SavedDashboard | null, signal?: AbortSignal): Promise<SavedDashboard> {
  return saved(await request(existing ? `/api/saved-dashboards/${encodeURIComponent(existing.id)}` : '/api/saved-dashboards', {
    method: existing ? 'PUT' : 'POST', body: JSON.stringify({ ...draft, ...(existing ? { version: existing.version } : {}) }),
  }, signal))
}
export async function removeDashboard(item: SavedDashboard, signal?: AbortSignal): Promise<void> {
  await request(`/api/saved-dashboards/${encodeURIComponent(item.id)}`, { method: 'DELETE', body: JSON.stringify({ version: item.version }) }, signal)
}
export async function loadExplorerCatalog(signal?: AbortSignal): Promise<ExplorerCatalog> {
  const result = await request('/api/explorer/catalog', {}, signal) as ExplorerCatalog
  if (!result || typeof result.version !== 'string' || !Array.isArray(result.datasets) || !result.datasets.length || result.datasets.some(dataset => typeof dataset.id !== 'string' || typeof dataset.label !== 'string' || !Array.isArray(dataset.fields) || !dataset.fields.length || dataset.fields.some(field => typeof field.id !== 'string' || typeof field.label !== 'string' || !Array.isArray(field.operations)))) throw new DashboardApiError('Não foi possível ler o catálogo de campos.')
  return result
}
export async function queryExplorer(query: ExplorerQuery, filters: AnalyticsFilters, workspaceId: string, signal?: AbortSignal, refresh = false): Promise<ExplorerResult> {
  const result = await request('/api/explorer/query', { method: 'POST', body: JSON.stringify({ query, filters }), headers: refresh ? { 'X-Dashboard-Refresh': '1' } : {} }, signal) as ExplorerResult
  const chart = result?.chart
  if (!result || result.workspaceId !== workspaceId || result.dataSource !== 'databricks' || !Number.isFinite(Date.parse(result.generatedAt)) || !result.filters || JSON.stringify(result.filters) !== JSON.stringify({ start: filters.start, end: filters.end, granularity: filters.granularity }) || !chart || !Array.isArray(chart.dimensions) || !chart.dimensions.length || typeof chart.measure !== 'string' || !Array.isArray(chart.rows) || chart.rows.some(row => !row || typeof row !== 'object' || typeof row[chart.measure] !== 'number' || !Number.isFinite(row[chart.measure]) || Math.abs(Number(row[chart.measure])) > Number.MAX_SAFE_INTEGER || chart.dimensions.some(field => !['string', 'number'].includes(typeof row[field])))) throw new DashboardApiError('O cálculo retornou dados incompatíveis com esta visão.')
  return result
}
