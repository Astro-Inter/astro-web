import { useState } from 'react'
import { AppSidebar, AstroChat, AstroIcon, DataTable, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/dataTable'
import { mockUnits } from '../../data/units'
import type { Unit } from '../../types'

const statusFilterOptions = [
  { value: '', label: 'Status', triggerLabel: 'Status', tone: 'muted' as const },
  { value: 'active', label: 'Ativa' },
  { value: 'inactive', label: 'Inativa' },
]

const columns: DataTableColumn<Unit>[] = [
  { id: 'name', label: 'Unidade', width: '28%', rowHeader: true, render: (unit) => <TruncatedText>{unit.name}</TruncatedText> },
  { id: 'collaborators', label: 'Quantidade de colaboradores', width: '42%', render: (unit) => <TruncatedText>{`${unit.collaboratorCount.toLocaleString('pt-BR')} colaboradores`}</TruncatedText> },
  {
    id: 'status', label: 'Status', width: '16.5%',
    render: (unit) => <span className={`position-status${unit.active ? ' position-status--active' : ''}`}><TruncatedText truncate={false}>{unit.active ? 'Ativa' : 'Inativa'}</TruncatedText></span>,
  },
  {
    id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
    render: (unit) => (
      <div className="position-actions">
        <button aria-disabled="true" aria-label={`Ações para ${unit.name}`} className="position-actions-trigger" title="Em breve" type="button">
          <AstroIcon name="dots" />
        </button>
      </div>
    ),
  },
]

function MainUnitScreenPage() {
  const [filters, setFilters] = useState({ search: '', status: '' })

  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleUnits = mockUnits.filter((unit) => unit.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    && (!filters.status || (filters.status === 'active') === unit.active))

  return (
    <div className="main-position-screen main-manager-screen">
      <AppSidebar />

      <main className="position-main" id="conteudo-principal">
        <section aria-labelledby="units-title" className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="units-title">Unidades</h1>
            <p>Organize, cadastre suas unidades e acompanhe o gerenciamento de cada local.</p>
          </header>

          <div aria-label="Filtros das unidades" className="position-toolbar" role="group">
            <ToolbarSearch
              label="Buscar unidades"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              onClear={() => setFilters((current) => ({ ...current, search: '' }))}
              placeholder="Buscar unidades..."
              value={filters.search}
            />

            <div className="position-toolbar-selects">
              <ToolbarSelect label="Filtrar por status" onValueChange={(status) => setFilters((current) => ({ ...current, status }))} options={statusFilterOptions} value={filters.status} />
            </div>
          </div>

          <DataTable ariaLabel="Unidades" columns={columns} emptyMessage="Nenhuma unidade encontrada para esses filtros." getRowKey={(unit) => unit.id} rows={visibleUnits} />
        </section>

        <AstroChat />
      </main>
    </div>
  )
}

export default MainUnitScreenPage
