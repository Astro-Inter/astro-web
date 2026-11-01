import ActionLoading from '../../components/actionLoading'
import { useActionFeedback } from '../../hooks/useActionFeedback'
import { SHOWCASE_NAMES } from '../../gtm/showcases'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppSidebar, AstroIcon, ConfirmationModal, DataTable, EditRegulatoryStandardsDialog, OptionsPopup, RegulatoryStandardsDialog, ToolbarSearch, TruncatedText } from '../../components'
import ListFilterControl from '../../components/listFilterControl'
import { matchesCountRange } from '../../utils/listFilters'
import type { DataTableColumn } from '../../components/dataTable'
import { useUnits } from '../../hooks/useUnits'
import { useUnitNrRecommendations } from '../../hooks/useUnitNrRecommendations'
import { useActionsMenu } from '../../hooks'
import type { Unit } from '../../types'
import { iconAsset } from '../../utils/iconAsset'

const statusFilterOptions = [
  { value: '', label: 'Todos', triggerLabel: 'Status', tone: 'muted' as const },
  { value: 'active', label: 'Ativa' },
  { value: 'inactive', label: 'Inativa' },
]

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
  const [filters, setFilters] = useState({ search: '', status: '', minimum: '', maximum: '' })
  const [nrs, setNrs] = useState<UnitNrsState>(closedNrs)
  const api = useUnits(nrs.unit?.id)
  const recommendations = useUnitNrRecommendations(nrs.editing ? nrs.unit?.id : undefined)
  const { units } = api
  const nrOptionRows = api.nrs.options.map((row) => ({ id: String(row.nr), code: `NR ${row.nr}`, description: row.descricao }))
  const enabledNrIds = api.nrs.options.filter((row) => row.ativo).map((row) => String(row.nr))
  const [savedNrIds, setSavedNrIds] = useState<string[]>([])
  const [pendingDeactivation, setPendingDeactivation] = useState<Unit | null>(null)
  const [savedUnitId, setSavedUnitId] = useState<string | null>(null)
  const setFeedback = useActionFeedback()
  const actions = useActionsMenu()

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
    if (nrsTimerRef.current !== null) window.clearTimeout(nrsTimerRef.current)
  }, [])

  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleUnits = units.filter((unit) => unit.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    && (!filters.status || (filters.status === 'active') === unit.active)
    && matchesCountRange(unit.collaboratorCount, filters.minimum, filters.maximum))
  const openUnit = visibleUnits.find((unit) => unit.id === actions.openId)

  async function toggleStatus(unit: Unit): Promise<string | null> {
    const error = await api.toggle(unit.id)
    if (error) return error
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
    setSavedUnitId(unit.id)
    setFeedback(`Unidade ${unit.name} ${unit.active ? 'inativada' : 'ativada'}.`)
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null
      setSavedUnitId(null)
    }, 900)
    return null
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
          <button data-track-item={BUTTONS.comuns.acoes}
            disabled={api.saving || api.loading}
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
    <div className="main-position-screen main-manager-screen main-unit-screen" data-table-loading={api.loading}>
      <AppSidebar />

      <main data-track-page={true} className="position-main" id="conteudo-principal">
        <section aria-labelledby="units-title" aria-busy={api.loading} className="position-content astro-scale-90">
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
              <ListFilterControl label="Filtrar unidades" fields={[
                { id: 'status', label: 'Status', options: statusFilterOptions },
                { id: 'minimum', label: 'Quantidade mínima de colaboradores', kind: 'number' },
                { id: 'maximum', label: 'Quantidade máxima de colaboradores', kind: 'number', minimumField: 'minimum' },
              ]} values={{ status: filters.status, minimum: filters.minimum, maximum: filters.maximum }} onApply={values => setFilters(current => ({ ...current, status: values.status, minimum: values.minimum, maximum: values.maximum }))} />
            </div>
          </div>

          {api.error && <div className="position-api-feedback"><p role="alert">{api.error}</p><button data-track-action={BUTTONS.comuns.tentar_novamente} onClick={api.retry} type="button">Tentar novamente</button></div>}
          <ActionLoading active={api.saving} />
          <DataTable trackingName={SHOWCASE_NAMES.lista_unidades} ariaLabel="Unidades" columns={columns} loading={api.loading} emptyMessage={api.error ? 'Lista de unidades indisponível.' : 'Nenhuma unidade encontrada para esses filtros.'} getRowClassName={(unit) => unit.id === savedUnitId ? 'astro-data-table-row--saved' : undefined} getRowKey={(unit) => unit.id} rows={visibleUnits} />
        </section>

        {openUnit && createPortal(
          <OptionsPopup trackingName={DIALOG_NAMES.acoes_unidade}
            ariaLabel={`Opções para ${openUnit.name}`}
            closing={actions.closing}
            id={`unit-actions-${openUnit.id}`}
            items={[
              { trackingAction: BUTTONS.comuns.cancelar, id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => actions.close() },
              { trackingAction: BUTTONS.comuns.gerenciar_nrs, id: 'manage-nrs', label: 'Gerenciar NRs', separatorAfter: true, onSelect: () => actions.close(() => { api.retryNrs(); setSavedNrIds([]); setNrs({ ...closedNrs, unit: openUnit }) }) },
              { trackingAction: openUnit.active  ? BUTTONS.comuns.inativar : BUTTONS.comuns.ativar, id: 'toggle-status', label: openUnit.active ? 'Inativar' : 'Ativar', tone: openUnit.active ? 'danger' : 'default', onSelect: () => actions.close(() => {
                if (openUnit.active) setPendingDeactivation(openUnit)
                else void toggleStatus(openUnit).then((error) => { if (error) setFeedback(error, 'error') })
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
            rows={api.nrs.rows}
            loading={api.nrs.loading}
            error={api.nrs.error}
            onRetry={api.retryNrs}
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
        {nrs.unit && nrs.editing && !api.nrs.loading && !api.nrs.error && (
          <EditRegulatoryStandardsDialog
            key={nrs.unit.id}
            recommendationSubject="esta unidade"
            recommendedIds={recommendations.rows.map(row => String(row.numero))}
            recommendationDescriptions={Object.fromEntries(recommendations.rows.map(row => [String(row.numero), row.justificativa]))}
            recommendationsLoading={recommendations.loading}
            recommendationsError={recommendations.error}
            onRetryRecommendations={recommendations.retry}
            dimmed={nrs.editDimmed}
            enabledIds={enabledNrIds}
            rows={nrOptionRows}
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
          />
        )}
      </main>

      {nrs.unit && nrs.pendingIds !== null && (
        <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_alteracoes_nrs_unidade}
          confirmCloseDelay={60}
          confirmLabel="Salvar"
          onCancel={() => setNrs((current) => ({ ...current, pendingIds: null, editDimmed: false }))}
          onCancelRequest={() => setNrs((current) => ({ ...current, editDimmed: false }))}
          onConfirm={async () => {
            const unit = nrs.unit
            const pendingIds = nrs.pendingIds
            if (!unit || !pendingIds) return 'Unidade não encontrada.'
            const previousSet = new Set(enabledNrIds)
            const nextSet = new Set(pendingIds)
            const changedIds = nrOptionRows.filter((row) => previousSet.has(row.id) !== nextSet.has(row.id)).map((row) => row.id)
            const error = await api.saveNrs(unit.id, pendingIds)
            if (error) return error
            changedNrsRef.current = changedIds
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
        <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_inativacao_unidade}
          backdrop="dimmed"
          className="position-deactivation-modal"
          confirmLabel="Inativar"
          icon={<span aria-hidden="true" className="position-deactivation-icon"><img alt="" src={iconAsset('warning.svg')} /></span>}
          onCancel={() => {
            setPendingDeactivation(null)
            actions.triggerRef.current?.focus()
          }}
          onConfirm={() => toggleStatus(pendingDeactivation)}
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
