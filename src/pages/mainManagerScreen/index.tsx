import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppSidebar, AstroIcon, CompactPurpleButton, ConfirmationModal, DataTable, OptionsPopup, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import ManagerDetailsModal from '../../components/managerDetailsModal'
import CollaboratorIdentity from '../../components/collaboratorIdentity'
import InviteManagerDialog from '../../components/inviteManagerDialog'
import type { DataTableColumn } from '../../components/dataTable'
import PasswordConfirmationModal from '../../components/passwordConfirmationModal'
import { useActionsMenu } from '../../hooks'
import { useManagers } from '../../hooks/useManagers'
import type { ManagerSummary, ManagerFormValues, ManagerInviteValues } from '../../types/manager'
import { collaboratorStatusLabels } from '../../utils/collaborator'
import { iconAsset } from '../../utils/iconAsset'

const statusFilterOptions = [
  { value: '', label: 'Status', triggerLabel: 'Status', tone: 'muted' as const },
  ...Object.entries(collaboratorStatusLabels).map(([value, label]) => ({ value, label })),
]

type ManagerDialogState =
  | { kind: 'view' | 'edit' | 'edit-password'; manager: ManagerSummary }
  | { kind: 'confirm-edit'; manager: ManagerSummary; values: ManagerFormValues }
  | { kind: 'deactivate'; manager: ManagerSummary }

