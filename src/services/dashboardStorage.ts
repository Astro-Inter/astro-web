import { firebaseAuth } from './firebase'
import { analyticsCatalog, validAnalyticsFilters } from '../data/dashboardCatalog'
import { isExplorerQuery } from '../data/explorer'
import { isDashboardArtwork } from '../data/dashboardArtwork'
import { decodeDashboardCardTitle, encodeDashboardCardTitle } from '../utils/cardTitleMetadata'
import type { AnalyticsIdentity, AnalyticsWidget, DashboardDraft, ExplorerQuery, SavedDashboard } from '../types/dashboard'

const prefix = 'astro:dashboard-views:v1:'
const maxViews = 200, maxSize = 2_000_000
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
function text(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 && value.length <= 120 }
function cleanQuery(query: ExplorerQuery): ExplorerQuery {
  const metric = (value: ExplorerQuery['metric']) => ({ field: value.field, operation: value.operation })
  return { dataset: query.dataset, groupBy: query.groupBy, metric: metric(query.metric),
    ...(query.series ? { series: query.series } : {}),
    ...(query.formula ? { formula: { operator: query.formula.operator, operand: metric(query.formula.operand) } } : {}),
    where: query.where.map(row => ({ field: row.field, operator: row.operator, value: row.value })) }
}
function cleanDraft(value: unknown): DashboardDraft {
  if (!record(value) || typeof value.name !== 'string' || !text(decodeDashboardCardTitle(value.name).name) || !record(value.config) || !record(value.config.filters) || !Array.isArray(value.config.widgets) || value.config.widgets.length > 12) throw new Error('A configuração desta visão não é válida.')
  const title = decodeDashboardCardTitle(value.name)
  const filters = { start: value.config.filters.start, end: value.config.filters.end, granularity: value.config.filters.granularity }
  if (typeof filters.start !== 'string' || typeof filters.end !== 'string' || !['dia', 'semana', 'mes', 'ano'].includes(String(filters.granularity)) || !validAnalyticsFilters(filters as DashboardDraft['config']['filters'])) throw new Error('Confira o período e a granularidade da visão.')
  const widgets: AnalyticsWidget[] = value.config.widgets.map((widget: unknown) => {
    if (!record(widget) || typeof widget.id !== 'string' || !uuid.test(widget.id) || !text(widget.title)) throw new Error('Um gráfico salvo tem uma configuração inválida.')
    const source = analyticsCatalog.find(item => item.id === widget.datasetId)
    const type = widget.type === 'table' && source ? source.types[0] : widget.type
    if (widget.datasetId === 'custom' ? !isExplorerQuery(widget.query) || !['line', 'bar', 'pie'].includes(String(type)) : !source || !source.types.includes(type as AnalyticsWidget['type'])) throw new Error('Um gráfico salvo não é compatível com o catálogo.')
    return { id: widget.id, datasetId: String(widget.datasetId), title: widget.title.trim(), type: type as AnalyticsWidget['type'], width: 'half', ...(widget.datasetId === 'custom' ? { query: cleanQuery(widget.query as ExplorerQuery) } : {}) }
  })
  if (new Set(widgets.map(widget => widget.id)).size !== widgets.length) throw new Error('Os gráficos da visão precisam ter identificadores diferentes.')
  if (value.config.artwork !== undefined && !isDashboardArtwork(value.config.artwork)) throw new Error('Escolha uma ilustração válida para esta visão.')
  const artwork = title.marked ? title.artwork ?? (title.name === 'Eventos' ? 'trends' : 'overview') : value.config.artwork
  return { name: title.name, config: { filters: filters as DashboardDraft['config']['filters'], widgets, ...(isDashboardArtwork(artwork) ? { artwork } : {}) } }
}
function cleanSaved(value: unknown): SavedDashboard {
  if (!record(value) || typeof value.id !== 'string' || !uuid.test(value.id) || !Number.isSafeInteger(value.version) || Number(value.version) < 1 || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) || typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) throw new Error('Não foi possível ler uma visão salva neste navegador.')
  return { ...cleanDraft(value), id: value.id, version: Number(value.version), createdAt: value.createdAt, updatedAt: value.updatedAt }
}
function scopeKey(identity: AnalyticsIdentity, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const uid = firebaseAuth.currentUser?.uid
  if (!uid || !/^\d+$/.test(identity.userId) || !/^\d+$/.test(identity.workspaceId)) throw new Error('Entre na sua conta para acessar as visões deste navegador.')
  return `${prefix}${encodeURIComponent(uid)}:${identity.userId}:${identity.workspaceId}`
}
function read(key: string): SavedDashboard[] {
  let raw: string | null
  try { raw = localStorage.getItem(key) } catch { throw new Error('O navegador bloqueou o armazenamento das visões. Permita os dados deste site para continuar.') }
  if (raw === null) return []
  try {
    if (raw.length > maxSize) throw new Error()
    const data: unknown = JSON.parse(raw)
    if (!record(data) || (data._versao !== 1 && !(data._versao === undefined && data.schemaVersion === 1)) || !Array.isArray(data.items) || data.items.length > maxViews) throw new Error()
    const items = data.items.map(cleanSaved)
    if (new Set(items.map(item => item.id)).size !== items.length) throw new Error()
    if (data._versao === undefined) write(key, items)
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch { throw new Error('As visões salvas neste navegador estão em um formato inválido. Os dados existentes foram preservados.') }
}
function write(key: string, items: SavedDashboard[]) {
  const serialized = JSON.stringify({ _versao: 1, items: items.map(item => ({ ...item, name: encodeDashboardCardTitle(item.name, item.config.artwork ?? (item.name === 'Eventos' ? 'trends' : 'overview')) })) })
  if (serialized.length > maxSize) throw new Error('As visões atingiram o limite de armazenamento. Remova gráficos ou visões que não utiliza.')
  try { localStorage.setItem(key, serialized) } catch { throw new Error('Não foi possível salvar neste navegador. Confira o espaço disponível e a permissão para armazenar dados do site.') }
}
async function change<T>(identity: AnalyticsIdentity, signal: AbortSignal | undefined, action: (items: SavedDashboard[]) => { items: SavedDashboard[]; result: T }): Promise<T> {
  const key = scopeKey(identity, signal)
  function apply() {
    if (scopeKey(identity, signal) !== key) throw new Error('A sessão mudou. Reabra a visão antes de salvar.')
    const next = action(read(key))
    write(key, next.items)
    return next.result
  }
  return navigator.locks ? navigator.locks.request(key, { ...(signal ? { signal } : {}) }, apply) : apply()
}
export async function loadSavedDashboards(identity: AnalyticsIdentity, signal?: AbortSignal): Promise<SavedDashboard[]> { return read(scopeKey(identity, signal)) }
export async function saveDashboard(draft: DashboardDraft, existing: SavedDashboard | null, identity: AnalyticsIdentity, signal?: AbortSignal): Promise<SavedDashboard> {
  const clean = cleanDraft(draft)
  return change(identity, signal, items => {
    const previous = existing ? items.find(item => item.id === existing.id) : undefined
    if (existing && (!previous || previous.version !== existing.version)) throw new Error('Esta visão foi alterada ou excluída em outra aba. Reabra a página antes de salvar.')
    if (!existing && items.length >= maxViews) throw new Error('Você já tem 200 visões neste navegador. Exclua uma antes de criar outra.')
    const now = new Date().toISOString()
    const result: SavedDashboard = { ...clean, id: previous?.id || crypto.randomUUID(), version: (previous?.version || 0) + 1, createdAt: previous?.createdAt || now, updatedAt: now }
    return { items: [result, ...items.filter(item => item.id !== result.id)], result }
  })
}
export async function removeDashboard(item: SavedDashboard, identity: AnalyticsIdentity, signal?: AbortSignal): Promise<void> {
  return change(identity, signal, items => {
    const previous = items.find(saved => saved.id === item.id)
    if (!previous || previous.version !== item.version) throw new Error('Esta visão foi alterada ou excluída em outra aba. Reabra a página antes de excluir.')
    return { items: items.filter(saved => saved.id !== item.id), result: undefined }
  })
}
export function subscribeSavedDashboards(identity: AnalyticsIdentity, onChange: () => void) {
  const key = scopeKey(identity)
  const listener = (event: StorageEvent) => { if ((event.key === key || event.key === null) && event.storageArea === localStorage) onChange() }
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}
