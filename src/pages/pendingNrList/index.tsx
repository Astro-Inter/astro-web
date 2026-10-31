import { useState } from 'react'
import { isNrReviewDemo } from '../../data/nrReviewMode'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import NrReviewLayout from '../../components/nrReviewLayout'
import DataTable, { type DataTableColumn } from '../../components/dataTable'
import AstroIcon from '../../components/astroIcon'
import ToolbarSearch from '../../components/toolbarSearch'
import ToolbarSelect from '../../components/toolbarSelect'
import { nrUsabilityFilterOptions, nrRevocationFilterOptions } from '../../data/nrReviewFilters'
import NrReviewModal from '../../components/nrReviewModal'
import NrApprovalNotice from '../../components/nrApprovalNotice'
import NrLoadError from '../../components/nrLoadError'
import { useNrReview } from '../../hooks/useNrReview'
import { filterPendingNrs, nrDemoScenario, nrReviewLink, parseNrId } from '../../utils/nrReview'
import type { NrDocument, NrReviewFilters } from '../../types/nrReview'

const initialFilters: NrReviewFilters = { search: '', usability: '', revoked: '', page: 1 }
const pageSize = 5
export default function PendingNrListPage() {
  const [params, setParams] = useSearchParams()
  const { id: routeId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const scenario = nrDemoScenario(params.get('scenario'))
  const { data, loading, error, retry } = useNrReview(scenario)
  const [filters, setFilters] = useState(initialFilters)
  const [selected, setSelected] = useState<number | null | undefined>(() => routeId === undefined ? undefined : parseNrId(routeId))
  const [approvedId, setApprovedId] = useState<number | null>(() => parseNrId(params.get('approved')))
  const [sqlSynchronized, setSqlSynchronized] = useState(() => params.get('sql') !== 'pending')
  function closeReview(): void {
    setSelected(undefined)
    if (routeId !== undefined) navigate(nrReviewLink(scenario), { replace: true })
  }
  const documents = data?.candidates.map(item => item.document) ?? []
  const filtered = filterPendingNrs(documents, filters)
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(filters.page, pages)
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)
  function filter(field: 'search' | 'usability' | 'revoked', value: string): void { setFilters(current => ({ ...current, [field]: value, page: 1 })) }
  const columns: readonly DataTableColumn<NrDocument>[] = [
    { id: 'number', label: 'Norma', width: '6rem', rowHeader: true, render: item => <strong className="nr-review-code">NR-{item._id}</strong> },
    { id: 'name', label: 'Nome', render: item => <span className="nr-review-name">{item.nome}</span> },
    { id: 'usability', label: 'Usabilidade', width: '9rem', render: item => item.usabilidade },
    { id: 'source', label: 'Data da fonte', width: '9.5rem', render: item => <span className="nr-review-date">{item.ultima_atualizacao}</span> },
    { id: 'revoked', label: 'Revogação', width: '10rem', render: item => <span className={`position-status${item.revogada ? '' : ' position-status--active'}`}>{item.revogada ? 'Revogada' : 'Não revogada'}</span> },
    { id: 'action', label: 'Ação', width: '5rem', className: 'nr-review-action-cell', render: item => <button type="button" className="nr-review-row-action nr-review-row-action--icon" aria-label={`Revisar NR-${item._id}`} title={`Revisar NR-${item._id}`} aria-haspopup="dialog" onClick={() => setSelected(item._id)}><AstroIcon name="document-lines" /></button> },
  ]
  return <NrReviewLayout title="Revisão de NRs">
    {approvedId !== null && <NrApprovalNotice nrId={approvedId} demonstration={isNrReviewDemo} sqlSynchronized={sqlSynchronized} onDismiss={() => {
      setApprovedId(null)
      if (params.has('approved')) { const next = new URLSearchParams(params); next.delete('approved'); next.delete('sql'); setParams(next, { replace: true }) }
    }} />}
    <section className="nr-review-filters" aria-label="Filtros de NRs">
      <div className="nr-review-filter-field nr-review-filter-field--search">
        <span className="nr-review-filter-label" aria-hidden="true">Buscar norma</span>
        <ToolbarSearch id="nr-search" label="Buscar por número ou nome" value={filters.search} onChange={event => filter('search', event.target.value)} onClear={() => filter('search', '')} placeholder="Número ou nome da NR..." />
      </div>
      <div className="nr-review-filter-field"><label htmlFor="nr-usability" id="nr-usability-label">Usabilidade</label><ToolbarSelect id="nr-usability" label="Usabilidade" value={filters.usability} onValueChange={value => filter('usability', value)} options={nrUsabilityFilterOptions} searchable={false} closeOnPageScroll={false} labelledBy="nr-usability-label" /></div>
      <div className="nr-review-filter-field"><label htmlFor="nr-revoked" id="nr-revoked-label">Revogação</label><ToolbarSelect id="nr-revoked" label="Revogação" value={filters.revoked} onValueChange={value => filter('revoked', value)} options={nrRevocationFilterOptions} searchable={false} closeOnPageScroll={false} labelledBy="nr-revoked-label" /></div>
      <button className="nr-review-clear" type="button" onClick={() => setFilters(initialFilters)}><AstroIcon name="reload" />Limpar filtros</button>
    </section>
    {error ? <NrLoadError title="Não foi possível carregar as NRs pendentes" message={error} onRetry={retry} /> : <>
      <DataTable ariaLabel="NRs aguardando revisão" columns={columns} rows={rows} loading={loading} getRowKey={item => String(item._id)} emptyMessage={documents.length ? 'Nenhum resultado para os filtros selecionados.' : 'Nenhuma NR aguardando revisão.'} />
      <footer className="nr-review-table-footer">
      <p role="status">{loading ? 'Carregando NRs pendentes…' : `${filtered.length} resultado(s)`}</p>
      {!loading && filtered.length > 0 && <nav className="nr-review-pagination" aria-label="Paginação das NRs">
        <button type="button" disabled={page <= 1} onClick={() => setFilters(current => ({ ...current, page: page - 1 }))}>Página anterior</button>
        <span aria-current="page">Página {page} de {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => setFilters(current => ({ ...current, page: page + 1 }))}>Próxima página</button>
      </nav>}
      </footer>
    </>}
    {selected !== undefined && <NrReviewModal key={`${scenario}-${selected}`} id={selected} scenario={scenario} onClose={closeReview} onApproved={(id, synchronized) => {
      setApprovedId(id)
      setSqlSynchronized(synchronized)
      retry()
      setSelected(undefined)
      if (routeId !== undefined) navigate(`${nrReviewLink(scenario)}&approved=${id}&sql=${synchronized ? 'updated' : 'pending'}`, { replace: true })
    }} />}
  </NrReviewLayout>
}
