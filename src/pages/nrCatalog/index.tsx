import { useState } from 'react'
import { isNrReviewDemo } from '../../data/nrReviewMode'
import { useSearchParams } from 'react-router-dom'
import NrReviewLayout from '../../components/nrReviewLayout'
import DataTable, { type DataTableColumn } from '../../components/dataTable'
import NrCatalogEditor from '../../components/nrCatalogEditor'
import NrLoadError from '../../components/nrLoadError'
import ToolbarSearch from '../../components/toolbarSearch'
import ToolbarSelect from '../../components/toolbarSelect'
import { nrUsabilityFilterOptions, nrRevocationFilterOptions } from '../../data/nrReviewFilters'
import AstroIcon from '../../components/astroIcon'
import { useNrCatalog } from '../../hooks/useNrCatalog'
import { filterPendingNrs, nrDemoScenario } from '../../utils/nrReview'
import type { NrDocument, NrReviewFilters } from '../../types/nrReview'

const initialFilters: NrReviewFilters = { search: '', usability: '', revoked: '', page: 1 }

export default function NrCatalogPage() {
  const [params] = useSearchParams()
  const scenario = nrDemoScenario(params.get('scenario'))
  const catalog = useNrCatalog(scenario)
  const [filters, setFilters] = useState(initialFilters)
  const [selected, setSelected] = useState<NrDocument | null>(null)
  const [notice, setNotice] = useState('')
  const rows = filterPendingNrs(catalog.rows, filters)
  function filter(field: 'search' | 'usability' | 'revoked', value: string): void {
    setFilters(current => ({ ...current, [field]: value }))
  }
  const columns: readonly DataTableColumn<NrDocument>[] = [
    { id: 'number', label: 'Norma', width: '12%', rowHeader: true, render: row => <strong className="nr-review-code">NR-{row._id}</strong> },
    { id: 'name', label: 'Nome', width: '34%', render: row => row.nome },
    { id: 'usability', label: 'Usabilidade', render: row => row.usabilidade },
    { id: 'date', label: 'Data da fonte', render: row => row.ultima_atualizacao },
    { id: 'status', label: 'Revogação', render: row => <span className={`position-status${row.revogada ? '' : ' position-status--active'}`}>{row.revogada ? 'Revogada' : 'Não revogada'}</span> },
    { id: 'actions', label: 'Ação', width: '5rem', className: 'nr-review-action-cell', render: row => <button aria-label={`Consultar NR-${row._id}`} title={`Consultar NR-${row._id}`} aria-haspopup="dialog" className="nr-review-row-action nr-review-row-action--icon" type="button" onClick={() => { setNotice(''); setSelected(row) }}><AstroIcon name="document-lines" /></button> },
  ]
  return <NrReviewLayout title="Catálogo de NRs" description="Consulte as normas do catálogo e mantenha suas informações atualizadas.">
    <section className="nr-review-filters" aria-label="Filtros do catálogo">
      <div className="nr-review-filter-field nr-review-filter-field--search">
        <span className="nr-review-filter-label" aria-hidden="true">Buscar norma</span>
        <ToolbarSearch id="nr-catalog-search" label="Buscar por número ou nome" value={filters.search} onChange={event => filter('search', event.target.value)} onClear={() => filter('search', '')} placeholder="Número ou nome da NR..." />
      </div>
      <div className="nr-review-filter-field"><label htmlFor="nr-catalog-usability" id="nr-catalog-usability-label">Usabilidade</label><ToolbarSelect id="nr-catalog-usability" label="Usabilidade" value={filters.usability} onValueChange={value => filter('usability', value)} options={nrUsabilityFilterOptions} searchable={false} closeOnPageScroll={false} labelledBy="nr-catalog-usability-label" /></div>
      <div className="nr-review-filter-field"><label htmlFor="nr-catalog-revoked" id="nr-catalog-revoked-label">Revogação</label><ToolbarSelect id="nr-catalog-revoked" label="Revogação" value={filters.revoked} onValueChange={value => filter('revoked', value)} options={nrRevocationFilterOptions} searchable={false} closeOnPageScroll={false} labelledBy="nr-catalog-revoked-label" /></div>
      <button className="nr-review-clear" type="button" onClick={() => setFilters(initialFilters)}><AstroIcon name="reload" />Limpar filtros</button>
    </section>
    {notice && <p className="nr-review-notice" role="status">{notice}</p>}
    {catalog.error ? <NrLoadError title="Não foi possível carregar o catálogo" message={catalog.error} onRetry={catalog.retry} /> : <>
      <div className="nr-catalog-grid">
        <DataTable ariaLabel="Catálogo atual de NRs" columns={columns} rows={rows} getRowKey={row => String(row._id)} loading={catalog.loading} emptyMessage={catalog.rows.length ? 'Nenhum resultado para os filtros selecionados.' : 'Nenhuma NR no catálogo.'} />
      </div>
      <p role="status">{catalog.loading ? 'Carregando catálogo…' : `${rows.length} resultado(s)`}</p>
    </>}
    {selected && <NrCatalogEditor key={`${scenario}-${selected._id}`} document={selected} onClose={() => setSelected(null)} onSave={async (document, expected) => {
      await catalog.save(document, expected)
      setNotice(isNrReviewDemo ? `NR-${document._id} alterada na simulação local. Nenhuma alteração foi enviada ao MongoDB.` : `Alterações da NR-${document._id} salvas no catálogo.`)
    }} />}
  </NrReviewLayout>
}
