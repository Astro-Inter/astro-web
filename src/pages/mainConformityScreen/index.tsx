import { useActionFeedback } from '../../hooks/useActionFeedback'
import { SHOWCASE_NAMES } from '../../gtm/showcases'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, ConfirmationModal, ConformityFilterModal, ConformityFormModal, DataTable, ImportConformityModal, OptionsPopup, ToolbarSearch, TruncatedText } from '../../components'
import CollaboratorIdentity from '../../components/collaboratorIdentity'
import type { DataTableColumn } from '../../components/dataTable'
import { useActionsMenu } from '../../hooks'
import { useConformities } from '../../hooks/useConformities'
import type { ConformityDetails as Conformity, ConformityFilters, ConformityFormValues, ConformityType } from '../../types/conformity'
import { conformityStatusLabels, emptyConformityFilters, formatConformityDate, matchesConformityFilters } from '../../utils/conformity'
import { iconAsset } from '../../utils/iconAsset'

const statusClassNames = {
  valid: ' position-status--active',
  expired: ' position-status--expired',
  'no-expiry': ' position-status--no-expiry',
}
const closedAddFlow = { importOpen: false, manualOpen: false, importClosing: false }

type ConformityDialogState =
  | { kind: 'edit' | 'remove'; conformity: Conformity }
  | { kind: 'confirm-edit'; conformity: Conformity; values: ConformityFormValues }

