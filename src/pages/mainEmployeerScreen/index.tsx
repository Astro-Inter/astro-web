import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { AppSidebar, AstroIcon, CompactPurpleButton, ConfirmationModal, DataTable, OptionsPopup, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import CollaboratorDialog from '../../components/collaboratorDialog'
import CollaboratorIdentity from '../../components/collaboratorIdentity'
import CollaboratorTableSkeleton from '../../components/collaboratorTableSkeleton'
import type { DataTableColumn } from '../../components/dataTable'
import PasswordConfirmationModal from '../../components/passwordConfirmationModal'
import { useActionsMenu } from '../../hooks'
import { useCollaborators } from '../../hooks/useCollaborators'
import type { Collaborator, CollaboratorFormValues } from '../../types/collaborator'
import { collaboratorStatusLabels } from '../../utils/collaborator'
import { iconAsset } from '../../utils/iconAsset'

const statusFilterOptions = [
  { value: '', label: 'Status', triggerLabel: 'Status', tone: 'muted' as const },
  ...Object.entries(collaboratorStatusLabels).map(([value, label]) => ({ value, label })),
]

type EmployeeDialogState =
  | { kind: 'view' | 'edit' | 'edit-password'; employee: Collaborator }
  | { kind: 'confirm-edit'; employee: Collaborator; values: CollaboratorFormValues }
  | { kind: 'deactivate'; employee: Collaborator }

function MainEmployeerScreenPage() {
  const location = useLocation()
  const inviteOriginRef = useRef<HTMLButtonElement | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const [filters, setFilters] = useState({ search: '', position: '', status: '' })
  const [inviteOpen, setInviteOpen] = useState(() => location.state?.openCreate === true)
  const [dialog, setDialog] = useState<EmployeeDialogState | null>(null)
  const detailId = dialog && ['view', 'edit', 'confirm-edit'].includes(dialog.kind) ? dialog.employee.id : undefined
  const api = useCollaborators(detailId, inviteOpen || dialog?.kind === 'edit' || dialog?.kind === 'confirm-edit')
  const { employees } = api
  const [details, setDetails] = useState({ dimmed: false, closing: false })
  const [savedEmployeeId, setSavedEmployeeId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [actionError, setActionError] = useState('')
  const actions = useActionsMenu()

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
  }, [])

  const positionFilterOptions = [
    { value: '', label: 'Cargos', triggerLabel: 'Cargos', tone: 'muted' as const },
    ...[...new Map(employees.map((employee) => [employee.roleId, { value: employee.roleId, label: employee.position }])).values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  ]
  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleEmployees = employees.filter((employee) => `${employee.name} ${employee.email}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    && (!filters.position || employee.roleId === filters.position)
    && (!filters.status || employee.status === filters.status))
  const openEmployee = visibleEmployees.find((employee) => employee.id === actions.openId)

  async function inviteEmployee(values: CollaboratorFormValues): Promise<string | null> {
    const result = await api.save(values)
    if (result.error !== null) return result.error
    showSavedEmployee(result.collaborator.id, `Colaborador ${result.collaborator.name} pré-cadastrado.`)
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

  function checkDuplicateEmail(values: CollaboratorFormValues, employeeId: string): string | null {
    const email = values.email.toLocaleLowerCase('pt-BR')
    return employees.some((employee) => employee.id !== employeeId && employee.email.toLocaleLowerCase('pt-BR') === email)
      ? 'Já existe um colaborador com esse e-mail.'
      : null
  }

  async function saveEmployee(employeeId: string, values: CollaboratorFormValues): Promise<string | null> {
    const duplicateError = checkDuplicateEmail(values, employeeId)
    if (duplicateError) return duplicateError

    const result = await api.save(values, employeeId)
    if (result.error !== null) return result.error
    showSavedEmployee(result.collaborator.id, `Colaborador ${result.collaborator.name} atualizado.`)
    return null
  }

  async function toggleStatus(employee: Collaborator): Promise<string | null> {
    setActionError('')
    const result = await api.changeStatus(employee.id, employee.status === 'DESATIVADO' ? 'ATIVO' : 'DESATIVADO')
    if (result.error !== null) return result.error
    showSavedEmployee(result.collaborator.id, `Colaborador ${result.collaborator.name} ${collaboratorStatusLabels[result.collaborator.status].toLowerCase()}.`)
    return null
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

  const columns: DataTableColumn<Collaborator>[] = [
    { id: 'name', label: 'Colaborador', width: '21%', rowHeader: true, render: (employee) => <CollaboratorIdentity name={employee.name} photoUrl={employee.profilePhotoUrl} initials={employee.avatarInitials} /> },
    { id: 'email', label: 'E-mail', width: '25%', render: (employee) => <TruncatedText>{employee.email}</TruncatedText> },
    { id: 'position', label: 'Cargo', width: '22%', render: (employee) => <TruncatedText>{employee.position}</TruncatedText> },
    {
      id: 'status', label: 'Status', width: '18.5%',
      render: (employee) => <span className={`position-status${employee.status === 'ATIVO' ? ' position-status--active' : ''}${employee.id === savedEmployeeId ? ' position-status--saved' : ''}`}><TruncatedText truncate={false}>{collaboratorStatusLabels[employee.status]}</TruncatedText></span>,
    },
    {
      id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
      render: (employee) => (
        <div className="position-actions">
          <button
            disabled={api.loading || api.saving}
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
    <div className="main-position-screen main-manager-screen main-collaborator-screen" data-collaborators-loading={api.loading}>
      <AppSidebar />

      <main className="position-main" id="conteudo-principal">
        <section aria-labelledby="employees-title" aria-busy={api.loading} className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="employees-title">Colaboradores</h1>
            <p>Administre acessos, acompanhe a atuação e gerencie colaboradores de cada unidade.</p>
          </header>

          <div aria-label="Ações e filtros dos colaboradores" className="position-toolbar" role="group">
            <CompactPurpleButton disabled={api.loading || api.saving || Boolean(api.error)} onClick={(event) => { inviteOriginRef.current = event.currentTarget; api.retryOptions(); setInviteOpen(true) }} type="button">
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

          {api.error && <div className="position-api-feedback"><p role="alert">{api.error}</p><button disabled={api.saving} onClick={api.retry} type="button">Tentar novamente</button></div>}
          {api.saving && <p className="position-api-feedback" role="status">Salvando alterações...</p>}
          {actionError && <p className="position-api-feedback" role="alert">{actionError}</p>}
          <DataTable ariaLabel="Colaboradores" columns={columns} loadingContent={api.loading ? <CollaboratorTableSkeleton /> : undefined} emptyMessage={api.error ? 'Lista de colaboradores indisponível.' : 'Nenhum colaborador encontrado para esses filtros.'} getRowClassName={(employee) => employee.id === savedEmployeeId ? 'astro-data-table-row--saved' : undefined} getRowKey={(employee) => employee.id} rows={visibleEmployees} />
          <p className="position-api-feedback" role="status">{feedback}</p>
        </section>

        {openEmployee && createPortal(
          <OptionsPopup
            ariaLabel={`Opções para ${openEmployee.name}`}
            closing={actions.closing}
            id={`employee-actions-${openEmployee.id}`}
            items={[
              { id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => actions.close() },
              { id: 'view', label: 'Ver mais informações', separatorAfter: true, onSelect: () => actions.close(() => { api.retryDetails(); setDialog({ kind: 'view', employee: openEmployee }) }) },
              { id: 'edit', label: 'Editar', separatorAfter: true, onSelect: () => actions.close(() => setDialog({ kind: 'edit-password', employee: openEmployee })) },
              { id: 'toggle-status', label: openEmployee.status === 'DESATIVADO' ? 'Ativar' : 'Desativar', tone: openEmployee.status === 'DESATIVADO' ? 'default' : 'danger', onSelect: () => actions.close(() => {
                if (openEmployee.status !== 'DESATIVADO') setDialog({ kind: 'deactivate', employee: openEmployee })
                else void toggleStatus(openEmployee).then((error) => { if (error) setActionError(error) })
              }) },
            ]}
            onClose={() => actions.close()}
            panelRef={actions.panelRef}
            style={actions.style}
          />,
          document.body,
        )}

      </main>

      {inviteOpen && <CollaboratorDialog collaborator={null} mode="create" options={api.options.data} loading={api.options.loading || api.loading}
        error={api.options.error || api.error} saving={api.saving} onClose={closeInvite} onRetry={() => { api.retryOptions(); if (api.error) api.retry() }} onSubmit={inviteEmployee} />}

      {dialog?.kind === 'edit-password' && (
        <PasswordConfirmationModal
          key={dialog.employee.id}
          className="textPasswotdAccount1ModalWeb"
          onCancel={() => {
            setDialog(null)
            actions.triggerRef.current?.focus()
          }}
          onContinue={() => { api.retryDetails(); api.retryOptions(); setDialog({ kind: 'edit', employee: dialog.employee }) }}
        />
      )}
      {dialog && (dialog.kind === 'view' || dialog.kind === 'edit' || dialog.kind === 'confirm-edit') && (
        <CollaboratorDialog
          dimmed={details.dimmed}
          key={dialog.employee.id}
          collaborator={api.details.data}
          options={api.options.data}
          loading={api.details.loading || (dialog.kind !== 'view' && api.options.loading)}
          error={api.details.error || (dialog.kind !== 'view' ? api.options.error : '')}
          saving={api.saving}
          onRetry={() => { api.retryDetails(); if (dialog.kind !== 'view') api.retryOptions() }}
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
          onConfirm={async () => {
            const error = await saveEmployee(dialog.employee.id, dialog.values)
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
          confirmLabel="Desativar"
          icon={<span aria-hidden="true" className="position-deactivation-icon"><img alt="" src={iconAsset('warning.svg')} /></span>}
          onCancel={() => {
            setDialog(null)
            actions.triggerRef.current?.focus()
          }}
          onConfirm={() => toggleStatus(dialog.employee)}
          onConfirmed={() => {
            setDialog(null)
            requestAnimationFrame(() => actions.triggerRef.current?.focus())
          }}
          title="Tem certeza de que deseja desativar este colaborador?"
          tone="danger"
        />
      )}
    </div>
  )
}

export default MainEmployeerScreenPage
