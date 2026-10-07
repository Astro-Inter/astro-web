import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, DataTable, InviteEmployeeModal, ManagerIdentity, OptionsPopup, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/dataTable'
import { mockEmployees } from '../../data/employees'
import { useActionsMenu } from '../../hooks'
import type { Employee, EmployeeInviteValues } from '../../types'

const statusFilterOptions = [
  { value: '', label: 'Status', triggerLabel: 'Status', tone: 'muted' as const },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

function MainEmployeerScreenPage() {
  const inviteOriginRef = useRef<HTMLButtonElement | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees)
  const [filters, setFilters] = useState({ search: '', position: '', status: '' })
  const [inviteOpen, setInviteOpen] = useState(false)
  const [savedEmployeeId, setSavedEmployeeId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const actions = useActionsMenu()

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
  }, [])

  const positionFilterOptions = [
    { value: '', label: 'Cargos', triggerLabel: 'Cargos', tone: 'muted' as const },
    ...[...new Set(employees.map((employee) => employee.position))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((position) => ({ value: position, label: position })),
  ]
  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleEmployees = employees.filter((employee) => `${employee.name} ${employee.email}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    && (!filters.position || employee.position === filters.position)
    && (!filters.status || (filters.status === 'active') === employee.active))
  const openEmployee = visibleEmployees.find((employee) => employee.id === actions.openId)

  function inviteEmployee(values: EmployeeInviteValues): string | null {
    const email = values.email.toLocaleLowerCase('pt-BR')
    if (employees.some((employee) => employee.email.toLocaleLowerCase('pt-BR') === email)) return 'Já existe um colaborador com esse e-mail.'

    const newEmployeeId = crypto.randomUUID()
    setEmployees((current) => [...current, {
      id: newEmployeeId,
      name: values.name,
      email: values.email,
      unit: values.unit,
      position: values.position,
      modality: values.modality,
      cpf: values.cpf,
      active: values.status === 'active',
    }])
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
    setSavedEmployeeId(newEmployeeId)
    setFeedback(`Colaborador ${values.name} adicionado.`)
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null
      setSavedEmployeeId(null)
    }, 900)
    return null
  }

  function closeInvite() {
    setInviteOpen(false)
    inviteOriginRef.current?.focus()
  }

  const columns: DataTableColumn<Employee>[] = [
    { id: 'name', label: 'Colaborador', width: '21%', rowHeader: true, render: (employee) => <ManagerIdentity name={employee.name} /> },
    { id: 'email', label: 'E-mail', width: '27%', render: (employee) => <TruncatedText>{employee.email}</TruncatedText> },
    { id: 'position', label: 'Cargo', width: '22%', render: (employee) => <TruncatedText>{employee.position}</TruncatedText> },
    {
      id: 'status', label: 'Status', width: '16.5%',
      render: (employee) => <span className={`position-status${employee.active ? ' position-status--active' : ''}${employee.id === savedEmployeeId ? ' position-status--saved' : ''}`}><TruncatedText truncate={false}>{employee.active ? 'Ativo' : 'Inativo'}</TruncatedText></span>,
    },
    {
      id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
      render: (employee) => (
        <div className="position-actions">
          <button
            aria-controls={actions.openId === employee.id ? `employee-actions-${employee.id}` : undefined}
            aria-expanded={actions.openId === employee.id}
            aria-haspopup="menu"
            aria-label={`Ações para ${employee.name}`}
            className="position-actions-trigger"
            onClick={(event) => actions.toggle(employee.id, event.currentTarget)}
            type="button"
          >
            <AstroIcon name="dots" />
          </button>
        </div>
      ),
    },
  ]

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
            <CompactPurpleButton onClick={(event) => { inviteOriginRef.current = event.currentTarget; setInviteOpen(true) }} type="button">
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

          <DataTable ariaLabel="Colaboradores" columns={columns} emptyMessage="Nenhum colaborador encontrado para esses filtros." getRowClassName={(employee) => employee.id === savedEmployeeId ? 'astro-data-table-row--saved' : undefined} getRowKey={(employee) => employee.id} rows={visibleEmployees} />
          <p className="sr-only" role="status">{feedback}</p>
        </section>

        {openEmployee && createPortal(
          <OptionsPopup
            ariaLabel={`Opções para ${openEmployee.name}`}
            closing={actions.closing}
            id={`employee-actions-${openEmployee.id}`}
            items={[
              { id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => actions.close() },
              { id: 'view', label: 'Ver mais informações', separatorAfter: true, disabled: true, onSelect: () => undefined },
              { id: 'edit', label: 'Editar', separatorAfter: true, disabled: true, onSelect: () => undefined },
              { id: 'toggle-status', label: openEmployee.active ? 'Inativar' : 'Ativar', tone: openEmployee.active ? 'danger' : 'default', disabled: true, onSelect: () => undefined },
            ]}
            onClose={() => actions.close()}
            panelRef={actions.panelRef}
            style={actions.style}
          />,
          document.body,
        )}

        <AstroChat />
      </main>

      {inviteOpen && <InviteEmployeeModal onClose={closeInvite} onInvite={inviteEmployee} />}
    </div>
  )
}

export default MainEmployeerScreenPage
