import { useEffect, useRef, useState } from 'react'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, DataTable, InviteManagerDialog, ManagerIdentity, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/dataTable'
import { mockEventCollaborators } from '../../data/eventCreation'
import { managerUnits, mockManagers } from '../../data/managers'
import type { Manager, ManagerInviteValues } from '../../types'

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

function normalizeKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR')
}

function MainManagerScreenPage() {
  const inviteOriginRef = useRef<HTMLButtonElement | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const [managers, setManagers] = useState<Manager[]>(mockManagers)
  const [filters, setFilters] = useState({ search: '', unit: '', status: '' })
  const [inviteOpen, setInviteOpen] = useState(false)
  const [savedManagerId, setSavedManagerId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
  }, [])

  // Quem já é gestor (mesmo nome ou e-mail) não aparece de novo na lista de convite.
  const managerKeys = new Set(managers.flatMap((manager) => [manager.name, manager.email].map(normalizeKey)))
  const inviteCandidates = mockEventCollaborators.filter((collaborator) => !managerKeys.has(normalizeKey(collaborator.name)) && !managerKeys.has(normalizeKey(collaborator.email)))

  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleManagers = managers.filter((manager) => `${manager.name} ${manager.email}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    && (!filters.unit || manager.unit.split(', ').includes(filters.unit))
    && (!filters.status || (filters.status === 'active') === manager.active))

  function inviteManager(values: ManagerInviteValues): string | null {
    const collaborator = inviteCandidates.find((candidate) => candidate.id === values.collaboratorId)
    if (!collaborator) return 'Esse colaborador já é gestor ou não foi encontrado.'

    const newManagerId = crypto.randomUUID()
    setManagers((current) => [...current, { id: newManagerId, name: collaborator.name, email: collaborator.email, unit: collaborator.unit, active: values.status === 'active' }])
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
    setSavedManagerId(newManagerId)
    setFeedback(`Convite enviado para ${collaborator.email}.`)
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null
      setSavedManagerId(null)
    }, 900)
    return null
  }

  function closeInvite() {
    setInviteOpen(false)
    inviteOriginRef.current?.focus()
  }

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

        <AstroChat />
      </main>

      {inviteOpen && <InviteManagerDialog candidates={inviteCandidates} onClose={closeInvite} onInvite={inviteManager} />}
    </div>
  )
}

export default MainManagerScreenPage
