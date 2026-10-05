import { useState } from 'react'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, DataTable, ManagerIdentity, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/dataTable'
import { managerUnits, mockManagers } from '../../data/managers'
import type { Manager } from '../../types/manager'

const unitFilterOptions = [
  { value: '', label: 'Unidade', triggerLabel: 'Unidade', tone: 'muted' as const },
  ...managerUnits.map((unit) => ({ value: unit, label: unit })),
]
const statusFilterOptions = [
  { value: '', label: 'Status', triggerLabel: 'Status', tone: 'muted' as const },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

const columns: DataTableColumn<Manager>[] = [
  { id: 'name', label: 'Gestor', width: '23%', rowHeader: true, render: (manager) => <ManagerIdentity name={manager.name} /> },
  { id: 'email', label: 'E-mail', width: '29%', render: (manager) => <TruncatedText>{manager.email}</TruncatedText> },
  { id: 'unit', label: 'Unidades', width: '18%', render: (manager) => <TruncatedText>{manager.unit}</TruncatedText> },
  {
    id: 'status', label: 'Status', width: '16.5%',
    render: (manager) => <span className={`position-status${manager.active ? ' position-status--active' : ''}`}><TruncatedText truncate={false}>{manager.active ? 'Ativo' : 'Inativo'}</TruncatedText></span>,
  },
  {
    id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
    render: (manager) => (
      <div className="position-actions">
        <button aria-disabled="true" aria-label={`Ações para ${manager.name}`} className="position-actions-trigger" title="Em breve" type="button">
          <AstroIcon name="dots" />
        </button>
      </div>
    ),
  },
]

function MainManagerScreenPage() {
  const [filters, setFilters] = useState({ search: '', unit: '', status: '' })

  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleManagers = mockManagers.filter((manager) => `${manager.name} ${manager.email}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    && (!filters.unit || manager.unit === filters.unit)
    && (!filters.status || (filters.status === 'active') === manager.active))

  return (
    <div className="main-position-screen main-manager-screen">
      <AppSidebar />

      <main className="position-main" id="conteudo-principal">
        <section aria-labelledby="managers-title" className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="managers-title">Gestores</h1>
            <p>Administre acessos, acompanhe a atuação e gerencie os responsáveis por cada unidade.</p>
          </header>

          <div aria-label="Ações e filtros dos gestores" className="position-toolbar" role="group">
            <CompactPurpleButton aria-disabled="true" title="Em breve" type="button">
              <AstroIcon name="plus" />
              Convidar gestor
            </CompactPurpleButton>

            <ToolbarSearch
              label="Buscar gestores"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              onClear={() => setFilters((current) => ({ ...current, search: '' }))}
              placeholder="Buscar gestores..."
              value={filters.search}
            />

            <div className="position-toolbar-selects">
              <ToolbarSelect label="Filtrar por unidade" onValueChange={(unit) => setFilters((current) => ({ ...current, unit }))} options={unitFilterOptions} value={filters.unit} />
              <ToolbarSelect label="Filtrar por status" onValueChange={(status) => setFilters((current) => ({ ...current, status }))} options={statusFilterOptions} value={filters.status} />
            </div>
          </div>

          <DataTable ariaLabel="Gestores" columns={columns} emptyMessage="Nenhum gestor encontrado para esses filtros." getRowKey={(manager) => manager.id} rows={visibleManagers} />
        </section>

        <AstroChat />
      </main>
    </div>
  )
}

export default MainManagerScreenPage
