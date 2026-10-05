import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, ConfirmationModal, DataTable, InviteManagerDialog, ManagerDetailsModal, ManagerIdentity, OptionsPopup, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/dataTable'
import PasswordConfirmationModal from '../../components/passwordConfirmationModal'
import { mockEventCollaborators } from '../../data/eventCreation'
import { managerUnits, mockManagers } from '../../data/managers'
import { useActionsMenu } from '../../hooks'
import type { Manager, ManagerDetailsValues, ManagerInviteValues } from '../../types'
import { iconAsset } from '../../utils/iconAsset'

const unitFilterOptions = [
  { value: '', label: 'Unidade', triggerLabel: 'Unidade', tone: 'muted' as const },
  ...managerUnits.map((unit) => ({ value: unit, label: unit })),
]
const statusFilterOptions = [
  { value: '', label: 'Status', triggerLabel: 'Status', tone: 'muted' as const },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

type ManagerDialogState =
  | { kind: 'view' | 'edit' | 'edit-password'; manager: Manager }
  | { kind: 'confirm-edit'; manager: Manager; values: ManagerDetailsValues }
  | { kind: 'deactivate'; manager: Manager }

function normalizeKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR')
}

function MainManagerScreenPage() {
  const inviteOriginRef = useRef<HTMLButtonElement | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const [managers, setManagers] = useState<Manager[]>(mockManagers)
  const [filters, setFilters] = useState({ search: '', unit: '', status: '' })
  const [inviteOpen, setInviteOpen] = useState(false)
  const [dialog, setDialog] = useState<ManagerDialogState | null>(null)
  const [details, setDetails] = useState({ dimmed: false, closing: false })
  const [savedManagerId, setSavedManagerId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const actions = useActionsMenu()

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
  }, [])

  const managerKeys = new Set(managers.flatMap((manager) => [manager.name, manager.email].map(normalizeKey)))
  const inviteCandidates = mockEventCollaborators.filter((collaborator) => !managerKeys.has(normalizeKey(collaborator.name)) && !managerKeys.has(normalizeKey(collaborator.email)))

  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleManagers = managers.filter((manager) => `${manager.name} ${manager.email}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    && (!filters.unit || manager.unit.split(', ').includes(filters.unit))
    && (!filters.status || (filters.status === 'active') === manager.active))
  const openManager = visibleManagers.find((manager) => manager.id === actions.openId)
  const positionNames = [...new Set([...managers, ...mockEventCollaborators].map((person) => person.position))]

  function showSavedManager(managerId: string, message: string) {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
    setSavedManagerId(managerId)
    setFeedback(message)
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null
      setSavedManagerId(null)
    }, 900)
  }

  function inviteManager(values: ManagerInviteValues): string | null {
    const collaborator = inviteCandidates.find((candidate) => candidate.id === values.collaboratorId)
    if (!collaborator) return 'Esse colaborador já é gestor ou não foi encontrado.'

    const newManagerId = crypto.randomUUID()
    setManagers((current) => [...current, {
      id: newManagerId,
      name: collaborator.name,
      email: collaborator.email,
      unit: collaborator.unit,
      active: values.status === 'active',
      cpf: '',
      position: collaborator.position,
      modality: collaborator.modality,
    }])
    showSavedManager(newManagerId, `Convite enviado para ${collaborator.email}.`)
    return null
  }

  function closeInvite() {
    setInviteOpen(false)
    inviteOriginRef.current?.focus()
  }

  function checkDuplicateEmail(values: ManagerDetailsValues, managerId: string): string | null {
    const email = normalizeKey(values.email)
    return managers.some((manager) => manager.id !== managerId && normalizeKey(manager.email) === email)
      ? 'Já existe um gestor com esse e-mail.'
      : null
  }

  function saveManager(managerId: string, values: ManagerDetailsValues): string | null {
    const duplicateError = checkDuplicateEmail(values, managerId)
    if (duplicateError) return duplicateError

    setManagers((current) => current.map((manager) => manager.id === managerId ? { ...manager, ...values } : manager))
    showSavedManager(managerId, `Gestor ${values.name} atualizado.`)
    return null
  }

  function toggleStatus(manager: Manager) {
    setManagers((current) => current.map((item) => item.id === manager.id ? { ...item, active: !item.active } : item))
    showSavedManager(manager.id, `Gestor ${manager.name} ${manager.active ? 'inativado' : 'ativado'}.`)
  }

  function closeDetails() {
    if (dialog?.kind === 'confirm-edit') return
    setDialog(null)
    setDetails({ dimmed: false, closing: false })
    actions.triggerRef.current?.focus()
  }

  const columns: DataTableColumn<Manager>[] = [
    { id: 'name', label: 'Gestor', width: '23%', rowHeader: true, render: (manager) => <ManagerIdentity name={manager.name} /> },
    { id: 'email', label: 'E-mail', width: '29%', render: (manager) => <TruncatedText>{manager.email}</TruncatedText> },
    { id: 'unit', label: 'Unidades', width: '18%', render: (manager) => <TruncatedText>{manager.unit}</TruncatedText> },
    {
      id: 'status', label: 'Status', width: '16.5%',
      render: (manager) => <span className={`position-status${manager.active ? ' position-status--active' : ''}${manager.id === savedManagerId ? ' position-status--saved' : ''}`}><TruncatedText truncate={false}>{manager.active ? 'Ativo' : 'Inativo'}</TruncatedText></span>,
    },
    {
      id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
      render: (manager) => (
        <div className="position-actions">
          <button
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
            <CompactPurpleButton onClick={(event) => { inviteOriginRef.current = event.currentTarget; setInviteOpen(true) }} type="button">
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

          <DataTable ariaLabel="Gestores" columns={columns} emptyMessage="Nenhum gestor encontrado para esses filtros." getRowClassName={(manager) => manager.id === savedManagerId ? 'astro-data-table-row--saved' : undefined} getRowKey={(manager) => manager.id} rows={visibleManagers} />
          <p className="sr-only" role="status">{feedback}</p>
        </section>

        {openManager && createPortal(
          <OptionsPopup
            ariaLabel={`Opções para ${openManager.name}`}
            closing={actions.closing}
            id={`manager-actions-${openManager.id}`}
            items={[
              { id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => actions.close() },
              { id: 'view', label: 'Ver mais informações', separatorAfter: true, onSelect: () => actions.close(() => setDialog({ kind: 'view', manager: openManager })) },
              { id: 'edit', label: 'Editar', separatorAfter: true, onSelect: () => actions.close(() => setDialog({ kind: 'edit-password', manager: openManager })) },
              { id: 'toggle-status', label: openManager.active ? 'Inativar' : 'Ativar', tone: openManager.active ? 'danger' : 'default', onSelect: () => actions.close(() => {
                if (openManager.active) setDialog({ kind: 'deactivate', manager: openManager })
                else toggleStatus(openManager)
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

      {inviteOpen && <InviteManagerDialog candidates={inviteCandidates} onClose={closeInvite} onInvite={inviteManager} />}

      {dialog?.kind === 'edit-password' && (
        <PasswordConfirmationModal
          className="textPasswotdAccount1ModalWeb"
          onCancel={() => {
            setDialog(null)
            actions.triggerRef.current?.focus()
          }}
          onContinue={() => setDialog({ kind: 'edit', manager: dialog.manager })}
        />
      )}
      {dialog && (dialog.kind === 'view' || dialog.kind === 'edit' || dialog.kind === 'confirm-edit') && (
        <ManagerDetailsModal
          dimmed={details.dimmed}
          key={dialog.manager.id}
          manager={dialog.manager}
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
          positions={positionNames}
          units={managerUnits}
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
          onConfirm={() => {
            const error = saveManager(dialog.manager.id, dialog.values)
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
          confirmLabel="Inativar"
          icon={<span aria-hidden="true" className="position-deactivation-icon"><img alt="" src={iconAsset('warning.svg')} /></span>}
          onCancel={() => {
            setDialog(null)
            actions.triggerRef.current?.focus()
          }}
          onConfirm={() => { toggleStatus(dialog.manager); return null }}
          onConfirmed={() => {
            setDialog(null)
            requestAnimationFrame(() => actions.triggerRef.current?.focus())
          }}
          title="Tem certeza de que deseja inativar este gestor?"
          tone="danger"
        />
      )}
    </div>
  )
}

export default MainManagerScreenPage
