import { useState } from 'react'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, DataTable, ManagerIdentity, ToolbarSearch, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/dataTable'
import { mockConformities } from '../../data/conformities'
import type { Conformity } from '../../types'
import { conformityStatusLabels, formatConformityDate, getConformityStatus } from '../../utils/conformity'

const statusClassNames = {
  valid: ' position-status--active',
  expired: ' position-status--expired',
  'no-expiry': ' position-status--no-expiry',
}

function MainConformityScreenPage() {
  const [conformities] = useState<Conformity[]>(mockConformities)
  const [filters, setFilters] = useState({ search: '' })

  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleConformities = conformities.filter((conformity) => conformity.employeeName.toLocaleLowerCase('pt-BR').includes(normalizedSearch))

  const columns: DataTableColumn<Conformity>[] = [
    { id: 'employee', label: 'Colaborador', width: '23%', rowHeader: true, render: (conformity) => <ManagerIdentity name={conformity.employeeName} /> },
    { id: 'nr', label: 'NR', width: '11%', render: (conformity) => <TruncatedText>{conformity.nr}</TruncatedText> },
    { id: 'expiresAt', label: 'Data de validade', width: '20.5%', render: (conformity) => <TruncatedText>{formatConformityDate(conformity.expiresAt)}</TruncatedText> },
    { id: 'origin', label: 'Origem', width: '13%', render: (conformity) => <TruncatedText>{conformity.origin}</TruncatedText> },
    {
      id: 'status', label: 'Status', width: '19%',
      render: (conformity) => {
        const status = getConformityStatus(conformity.expiresAt)
        return <span className={`position-status${statusClassNames[status]}`}><TruncatedText truncate={false}>{conformityStatusLabels[status]}</TruncatedText></span>
      },
    },
    {
      id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
      render: (conformity) => (
        <div className="position-actions">
          <button aria-label={`Ações para ${conformity.employeeName} na ${conformity.nr}`} className="position-actions-trigger" type="button">
            <AstroIcon name="dots" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="main-position-screen main-manager-screen main-conformity-screen">
      <AppSidebar />

      <main className="position-main" id="conteudo-principal">
        <section aria-labelledby="conformities-title" className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="conformities-title">Conformidades</h1>
            <p>Acompanhe a situação de conformidade dos colaboradores em relação às NRs. Cada linha representa um colaborador e uma NR.</p>
          </header>

          <div aria-label="Ações e filtros das conformidades" className="position-toolbar" role="group">
            <CompactPurpleButton type="button">
              <AstroIcon name="plus" />
              Adicionar conformidade
            </CompactPurpleButton>

            <ToolbarSearch
              label="Buscar colaboradores"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              onClear={() => setFilters((current) => ({ ...current, search: '' }))}
              placeholder="Buscar colaboradores..."
              value={filters.search}
            />

            <div className="position-toolbar-selects">
              <button className="conformity-filter-button" type="button">
                Filtros
                <AstroIcon name="chevron-down" />
              </button>
            </div>
          </div>

          <DataTable ariaLabel="Conformidades" columns={columns} emptyMessage="Nenhuma conformidade encontrada para esses filtros." getRowKey={(conformity) => conformity.id} rows={visibleConformities} />
        </section>
        <AstroChat />
      </main>
    </div>
  )
}

export default MainConformityScreenPage
