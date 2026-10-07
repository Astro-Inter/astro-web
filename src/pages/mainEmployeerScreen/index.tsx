import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, ConfirmationModal, DataTable, InviteEmployeeModal, ManagerDetailsModal, ManagerIdentity, OptionsPopup, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/dataTable'
import PasswordConfirmationModal from '../../components/passwordConfirmationModal'
import { mockEmployees } from '../../data/employees'
import { useActionsMenu } from '../../hooks'
import type { Employee, EmployeeInviteValues, ManagerDetailsValues } from '../../types'
import { iconAsset } from '../../utils/iconAsset'

const statusFilterOptions = [
  { value: '', label: 'Status', triggerLabel: 'Status', tone: 'muted' as const },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

type EmployeeDialogState =
  | { kind: 'view' | 'edit' | 'edit-password'; employee: Employee }
  | { kind: 'confirm-edit'; employee: Employee; values: ManagerDetailsValues }
  | { kind: 'deactivate'; employee: Employee }

function MainEmployeerScreenPage() {
  const inviteOriginRef = useRef<HTMLButtonElement | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees)
  const [filters, setFilters] = useState({ search: '', position: '', status: '' })
  const [inviteOpen, setInviteOpen] = useState(false)
  const [dialog, setDialog] = useState<EmployeeDialogState | null>(null)
  const [details, setDetails] = useState({ dimmed: false, closing: false })
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
    showSavedEmployee(newEmployeeId, `Colaborador ${values.name} adicionado.`)
    return null
  }

  function showSavedEmployee(employeeId: string, message: string) {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
    setSavedEmployeeId(employeeId)
    setFeedback(message)
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null
      setSavedEmployeeId(null)
    }, 900)
  }

  function checkDuplicateEmail(values: ManagerDetailsValues, employeeId: string): string | null {
    const email = values.email.toLocaleLowerCase('pt-BR')
    return employees.some((employee) => employee.id !== employeeId && employee.email.toLocaleLowerCase('pt-BR') === email)
      ? 'Já existe um colaborador com esse e-mail.'
      : null
  }

  function saveEmployee(employeeId: string, values: ManagerDetailsValues): string | null {
    const duplicateError = checkDuplicateEmail(values, employeeId)
    if (duplicateError) return duplicateError

    setEmployees((current) => current.map((employee) => employee.id === employeeId ? { ...employee, ...values } : employee))
    showSavedEmployee(employeeId, `Colaborador ${values.name} atualizado.`)
    return null
  }

  function toggleStatus(employee: Employee) {
    setEmployees((current) => current.map((item) => item.id === employee.id ? { ...item, active: !item.active } : item))
    showSavedEmployee(employee.id, `Colaborador ${employee.name} ${employee.active ? 'inativado' : 'ativado'}.`)
  }

  function closeDetails() {
    if (dialog?.kind === 'confirm-edit') return
    setDialog(null)
    setDetails({ dimmed: false, closing: false })
    actions.triggerRef.current?.focus()
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
              { id: 'view', label: 'Ver mais informações', separatorAfter: true, onSelect: () => actions.close(() => setDialog({ kind: 'view', employee: openEmployee })) },
              { id: 'edit', label: 'Editar', separatorAfter: true, onSelect: () => actions.close(() => setDialog({ kind: 'edit-password', employee: openEmployee })) },
              { id: 'toggle-status', label: openEmployee.active ? 'Inativar' : 'Ativar', tone: openEmployee.active ? 'danger' : 'default', onSelect: () => actions.close(() => {
                if (openEmployee.active) setDialog({ kind: 'deactivate', employee: openEmployee })
                else toggleStatus(openEmployee)
              }) },
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

      {dialog?.kind === 'edit-password' && (
        <PasswordConfirmationModal
          className="textPasswotdAccount1ModalWeb"
          onCancel={() => {
            setDialog(null)
            actions.triggerRef.current?.focus()
          }}
          onContinue={() => setDialog({ kind: 'edit', employee: dialog.employee })}
        />
      )}
      {dialog && (dialog.kind === 'view' || dialog.kind === 'edit' || dialog.kind === 'confirm-edit') && (
        <ManagerDetailsModal
          dimmed={details.dimmed}
          key={dialog.employee.id}
          manager={dialog.employee}
          mode={dialog.kind === 'view' ? 'view' : 'edit'}
          onClose={closeDetails}
          onSubmit={(values) => {
            const error = checkDuplicateEmail(values, dialog.employee.id)
            if (error) return error
            setDetails((current) => ({ ...current, dimmed: true }))
            setDialog({ kind: 'confirm-edit', employee: dialog.employee, values })
            return null
          }}
          open={!details.closing}
          positions={employees.map((employee) => employee.position)}
          subject="colaborador"
          units={employees.map((employee) => employee.unit)}
        />
      )}
      {dialog?.kind === 'confirm-edit' && (
        <ConfirmationModal
          confirmCloseDelay={60}
          confirmLabel="Salvar"
          onCancel={() => {
            setDetails((current) => ({ ...current, dimmed: false }))
            setDialog({ kind: 'edit', employee: dialog.employee })
          }}
          onCancelRequest={() => setDetails((current) => ({ ...current, dimmed: false }))}
          onConfirm={() => {
            const error = saveEmployee(dialog.employee.id, dialog.values)
            if (!error) setDetails((current) => ({ ...current, closing: true }))
            return error
          }}
          onConfirmed={() => {
            setDialog(null)
            setDetails({ dimmed: false, closing: false })
            requestAnimationFrame(() => actions.triggerRef.current?.focus())
          }}
          title="Deseja salvar as alterações deste colaborador?"
        />
      )}
      {dialog?.kind === 'deactivate' && (
        <ConfirmationModal
          backdrop="dimmed"
          className="position-deactivation-modal"
          confirmLabel="Inativar"
          icon={<span aria-hidden="true" className="position-deactivation-icon"><img alt="" src={iconAsset('warning.svg')} /></span>}
          onCancel={() => {
            setDialog(null)
            actions.triggerRef.current?.focus()
          }}
          onConfirm={() => { toggleStatus(dialog.employee); return null }}
          onConfirmed={() => {
            setDialog(null)
            requestAnimationFrame(() => actions.triggerRef.current?.focus())
          }}
          title="Tem certeza de que deseja inativar este colaborador?"
          tone="danger"
        />
      )}
    </div>
  )
}

export default MainEmployeerScreenPage
