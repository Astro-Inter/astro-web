import { useState } from 'react'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, DataTable, ManagerIdentity, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/dataTable'
import { mockEmployees } from '../../data/employees'
import type { Employee } from '../../types'

const positionFilterOptions = [
  { value: '', label: 'Cargos', triggerLabel: 'Cargos', tone: 'muted' as const },
  ...[...new Set(mockEmployees.map((employee) => employee.position))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((position) => ({ value: position, label: position })),
]
const statusFilterOptions = [
  { value: '', label: 'Status', triggerLabel: 'Status', tone: 'muted' as const },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

const columns: DataTableColumn<Employee>[] = [
  { id: 'name', label: 'Colaborador', width: '21%', rowHeader: true, render: (employee) => <ManagerIdentity name={employee.name} /> },
  { id: 'email', label: 'E-mail', width: '27%', render: (employee) => <TruncatedText>{employee.email}</TruncatedText> },
  { id: 'position', label: 'Cargo', width: '22%', render: (employee) => <TruncatedText>{employee.position}</TruncatedText> },
  {
    id: 'status', label: 'Status', width: '16.5%',
    render: (employee) => <span className={`position-status${employee.active ? ' position-status--active' : ''}`}><TruncatedText truncate={false}>{employee.active ? 'Ativo' : 'Inativo'}</TruncatedText></span>,
  },
  {
    id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
    render: (employee) => (
      <div className="position-actions">
        <button aria-disabled="true" aria-label={`Ações para ${employee.name}`} className="position-actions-trigger" title="Em breve" type="button">
          <AstroIcon name="dots" />
        </button>
      </div>
    ),
  },
]

function MainEmployeerScreenPage() {
  const [filters, setFilters] = useState({ search: '', position: '', status: '' })

  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleEmployees = mockEmployees.filter((employee) => `${employee.name} ${employee.email}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    && (!filters.position || employee.position === filters.position)
    && (!filters.status || (filters.status === 'active') === employee.active))

  return (
    <div className="main-position-screen main-manager-screen">
      <AppSidebar />

      <main className="position-main" id="conteudo-principal">
        <section aria-labelledby="employees-title" className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="employees-title">Colaboradores</h1>
            <p>Administre acessos, acompanhe a atuação e gerencie colaboradores de cada unidade.</p>
          </header>

          <div aria-label="Ações e filtros dos colaboradores" className="position-toolbar" role="group">
            <CompactPurpleButton aria-disabled="true" title="Em breve" type="button">
              <AstroIcon name="plus" />
              Adicionar colaborador
            </CompactPurpleButton>

            <ToolbarSearch
              label="Buscar colaboradores"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              onClear={() => setFilters((current) => ({ ...current, search: '' }))}
              placeholder="Buscar colaboradores..."
              value={filters.search}
            />

            <div className="position-toolbar-selects">
              <ToolbarSelect label="Filtrar por cargo" onValueChange={(position) => setFilters((current) => ({ ...current, position }))} options={positionFilterOptions} value={filters.position} />
              <ToolbarSelect label="Filtrar por status" onValueChange={(status) => setFilters((current) => ({ ...current, status }))} options={statusFilterOptions} value={filters.status} />
            </div>
          </div>

          <DataTable ariaLabel="Colaboradores" columns={columns} emptyMessage="Nenhum colaborador encontrado para esses filtros." getRowKey={(employee) => employee.id} rows={visibleEmployees} />
        </section>

        <AstroChat />
      </main>
    </div>
  )
}

export default MainEmployeerScreenPage
