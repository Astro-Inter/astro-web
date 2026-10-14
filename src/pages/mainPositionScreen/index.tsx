import { SHOWCASE_NAMES } from '../../gtm/showcases'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { iconAsset } from '../../utils/iconAsset'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { AppSidebar, AstroIcon, CompactPurpleButton, ConfirmationModal, DataTable, EditRegulatoryStandardsDialog, RegulatoryStandardsDialog, OptionsPopup, PositionDialog, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import { usePositions } from '../../hooks/usePositions'
import WorkspaceTableSkeleton from '../../components/workspaceTableSkeleton'
import type { DataTableColumn } from '../../components/dataTable'
import type { Position, PositionFormValues } from '../../types'

const statusFilterOptions = [
  { value: '', label: 'Status', triggerLabel: 'Status', tone: 'muted' as const },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

type PositionDialogState =
  | { kind: 'form'; position: Position | null }
  | { kind: 'confirmation'; position: Position; values: PositionFormValues }

function MainPositionScreenPage() {
  const dialogOriginRef = useRef<HTMLButtonElement | null>(null)
  const actionsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const actionsPanelRef = useRef<HTMLDivElement | null>(null)
  const queuedActionsRef = useRef<(() => void) | null>(null)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [dialog, setDialog] = useState<PositionDialogState | null>(null)
  const [nrsPosition, setNrsPosition] = useState<Position | null>(null)
  const [nrsEditing, setNrsEditing] = useState(false)
  const [nrsViewDimmed, setNrsViewDimmed] = useState(false)
  const [nrsEditDimmed, setNrsEditDimmed] = useState(false)
  const [nrsEditClosing, setNrsEditClosing] = useState(false)
  const [pendingNrsIds, setPendingNrsIds] = useState<string[] | null>(null)
  const [savedNrIds, setSavedNrIds] = useState<string[]>([])
  const [pendingDeactivation, setPendingDeactivation] = useState<Position | null>(null)
  const api = usePositions(nrsPosition?.id)
  const { positions } = api
  const nrOptionRows = api.nrs.options.map((row) => ({ id: String(row.nr), code: `NR ${row.nr}`, description: row.descricao }))
  const enabledNrIds = api.nrs.options.filter((row) => row.ativo).map((row) => String(row.nr))
  const [editorDimmed, setEditorDimmed] = useState(false)
  const [editorClosing, setEditorClosing] = useState(false)
  const [savedPositionId, setSavedPositionId] = useState<string | null>(null)
  const saveAnimationTimerRef = useRef<number | null>(null)
  const nrsAnimationTimerRef = useRef<number | null>(null)
  const changedNrsRef = useRef<string[]>([])
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const [actionsMenuPosition, setActionsMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [feedback, setFeedback] = useState('')
  const [actionError, setActionError] = useState('')
  const { closing: actionsClosing, requestClose: requestActionsClose } = useAnimatedClose()

  useEffect(() => () => {
    if (saveAnimationTimerRef.current !== null) window.clearTimeout(saveAnimationTimerRef.current)
    if (nrsAnimationTimerRef.current !== null) window.clearTimeout(nrsAnimationTimerRef.current)
  }, [])

  function showSavedPosition(positionId: string, message: string) {
    if (saveAnimationTimerRef.current !== null) window.clearTimeout(saveAnimationTimerRef.current)
    setSavedPositionId(positionId)
    setFeedback(message)
    saveAnimationTimerRef.current = window.setTimeout(() => {
      saveAnimationTimerRef.current = null
      setSavedPositionId(null)
    }, 900)
  }

  const closeActions = useCallback((onFinished?: () => void, restoreFocus = true) => {
    requestActionsClose(() => {
      setOpenActionsId(null)
      const queuedAction = queuedActionsRef.current
      if (restoreFocus && !queuedAction) actionsTriggerRef.current?.focus()
      const nextAction = queuedAction ?? onFinished
      queuedActionsRef.current = null
      nextAction?.()
    })
  }, [requestActionsClose])

  useEffect(() => {
    if (!openActionsId) return

    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest('.position-actions-trigger')) return
      if (!actionsPanelRef.current?.contains(event.target as Node) && !actionsTriggerRef.current?.contains(event.target as Node)) {
        closeActions(undefined, false)
      }
    }

    window.addEventListener('pointerdown', closeOutside)
    window.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('resize', closeOnScroll)
    function closeOnScroll() { closeActions() }
    return () => {
      window.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('resize', closeOnScroll)
    }
  }, [closeActions, openActionsId])

  useLayoutEffect(() => {
    if (!openActionsId || !actionsTriggerRef.current || !actionsPanelRef.current) return

    const trigger = actionsTriggerRef.current.getBoundingClientRect()
    const panel = actionsPanelRef.current.getBoundingClientRect()
    const margin = 8
    const below = trigger.bottom + margin
    const top = below + panel.height <= window.innerHeight - margin ? below : trigger.top - panel.height - margin

    setActionsMenuPosition({
      top: Math.max(margin, Math.min(top, window.innerHeight - panel.height - margin)),
      left: Math.max(margin, Math.min(trigger.right - panel.width, window.innerWidth - panel.width - margin)),
    })
  }, [openActionsId])

  const visiblePositions = positions.filter((position) => {
    const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
    return position.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
      && (!filters.status || (filters.status === 'active') === position.active)
  })
  const openPosition = visiblePositions.find((position) => position.id === openActionsId)

  function closePositionForm() {
    if (dialog?.kind === 'confirmation') return
    setDialog(null)
    setEditorDimmed(false)
    setEditorClosing(false)
    dialogOriginRef.current?.focus()
  }

  function checkDuplicatePosition(values: PositionFormValues, editingId?: string): string | null {
    const name = values.name.trim().toLocaleLowerCase('pt-BR')
    return positions.some((position) => position.id !== editingId && position.name.toLocaleLowerCase('pt-BR') === name)
      ? 'Já existe um cargo com esse nome.'
      : null
  }

  async function savePosition(values: PositionFormValues, editingId?: string): Promise<string | null> {
    const duplicateError = checkDuplicatePosition(values, editingId)
    if (duplicateError) return duplicateError
    const error = await api.save(values, editingId)
    if (!error) {
      if (editingId) showSavedPosition(editingId, `Cargo ${values.name} atualizado.`)
      else setFeedback(`Cargo ${values.name} adicionado.`)
    }
    return error
  }

  async function toggleStatus(position: Position): Promise<string | null> {
    setActionError('')
    const error = await api.toggle(position.id)
    if (!error) showSavedPosition(position.id, `Cargo ${position.name} ${position.active ? 'inativado' : 'ativado'}.`)
    return error
  }

  const columns: DataTableColumn<Position>[] = [
    {
      id: 'name', label: 'Cargo', width: '28%', rowHeader: true,
      render: (position) => <TruncatedText>{position.name}</TruncatedText>,
    },
    {
      id: 'collaborators', label: 'Quantidade de colaboradores', width: '42%',
      render: (position) => <TruncatedText>{`${position.collaboratorCount.toLocaleString('pt-BR')} colaboradores`}</TruncatedText>,
    },
    {
      id: 'status', label: 'Status', width: '16.5%',
      render: (position) => <span className={`position-status${position.active ? ' position-status--active' : ''}${position.id === savedPositionId ? ' position-status--saved' : ''}`}><TruncatedText truncate={false}>{position.active ? 'Ativo' : 'Inativo'}</TruncatedText></span>,
    },
    {
      id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
      render: (position) => (
        <div
          className="position-actions"
          data-position-actions
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              closeActions()
              event.currentTarget.querySelector('button')?.focus()
            }
          }}
        >
          <button data-track-item={BUTTONS.comuns.acoes}
            disabled={api.saving || api.loading}
            aria-controls={openActionsId === position.id ? `position-actions-${position.id}` : undefined}
            aria-expanded={openActionsId === position.id}
            aria-haspopup="menu"
            aria-label={`Ações para ${position.name}`}
            className="position-actions-trigger"
            onClick={(event) => {
              if (openActionsId) {
                if (openActionsId === position.id) {
                  closeActions()
                } else {
                  const nextTrigger = event.currentTarget
                  const openNext = () => {
                    actionsTriggerRef.current = nextTrigger
                    setActionsMenuPosition(null)
                    setOpenActionsId(position.id)
                  }
                  if (actionsClosing) queuedActionsRef.current = openNext
                  else closeActions(openNext, false)
                }
                return
              }
              actionsTriggerRef.current = event.currentTarget
              setActionsMenuPosition(null)
              setOpenActionsId(position.id)
            }}
            type="button"
          >
            <AstroIcon name="dots" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="main-position-screen" data-table-loading={api.loading}>
      <AppSidebar />

      <main data-track-page={true} className="position-main" id="conteudo-principal">
        <section aria-labelledby="positions-title" aria-busy={api.loading} className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="positions-title">Cargos</h1>
            <p>Organize, cadastre seus cargos e acompanhe as responsabilidades de cada função.</p>
          </header>

          <div aria-label="Ações e filtros dos cargos" className="position-toolbar" role="group">
            <CompactPurpleButton data-track-action={BUTTONS.comuns.adicionar} disabled={api.loading || api.saving || Boolean(api.error)} onClick={(event) => { dialogOriginRef.current = event.currentTarget; setDialog({ kind: 'form', position: null }) }} type="button">
              <AstroIcon name="plus" />
              Adicionar cargo
            </CompactPurpleButton>

            <ToolbarSearch
              label="Buscar cargos"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              onClear={() => setFilters((current) => ({ ...current, search: '' }))}
              placeholder="Buscar cargos..."
              value={filters.search}
            />

            <div className="position-toolbar-selects">
              <ToolbarSelect trackingAction={BUTTONS.comuns.status} label="Filtrar por status" onValueChange={(status) => setFilters((current) => ({ ...current, status }))} options={statusFilterOptions} value={filters.status} />
            </div>
          </div>

          {api.error && <div className="position-api-feedback"><p role="alert">{api.error}</p><button data-track-action={BUTTONS.comuns.tentar_novamente} onClick={api.retry} type="button">Tentar novamente</button></div>}
          {actionError && <p className="position-api-feedback" role="alert">{actionError}</p>}
          {api.saving && <p className="position-api-feedback" role="status">Salvando alterações...</p>}
          <DataTable trackingName={SHOWCASE_NAMES.lista_cargos} ariaLabel="Cargos" columns={columns} loadingContent={api.loading ? <WorkspaceTableSkeleton /> : undefined} emptyMessage={api.error ? 'Lista de cargos indisponível.' : 'Nenhum cargo encontrado para esses filtros.'} getRowClassName={(position) => position.id === savedPositionId ? 'astro-data-table-row--saved' : undefined} getRowKey={(position) => position.id} rows={visiblePositions} />
          <p className="position-api-feedback" role="status">{feedback}</p>
        </section>

        {openPosition && createPortal(
          <OptionsPopup trackingName={DIALOG_NAMES.acoes_cargo}
            ariaLabel={`Opções para ${openPosition.name}`}
            closing={actionsClosing}
            id={`position-actions-${openPosition.id}`}
            items={[
              { trackingAction: BUTTONS.comuns.cancelar, id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => closeActions() },
              { trackingAction: BUTTONS.comuns.editar, id: 'edit', label: 'Editar', separatorAfter: true, onSelect: () => closeActions(() => {
                dialogOriginRef.current = actionsTriggerRef.current
                setDialog({ kind: 'form', position: openPosition })
              }) },
              { trackingAction: BUTTONS.comuns.gerenciar_nrs, id: 'manage-nrs', label: 'Gerenciar NRs', separatorAfter: true, onSelect: () => closeActions(() => {
                setNrsEditing(false)
                setNrsViewDimmed(false)
                api.retryNrs()
                setNrsPosition(openPosition)
              }) },
              { trackingAction: openPosition.active  ? BUTTONS.comuns.inativar : BUTTONS.comuns.ativar, id: 'toggle-status', label: openPosition.active ? 'Inativar' : 'Ativar', tone: openPosition.active ? 'danger' : 'default', onSelect: () => closeActions(() => {
                if (openPosition.active) setPendingDeactivation(openPosition)
                else void toggleStatus(openPosition).then((error) => { if (error) setActionError(error) })
              }) },
            ]}
            onClose={() => closeActions()}
            panelRef={actionsPanelRef}
            style={{ top: actionsMenuPosition?.top ?? 0, left: actionsMenuPosition?.left ?? 0, visibility: actionsMenuPosition ? 'visible' : 'hidden' }}
          />,
          document.body,
        )}

        {nrsPosition && (
          <RegulatoryStandardsDialog
            dimmed={nrsViewDimmed}
            savedRowIds={savedNrIds}
            rows={api.nrs.rows}
            loading={api.nrs.loading}
            error={api.nrs.error}
            onRetry={api.retryNrs}
            onClose={() => {
              setNrsPosition(null)
              requestAnimationFrame(() => actionsTriggerRef.current?.focus())
            }}
            onEdit={() => {
              setNrsViewDimmed(true)
              setNrsEditing(true)
            }}
            positionName={nrsPosition.name}
          />
        )}
        {nrsPosition && nrsEditing && !api.nrs.loading && !api.nrs.error && (
          <EditRegulatoryStandardsDialog
            enabledIds={enabledNrIds}
            rows={nrOptionRows}
            dimmed={nrsEditDimmed}
            onCancel={() => {
              if (pendingNrsIds !== null) return
              setNrsEditing(false)
            }}
            onDismissRequest={() => {
              if (pendingNrsIds === null) setNrsViewDimmed(false)
            }}
            onRequestConfirmation={(enabledIds) => {
              setPendingNrsIds(enabledIds)
              setNrsEditDimmed(true)
            }}
            open={!nrsEditClosing}
            positionName={nrsPosition.name}
          />
        )}
      </main>

      {dialog && (
        <PositionDialog
          dimmed={editorDimmed}
          onClose={closePositionForm}
          onRequestConfirmation={(values, editingId) => {
            const error = checkDuplicatePosition(values, editingId)
            if (error) return error
            if (!dialog.position) return 'Cargo não encontrado.'
            setEditorDimmed(true)
            setDialog({ kind: 'confirmation', position: dialog.position, values })
            return null
          }}
          onSave={savePosition}
          open={!editorClosing}
          position={dialog.position}
        />
      )}
      {dialog?.kind === 'confirmation' && (
        <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_alteracoes_cargo}
          confirmCloseDelay={60}
          confirmLabel="Salvar"
          onCancel={() => {
            setEditorDimmed(false)
            setDialog({ kind: 'form', position: dialog.position })
          }}
          onCancelRequest={() => setEditorDimmed(false)}
          onConfirm={async () => {
            const error = await savePosition(dialog.values, dialog.position.id)
            if (!error) setEditorClosing(true)
            return error
          }}
          onConfirmed={() => {
            setDialog(null)
            setEditorDimmed(false)
            setEditorClosing(false)
            requestAnimationFrame(() => dialogOriginRef.current?.focus())
          }}
          title="Deseja salvar as alterações deste cargo?"
        />
      )}
      {nrsPosition && pendingNrsIds !== null && (
        <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_alteracoes_nrs_cargo}
          confirmCloseDelay={60}
          confirmLabel="Salvar"
          onCancel={() => {
            setPendingNrsIds(null)
            setNrsEditDimmed(false)
          }}
          onCancelRequest={() => setNrsEditDimmed(false)}
          onConfirm={async () => {
            const previousSet = new Set(enabledNrIds)
            const nextSet = new Set(pendingNrsIds)
            const changedIds = nrOptionRows.filter((row) => previousSet.has(row.id) !== nextSet.has(row.id)).map((row) => row.id)
            const error = await api.saveNrs(nrsPosition.id, pendingNrsIds)
            if (error) return error
            changedNrsRef.current = changedIds
            setFeedback(`NRs de ${nrsPosition.name} atualizadas.`)
            setNrsEditClosing(true)
            return null
          }}
          onConfirmed={() => {
            setPendingNrsIds(null)
            setNrsEditing(false)
            setNrsEditClosing(false)
            setNrsEditDimmed(false)
            setNrsViewDimmed(false)
            setSavedNrIds(changedNrsRef.current)
            if (nrsAnimationTimerRef.current !== null) window.clearTimeout(nrsAnimationTimerRef.current)
            nrsAnimationTimerRef.current = window.setTimeout(() => setSavedNrIds([]), 900)
          }}
          title="Deseja salvar as alterações das NRs deste cargo?"
        />
      )}
      {pendingDeactivation && (
        <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_inativacao_cargo}
          backdrop="dimmed"
          className="position-deactivation-modal"
          confirmLabel="Inativar"
          icon={<span aria-hidden="true" className="position-deactivation-icon"><img alt="" src={iconAsset('warning.svg')} /></span>}
          onCancel={() => setPendingDeactivation(null)}
          onConfirm={() => toggleStatus(pendingDeactivation)}
          onConfirmed={() => {
            setPendingDeactivation(null)
            requestAnimationFrame(() => actionsTriggerRef.current?.focus())
          }}
          title="Tem certeza de que deseja inativar este cargo?"
          tone="danger"
        />
      )}
    </div>
  )
}

export default MainPositionScreenPage