function MainConformityScreenPage() {
  const addOriginRef = useRef<HTMLButtonElement | null>(null)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const focusAfterRemoveRef = useRef<string | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const [type, setType] = useState<ConformityType>('COLABORADOR')
  const isUnit = type === 'UNIDADE'
  const subjectLabel = isUnit ? 'Unidade' : 'Colaborador'
  const [filters, setFilters] = useState<ConformityFilters & { search: string }>({ ...emptyConformityFilters, search: '' })
  const [addFlow, setAddFlow] = useState(closedAddFlow)
  const [filterOpen, setFilterOpen] = useState(false)
  const [dialog, setDialog] = useState<ConformityDialogState | null>(null)
  const detailId = dialog && (dialog.kind === 'edit' || dialog.kind === 'confirm-edit') ? dialog.conformity.id : undefined
  const api = useConformities(detailId, addFlow.manualOpen || Boolean(detailId), addFlow.manualOpen, type)
  const { conformities } = api
  const nrOptions = api.options.data.nrs.map(row => `NR ${row.code}`)
  const filterNrOptions = [...new Set([...nrOptions, ...conformities.map(row => row.nr)])].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)))
  const editingConformity = api.details.data ?? (detailId ? dialog?.conformity : undefined)
  const editNrOptions = editingConformity ? [...new Set([...nrOptions, editingConformity.nr])] : nrOptions
  const [editForm, setEditForm] = useState({ dimmed: false, closing: false })
  const actions = useActionsMenu()
  const [savedConformityId, setSavedConformityId] = useState<string | null>(null)
  const setFeedback = useActionFeedback()

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
  }, [])

  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleConformities = conformities.filter((conformity) => conformity.employeeName.toLocaleLowerCase('pt-BR').includes(normalizedSearch) && matchesConformityFilters(conformity, filters))
  const activeFilterCount = [filters.nr, filters.origin, filters.from || filters.to].filter(Boolean).length
  const openConformity = visibleConformities.find((conformity) => conformity.id === actions.openId)

  function showSavedConformity(conformityId: string | null, message: string) {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
    setSavedConformityId(conformityId)
    setFeedback(message)
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null
      setSavedConformityId(null)
    }, 900)
  }

  async function addConformity(values: ConformityFormValues): Promise<string | null> {
    const duplicateError = checkDuplicate(values)
    if (duplicateError) return duplicateError

    const result = await api.save(values)
    if (result.error !== null) return result.error
    showSavedConformity(result.data.id, `Conformidade da ${result.data.nr} adicionada para ${result.data.employeeName}.`)
    setAddFlow((current) => ({ ...current, importClosing: true }))
    return null
  }

  function checkDuplicate(values: ConformityFormValues, conformityId?: string): string | null {
    return conformities.some((conformity) => conformity.id !== conformityId && conformity.employeeId === values.employeeId && conformity.nr === values.nr)
      ? `Já existe conformidade nessa NR para ${isUnit ? 'essa unidade' : 'esse colaborador'}.`
      : null
  }

  async function saveConformity(conformity: Conformity, values: ConformityFormValues): Promise<string | null> {
    const duplicateError = checkDuplicate(values, conformity.id)
    if (duplicateError) return duplicateError

    const result = await api.save(values, conformity.id)
    if (result.error !== null) return result.error
    showSavedConformity(conformity.id, `Conformidade de ${conformity.employeeName} atualizada.`)
    return null
  }

  async function removeConformity(conformity: Conformity): Promise<string | null> {
    const result = await api.changeApplicability(conformity.id, false)
    if (result.error !== null) return result.error
    const index = visibleConformities.findIndex((item) => item.id === conformity.id)
    const neighbor = visibleConformities[index + 1] ?? visibleConformities[index - 1]
    focusAfterRemoveRef.current = neighbor?.id ?? null
    showSavedConformity(null, `Conformidade da ${conformity.nr} de ${conformity.employeeName} marcada como não aplicável.`)
    return null
  }

  function closeDialog() {
    setDialog(null)
    setEditForm({ dimmed: false, closing: false })
    requestAnimationFrame(() => {
      const neighbor = document.querySelector<HTMLButtonElement>(`[data-conformity-id="${focusAfterRemoveRef.current}"]`)
      const target = actions.triggerRef.current?.isConnected ? actions.triggerRef.current : neighbor ?? filterTriggerRef.current
      focusAfterRemoveRef.current = null
      target?.focus()
    })
  }

  function closeAddFlow() {
    setAddFlow(closedAddFlow)
    requestAnimationFrame(() => addOriginRef.current?.focus())
  }

  const columns: DataTableColumn<Conformity>[] = [
    { id: 'employee', label: subjectLabel, width: '23%', rowHeader: true, render: (conformity) => isUnit ? <TruncatedText>{conformity.employeeName}</TruncatedText> : <CollaboratorIdentity name={conformity.employeeName} photoUrl={conformity.profilePhotoUrl} initials={conformity.avatarInitials} /> },
    { id: 'nr', label: 'NR', width: '11%', render: (conformity) => <TruncatedText>{conformity.nr}</TruncatedText> },
    { id: 'expiresAt', label: 'Data de validade', width: '20.5%', render: (conformity) => <TruncatedText>{formatConformityDate(conformity.expiresAt)}</TruncatedText> },
    { id: 'origin', label: 'Origem', width: '13%', render: (conformity) => <TruncatedText>{conformity.origin}</TruncatedText> },
    {
      id: 'status', label: 'Status', width: '19%',
      render: (conformity) => {
        const status = conformity.status
        return <span className={`position-status${statusClassNames[status]}`}><TruncatedText truncate={false}>{conformityStatusLabels[status]}</TruncatedText></span>
      },
    },
    {
      id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
      render: (conformity) => (
        <div className="position-actions">
          <button data-track-item={BUTTONS.comuns.acoes}
            aria-controls={actions.openId === conformity.id ? `conformity-actions-${conformity.id}` : undefined}
            aria-expanded={actions.openId === conformity.id}
            aria-haspopup="menu"
            aria-label={`Ações para ${conformity.employeeName} na ${conformity.nr}`}
            className="position-actions-trigger"
            data-conformity-id={conformity.id}
            onClick={(event) => actions.toggle(conformity.id, event.currentTarget)}
            type="button"
          >
            <AstroIcon name="dots" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="main-position-screen main-manager-screen main-conformity-screen">
      <AppSidebar />

      <main data-track-page={true} className="position-main" id="conteudo-principal">
        <section aria-labelledby="conformities-title" className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="conformities-title">Conformidades</h1>
            <p>Acompanhe a situação de conformidade {isUnit ? 'das unidades' : 'dos colaboradores'} em relação às NRs. Cada linha representa {isUnit ? 'uma unidade' : 'um colaborador'} e uma NR.</p>
          </header>

          <div aria-label="Tipo de conformidade" className="conformity-tabs" role="tablist">
            {(['COLABORADOR', 'UNIDADE'] as const).map((value, index) => <button key={value} id={`conformity-tab-${value}`} role="tab" aria-selected={type === value} aria-controls="conformity-panel" tabIndex={type === value ? 0 : -1} type="button"
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const next = event.key === 'Home' ? 'COLABORADOR' : event.key === 'End' ? 'UNIDADE' : index === 0 ? 'UNIDADE' : 'COLABORADOR'
                setType(next); setFilters({ ...emptyConformityFilters, search: '' }); actions.close(undefined, false)
                document.getElementById(`conformity-tab-${next}`)?.focus()
              }}
              onClick={() => { setType(value); setFilters({ ...emptyConformityFilters, search: '' }); actions.close(undefined, false) }}>{value === 'UNIDADE' ? 'Unidades' : 'Colaboradores'}</button>)}
          </div>
          <div id="conformity-panel" role="tabpanel" aria-labelledby={`conformity-tab-${type}`}>
          <div aria-label="Ações e filtros das conformidades" className="position-toolbar" role="group">
            <CompactPurpleButton data-track-action={BUTTONS.comuns.adicionar} aria-haspopup="dialog" onClick={(event) => { addOriginRef.current = event.currentTarget; setAddFlow({ ...closedAddFlow, importOpen: !isUnit, manualOpen: isUnit }) }} type="button">
              <AstroIcon name="plus" />
              Adicionar conformidade
            </CompactPurpleButton>

            <ToolbarSearch
              label={isUnit ? 'Buscar unidades' : 'Buscar colaboradores'}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              onClear={() => setFilters((current) => ({ ...current, search: '' }))}
              placeholder={isUnit ? 'Buscar unidades...' : 'Buscar colaboradores...'}
              value={filters.search}
            />

            <div className="position-toolbar-selects">
              <button data-track-action={BUTTONS.comuns.filtro} aria-haspopup="dialog" aria-label={activeFilterCount ? `Filtros, ${activeFilterCount} ${activeFilterCount === 1 ? 'ativo' : 'ativos'}` : 'Filtros'} className="conformity-filter-button" onClick={() => setFilterOpen(true)} ref={filterTriggerRef} type="button">
                {activeFilterCount ? `Filtros (${activeFilterCount})` : 'Filtros'}
                <AstroIcon name="chevron-down" />
              </button>
            </div>
          </div>

          {api.error ? <div className="position-dialog-form-error" role="alert"><p>{api.error}</p><button className="astro-modal-cancel" onClick={api.retry} type="button">Tentar novamente</button></div> : <DataTable trackingName={SHOWCASE_NAMES.lista_conformidades} ariaLabel="Conformidades" columns={columns} emptyMessage="Nenhuma conformidade encontrada para esses filtros." getRowClassName={(conformity) => conformity.id === savedConformityId ? 'astro-data-table-row--saved' : undefined} getRowKey={(conformity) => conformity.id} rows={visibleConformities} loading={api.loading} />}
          </div>
        </section>
        {openConformity && createPortal(
          <OptionsPopup trackingName={DIALOG_NAMES.acoes_conformidade}
            ariaLabel={`Opções para ${openConformity.employeeName} na ${openConformity.nr}`}
            closing={actions.closing}
            id={`conformity-actions-${openConformity.id}`}
            items={[
              { trackingAction: BUTTONS.comuns.cancelar, id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => actions.close() },
              { trackingAction: BUTTONS.comuns.editar, id: 'edit', label: 'Editar', separatorAfter: true, onSelect: () => actions.close(() => setDialog({ kind: 'edit', conformity: openConformity })) },
              { trackingAction: BUTTONS.comuns.tornar_nao_aplicavel, id: 'remove', label: 'Tornar não aplicável', tone: 'danger', onSelect: () => actions.close(() => setDialog({ kind: 'remove', conformity: openConformity })) },
            ]}
            onClose={() => actions.close()}
            panelRef={actions.panelRef}
            style={actions.style}
          />,
          document.body,
        )}
        <AstroChat />
      </main>

      {addFlow.importOpen && (
        <ImportConformityModal
          dimmed={addFlow.manualOpen}
          onClose={closeAddFlow}
          onImport={api.importFile}
          onManualAdd={() => setAddFlow((current) => ({ ...current, manualOpen: true }))}
          open={!addFlow.importClosing}
        />
      )}
      {addFlow.manualOpen && (
        <ConformityFormModal
          subjectLabel={subjectLabel}
          employees={isUnit ? api.options.data.units : api.options.data.employees}
          loading={api.options.loading}
          loadError={api.options.error}
          onRetry={api.retryOptions}
          nrs={nrOptions}
          onClose={() => isUnit ? closeAddFlow() : setAddFlow((current) => ({ ...current, manualOpen: false }))}
          onSubmit={addConformity}
        />
      )}
      {filterOpen && (
        <ConformityFilterModal
          type={type}
          filters={filters}
          nrs={filterNrOptions}
          onApply={(nextFilters) => setFilters((current) => ({ ...current, ...nextFilters }))}
          onClose={() => {
            setFilterOpen(false)
            filterTriggerRef.current?.focus()
          }}
        />
      )}
      {dialog && (dialog.kind === 'edit' || dialog.kind === 'confirm-edit') && editingConformity && (
        <ConformityFormModal
          dimmed={editForm.dimmed}
          employee={{ name: editingConformity.employeeName, email: editingConformity.employeeEmail }}
          showAvatar={!isUnit}
          subjectLabel={subjectLabel}
          employees={[]}
          initialValues={{ employeeId: editingConformity.employeeId, nr: editingConformity.nr, expiresAt: editingConformity.expiresAt ?? '' }}
          key={`${dialog.conformity.id}/${api.details.loading}`}
          loading={api.details.loading || api.options.loading}
          loadError={api.details.error || api.options.error}
          onRetry={() => { if (api.details.error) api.retryDetails(); if (api.options.error) api.retryOptions() }}
          nrs={editNrOptions}
          onClose={() => {
            if (dialog.kind !== 'confirm-edit') closeDialog()
          }}
          onSubmit={(values) => {
            const error = checkDuplicate(values, dialog.conformity.id)
            if (error) return error
            setEditForm((current) => ({ ...current, dimmed: true }))
            setDialog({ kind: 'confirm-edit', conformity: editingConformity, values })
            return null
          }}
          open={!editForm.closing}
        />
      )}
      {dialog?.kind === 'confirm-edit' && (
        <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_alteracoes_conformidade}
          confirmCloseDelay={60}
          confirmLabel="Salvar"
          onCancel={() => {
            setEditForm((current) => ({ ...current, dimmed: false }))
            setDialog({ kind: 'edit', conformity: dialog.conformity })
          }}
          onCancelRequest={() => setEditForm((current) => ({ ...current, dimmed: false }))}
          onConfirm={async () => {
            const error = await saveConformity(dialog.conformity, dialog.values)
            if (!error) setEditForm((current) => ({ ...current, closing: true }))
            return error
          }}
          onConfirmed={closeDialog}
          title={`Deseja salvar as alterações da conformidade ${isUnit ? 'desta unidade' : 'deste colaborador'}?`}
        />
      )}
      {dialog?.kind === 'remove' && (
        <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_conformidade_nao_aplicavel}
          backdrop="dimmed"
          className="position-deactivation-modal"
          confirmLabel="Tornar não aplicável"
          icon={<span aria-hidden="true" className="position-deactivation-icon"><img alt="" src={iconAsset('warning.svg')} /></span>}
          onCancel={closeDialog}
          onConfirm={() => removeConformity(dialog.conformity)}
          progressLabel="Atualizando aplicabilidade..."
          onConfirmed={closeDialog}
          title="Tem certeza de que deseja tornar esta conformidade não aplicável?"
          tone="danger"
        />
      )}
    </div>
  )
}

export default MainConformityScreenPage
