import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppSidebar, AstroChat, AstroIcon, ConfirmationModal, DataTable, EditRegulatoryStandardsDialog, OptionsPopup, RegulatoryStandardsDialog, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/dataTable'
import { defaultNrsRows } from '../../data/regulatoryStandards'
import { mockUnits } from '../../data/units'
import { useActionsMenu } from '../../hooks'
import type { Unit } from '../../types'
import { iconAsset } from '../../utils/iconAsset'

const statusFilterOptions = [
  { value: '', label: 'Status', triggerLabel: 'Status', tone: 'muted' as const },
  { value: 'active', label: 'Ativa' },
  { value: 'inactive', label: 'Inativa' },
]
const defaultEnabledNrs = defaultNrsRows.filter((row) => row.id !== 'nr4').map((row) => row.id)

interface UnitNrsState {
  unit: Unit | null
  editing: boolean
  viewDimmed: boolean
  editDimmed: boolean
  editClosing: boolean
  pendingIds: string[] | null
}

const closedNrs: UnitNrsState = { unit: null, editing: false, viewDimmed: false, editDimmed: false, editClosing: false, pendingIds: null }

function MainUnitScreenPage() {
  const savedTimerRef = useRef<number | null>(null)
  const nrsTimerRef = useRef<number | null>(null)
  const changedNrsRef = useRef<string[]>([])
  const [units, setUnits] = useState<Unit[]>(mockUnits)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [nrs, setNrs] = useState<UnitNrsState>(closedNrs)
  const [enabledNrsByUnit, setEnabledNrsByUnit] = useState<Record<string, string[]>>({})
  const [savedNrIds, setSavedNrIds] = useState<string[]>([])
  const [pendingDeactivation, setPendingDeactivation] = useState<Unit | null>(null)
  const [savedUnitId, setSavedUnitId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const actions = useActionsMenu()

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
    if (nrsTimerRef.current !== null) window.clearTimeout(nrsTimerRef.current)
  }, [])

  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleUnits = units.filter((unit) => unit.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    && (!filters.status || (filters.status === 'active') === unit.active))
  const openUnit = visibleUnits.find((unit) => unit.id === actions.openId)

  function toggleStatus(unit: Unit) {
    setUnits((current) => current.map((item) => item.id === unit.id ? { ...item, active: !item.active } : item))
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
    setSavedUnitId(unit.id)
    setFeedback(`Unidade ${unit.name} ${unit.active ? 'inativada' : 'ativada'}.`)
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null
      setSavedUnitId(null)
    }, 900)
  }

  const columns: DataTableColumn<Unit>[] = [
    { id: 'name', label: 'Unidade', width: '28%', rowHeader: true, render: (unit) => <TruncatedText>{unit.name}</TruncatedText> },
    { id: 'collaborators', label: 'Quantidade de colaboradores', width: '42%', render: (unit) => <TruncatedText>{`${unit.collaboratorCount.toLocaleString('pt-BR')} colaboradores`}</TruncatedText> },
    {
      id: 'status', label: 'Status', width: '16.5%',
      render: (unit) => <span className={`position-status${unit.active ? ' position-status--active' : ''}${unit.id === savedUnitId ? ' position-status--saved' : ''}`}><TruncatedText truncate={false}>{unit.active ? 'Ativa' : 'Inativa'}</TruncatedText></span>,
    },
    {
      id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
      render: (unit) => (
        <div className="position-actions">
          <button
            aria-controls={actions.openId === unit.id ? `unit-actions-${unit.id}` : undefined}
            aria-expanded={actions.openId === unit.id}
            aria-haspopup="menu"
            aria-label={`Ações para ${unit.name}`}
            className="position-actions-trigger"
            onClick={(event) => actions.toggle(unit.id, event.currentTarget)}
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

          <DataTable ariaLabel="Unidades" columns={columns} emptyMessage="Nenhuma unidade encontrada para esses filtros." getRowClassName={(unit) => unit.id === savedUnitId ? 'astro-data-table-row--saved' : undefined} getRowKey={(unit) => unit.id} rows={visibleUnits} />
          <p className="sr-only" role="status">{feedback}</p>
        </section>

        {openUnit && createPortal(
          <OptionsPopup
            ariaLabel={`Opções para ${openUnit.name}`}
            closing={actions.closing}
            id={`unit-actions-${openUnit.id}`}
            items={[
              { id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => actions.close() },
              { id: 'manage-nrs', label: 'Gerenciar NRs', separatorAfter: true, onSelect: () => actions.close(() => setNrs({ ...closedNrs, unit: openUnit })) },
              { id: 'toggle-status', label: openUnit.active ? 'Inativar' : 'Ativar', tone: openUnit.active ? 'danger' : 'default', onSelect: () => actions.close(() => {
                if (openUnit.active) setPendingDeactivation(openUnit)
                else toggleStatus(openUnit)
              }) },
            ]}
            onClose={() => actions.close()}
            panelRef={actions.panelRef}
            style={actions.style}
          />,
          document.body,
        )}

        {nrs.unit && (
          <RegulatoryStandardsDialog
            dimmed={nrs.viewDimmed}
            onClose={() => {
              setNrs(closedNrs)
              requestAnimationFrame(() => actions.triggerRef.current?.focus())
            }}
            onEdit={() => setNrs((current) => ({ ...current, viewDimmed: true, editing: true }))}
            positionName={nrs.unit.name}
            savedRowIds={savedNrIds}
          />
        )}
        {nrs.unit && nrs.editing && (
          <EditRegulatoryStandardsDialog
            dimmed={nrs.editDimmed}
            enabledIds={enabledNrsByUnit[nrs.unit.id] ?? defaultEnabledNrs}
            onCancel={() => {
              if (nrs.pendingIds !== null) return
              setNrs((current) => ({ ...current, editing: false }))
            }}
            onDismissRequest={() => {
              if (nrs.pendingIds === null) setNrs((current) => ({ ...current, viewDimmed: false }))
            }}
            onRequestConfirmation={(enabledIds) => setNrs((current) => ({ ...current, pendingIds: enabledIds, editDimmed: true }))}
            open={!nrs.editClosing}
            positionName={nrs.unit.name}
            recommendationText="Recomendado para esta unidade."
            recommendedIds={['nr1', 'nr2', 'nr4', 'nr6']}
          />
        )}
        <AstroChat />
      </main>

      {nrs.unit && nrs.pendingIds !== null && (
        <ConfirmationModal
          confirmCloseDelay={60}
          confirmLabel="Salvar"
          onCancel={() => setNrs((current) => ({ ...current, pendingIds: null, editDimmed: false }))}
          onCancelRequest={() => setNrs((current) => ({ ...current, editDimmed: false }))}
          onConfirm={() => {
            const unit = nrs.unit
            const pendingIds = nrs.pendingIds
            if (!unit || !pendingIds) return 'Unidade não encontrada.'
            const previousSet = new Set(enabledNrsByUnit[unit.id] ?? defaultEnabledNrs)
            const nextSet = new Set(pendingIds)
            const changedIds = defaultNrsRows.filter((row) => previousSet.has(row.id) !== nextSet.has(row.id)).map((row) => row.id)
            setEnabledNrsByUnit((current) => ({ ...current, [unit.id]: pendingIds }))
            changedNrsRef.current = changedIds.length ? changedIds : defaultNrsRows.slice(0, 5).map((row) => row.id)
            setFeedback(`NRs de ${unit.name} atualizadas.`)
            setNrs((current) => ({ ...current, editClosing: true }))
            return null
          }}
          onConfirmed={() => {
            setNrs((current) => ({ ...current, pendingIds: null, editing: false, editClosing: false, editDimmed: false, viewDimmed: false }))
            setSavedNrIds(changedNrsRef.current)
            if (nrsTimerRef.current !== null) window.clearTimeout(nrsTimerRef.current)
            nrsTimerRef.current = window.setTimeout(() => setSavedNrIds([]), 900)
          }}
          title="Deseja salvar as alterações das NRs desta unidade?"
        />
      )}
      {pendingDeactivation && (
        <ConfirmationModal
          backdrop="dimmed"
          className="position-deactivation-modal"
          confirmLabel="Inativar"
          icon={<span aria-hidden="true" className="position-deactivation-icon"><img alt="" src={iconAsset('warning.svg')} /></span>}
          onCancel={() => {
            setPendingDeactivation(null)
            actions.triggerRef.current?.focus()
          }}
          onConfirm={() => { toggleStatus(pendingDeactivation); return null }}
          onConfirmed={() => {
            setPendingDeactivation(null)
            requestAnimationFrame(() => actions.triggerRef.current?.focus())
          }}
          title="Tem certeza de que deseja inativar esta unidade?"
          tone="danger"
        />
      )}
    </div>
  )
}

export default MainUnitScreenPage