function MainManagerScreenPage() {
  const inviteOriginRef = useRef<HTMLButtonElement | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const [filters, setFilters] = useState({ search: '', unit: '', status: '' })
  const [inviteOpen, setInviteOpen] = useState(false)
  const [dialog, setDialog] = useState<ManagerDialogState | null>(null)
  const detailId = dialog && ['view', 'edit', 'confirm-edit'].includes(dialog.kind) ? dialog.manager.id : undefined
  const api = useManagers(detailId, dialog?.kind === 'edit' || dialog?.kind === 'confirm-edit', inviteOpen)
  const { managers } = api
  const [details, setDetails] = useState({ dimmed: false, closing: false })
  const [savedManagerId, setSavedManagerId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [actionError, setActionError] = useState('')
  const actions = useActionsMenu()

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
  }, [])

  const unitFilterOptions = [
    { value: '', label: 'Unidade', triggerLabel: 'Unidade', tone: 'muted' as const },
    ...[...new Map(managers.map((manager) => [manager.unitId, { value: manager.unitId, label: manager.unit }])).values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  ]
  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleManagers = managers.filter((manager) => `${manager.name} ${manager.email}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    && (!filters.unit || manager.unitId === filters.unit)
    && (!filters.status || manager.status === filters.status))
  const openManager = visibleManagers.find((manager) => manager.id === actions.openId)

  async function inviteManager(values: ManagerInviteValues): Promise<string | null> {
    const result = await api.promote(values)
    if (result.error !== null) return result.error
    showSavedManager(result.manager.id, `${result.manager.name} promovido a gestor.`)
    return null
  }

  function showSavedManager(managerId: string, message: string) {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
    setSavedManagerId(managerId)
    setFeedback(message)
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null
      setSavedManagerId(null)
    }, 900)
  }

  function checkDuplicateEmail(values: ManagerFormValues, managerId: string): string | null {
    const email = values.email.toLocaleLowerCase('pt-BR')
    return managers.some((manager) => manager.id !== managerId && manager.email.toLocaleLowerCase('pt-BR') === email)
      ? 'Já existe um gestor com esse e-mail.'
      : null
  }

  async function saveManager(managerId: string, values: ManagerFormValues): Promise<string | null> {
    const duplicateError = checkDuplicateEmail(values, managerId)
    if (duplicateError) return duplicateError

    const result = await api.save(values, managerId)
    if (result.error !== null) return result.error
    showSavedManager(result.manager.id, `Gestor ${result.manager.name} atualizado.`)
    return null
  }

  async function toggleStatus(manager: ManagerSummary): Promise<string | null> {
    setActionError('')
    const result = await api.changeStatus(manager.id, manager.status === 'DESATIVADO' ? 'ATIVO' : 'DESATIVADO')
    if (result.error !== null) return result.error
    showSavedManager(result.manager.id, `Gestor ${result.manager.name} ${collaboratorStatusLabels[result.manager.status].toLowerCase()}.`)
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

  const columns: DataTableColumn<ManagerSummary>[] = [
    { id: 'name', label: 'Gestor', width: '23%', rowHeader: true, render: (manager) => <CollaboratorIdentity name={manager.name} photoUrl={manager.profilePhotoUrl} initials={manager.avatarInitials} /> },
    { id: 'email', label: 'E-mail', width: '29%', render: (manager) => <TruncatedText>{manager.email}</TruncatedText> },
    { id: 'unit', label: 'Unidades', width: '18%', render: (manager) => <TruncatedText>{manager.unit}</TruncatedText> },
    {
      id: 'status', label: 'Status', width: '16.5%',
      render: (manager) => <span className={`position-status${manager.status === 'ATIVO' ? ' position-status--active' : ''}${manager.id === savedManagerId ? ' position-status--saved' : ''}`}><TruncatedText truncate={false}>{collaboratorStatusLabels[manager.status]}</TruncatedText></span>,
    },
    {
      id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
      render: (manager) => (
        <div className="position-actions">
          <button
            disabled={api.loading || api.saving}
            aria-controls={actions.openId === manager.id ? `manager-actions-${manager.id}` : undefined}
            aria-expanded={actions.openId === manager.id}
            aria-haspopup="menu"
            aria-label={`Ações para ${manager.name}`}
            className="position-actions-trigger"
            onClick={(event) => actions.toggle(manager.id, event.currentTarget)}
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
        <section aria-labelledby="managers-title" className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="managers-title">Gestores</h1>
            <p>Administre acessos, acompanhe a atuação e gerencie os responsáveis por cada unidade.</p>
          </header>

          <div aria-label="Ações e filtros dos gestores" className="position-toolbar" role="group">
            <CompactPurpleButton disabled={api.loading || api.saving || Boolean(api.error)} onClick={(event) => { inviteOriginRef.current = event.currentTarget; api.retryCandidates(); setInviteOpen(true) }} type="button">
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

          {api.loading && <p className="position-api-feedback" role="status">Carregando gestores...</p>}
          {api.error && <div className="position-api-feedback"><p role="alert">{api.error}</p><button disabled={api.saving} onClick={api.retry} type="button">Tentar novamente</button></div>}
          {api.saving && <p className="position-api-feedback" role="status">Salvando alterações...</p>}
          {actionError && <p className="position-api-feedback" role="alert">{actionError}</p>}
          <DataTable ariaLabel="Gestores" columns={columns} emptyMessage={api.loading ? 'Carregando gestores...' : api.error ? 'Lista de gestores indisponível.' : 'Nenhum gestor encontrado para esses filtros.'} getRowClassName={(manager) => manager.id === savedManagerId ? 'astro-data-table-row--saved' : undefined} getRowKey={(manager) => manager.id} rows={visibleManagers} />
          <p className="position-api-feedback" role="status">{feedback}</p>
        </section>

        {openManager && createPortal(
          <OptionsPopup
            ariaLabel={`Opções para ${openManager.name}`}
            closing={actions.closing}
            id={`manager-actions-${openManager.id}`}
            items={[
              { id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => actions.close() },
              { id: 'view', label: 'Ver mais informações', separatorAfter: true, onSelect: () => actions.close(() => { api.retryDetails(); setDialog({ kind: 'view', manager: openManager }) }) },
              { id: 'edit', label: 'Editar', separatorAfter: true, onSelect: () => actions.close(() => setDialog({ kind: 'edit-password', manager: openManager })) },
              { id: 'toggle-status', label: openManager.status === 'DESATIVADO' ? 'Ativar' : 'Desativar', tone: openManager.status === 'DESATIVADO' ? 'default' : 'danger', onSelect: () => actions.close(() => {
                if (openManager.status !== 'DESATIVADO') setDialog({ kind: 'deactivate', manager: openManager })
                else void toggleStatus(openManager).then((error) => { if (error) setActionError(error) })
              }) },
            ]}
            onClose={() => actions.close()}
            panelRef={actions.panelRef}
            style={actions.style}
          />,
          document.body,
        )}

      </main>

      {inviteOpen && <InviteManagerDialog candidates={api.candidates.data} loading={api.candidates.loading || api.loading}
        error={api.candidates.error || api.error} saving={api.saving} onClose={closeInvite} onRetry={() => { api.retryCandidates(); if (api.error) api.retry() }} onInvite={inviteManager} />}

      {dialog?.kind === 'edit-password' && (
        <PasswordConfirmationModal
          key={dialog.manager.id}
          className="textPasswotdAccount1ModalWeb"
          onCancel={() => {
            setDialog(null)
            actions.triggerRef.current?.focus()
          }}
          onContinue={() => { api.retryDetails(); api.retryOptions(); setDialog({ kind: 'edit', manager: dialog.manager }) }}
        />
      )}
      {dialog && (dialog.kind === 'view' || dialog.kind === 'edit' || dialog.kind === 'confirm-edit') && (
        <ManagerDetailsModal
          dimmed={details.dimmed}
          key={dialog.manager.id}
          manager={api.details.data}
          options={api.options.data}
          loading={api.details.loading || (dialog.kind !== 'view' && api.options.loading)}
          error={api.details.error || (dialog.kind !== 'view' ? api.options.error : '')}
          saving={api.saving}
          onRetry={() => { api.retryDetails(); if (dialog.kind !== 'view') api.retryOptions() }}
          mode={dialog.kind === 'view' ? 'view' : 'edit'}
          onClose={closeDetails}
          onSubmit={(values) => {
            const error = checkDuplicateEmail(values, dialog.manager.id)
            if (error) return error
            setDetails((current) => ({ ...current, dimmed: true }))
            setDialog({ kind: 'confirm-edit', manager: dialog.manager, values })
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
            setDialog({ kind: 'edit', manager: dialog.manager })
          }}
          onCancelRequest={() => setDetails((current) => ({ ...current, dimmed: false }))}
          onConfirm={async () => {
            const error = await saveManager(dialog.manager.id, dialog.values)
            if (!error) setDetails((current) => ({ ...current, closing: true }))
            return error
          }}
          onConfirmed={() => {
            setDialog(null)
            setDetails({ dimmed: false, closing: false })
            requestAnimationFrame(() => actions.triggerRef.current?.focus())
          }}
          title="Deseja salvar as alterações deste gestor?"
        />
      )}
      {dialog?.kind === 'deactivate' && (
        <ConfirmationModal
          backdrop="dimmed"
          className="position-deactivation-modal"
          confirmLabel="Desativar"
          description="A desativação afeta toda a conta deste gestor."
          icon={<span aria-hidden="true" className="position-deactivation-icon"><img alt="" src={iconAsset('warning.svg')} /></span>}
          onCancel={() => {
            setDialog(null)
            actions.triggerRef.current?.focus()
          }}
          onConfirm={() => toggleStatus(dialog.manager)}
          onConfirmed={() => {
            setDialog(null)
            requestAnimationFrame(() => actions.triggerRef.current?.focus())
          }}
          title="Tem certeza de que deseja desativar este gestor?"
          tone="danger"
        />
      )}
    </div>
  )
}

export default MainManagerScreenPage
