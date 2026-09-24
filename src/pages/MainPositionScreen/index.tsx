import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, ConfirmationModal, DataTable, OptionsPopup, PositionDialog, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/DataTable'
import type { Position, PositionFormValues } from '../../types'

const initialPositions: Position[] = [
  { id: 'gerente', name: 'Gerente', collaboratorCount: 530, unit: 'Sede 1', active: true },
  { id: 'diretor', name: 'Diretor', collaboratorCount: 20, unit: 'Sede 1', active: true },
  { id: 'engenheiro-de-sistemas', name: 'Engenheiro de Sistemas e Coordenador de Tecnologia e Conformidade Regional', collaboratorCount: 40, unit: 'Sede 2', active: true },
  { id: 'programador', name: 'Programador', collaboratorCount: 80, unit: 'Sede 2', active: false },
  { id: 'assistente-analitico', name: 'Assistente analítico', collaboratorCount: 254, unit: 'Sede 1', active: false },
  { id: 'analista-de-dados', name: 'Analista de Dados', collaboratorCount: 35, unit: 'Sede 1', active: true },
  { id: 'designer-ux', name: 'Designer UX', collaboratorCount: 18, unit: 'Sede 2', active: true },
  { id: 'coordenador', name: 'Coordenador', collaboratorCount: 27, unit: 'Sede 1', active: true },
  { id: 'engenheiro-de-software', name: 'Engenheiro de Software', collaboratorCount: 42, unit: 'Sede 2', active: true },
  { id: 'tecnico-de-suporte', name: 'Técnico de Suporte', collaboratorCount: 62, unit: 'Sede 1', active: false },
  { id: 'analista-financeiro', name: 'Analista Financeiro', collaboratorCount: 21, unit: 'Sede 1', active: true },
  { id: 'consultor-comercial', name: 'Consultor Comercial', collaboratorCount: 48, unit: 'Sede 2', active: true },
  { id: 'supervisor-de-vendas', name: 'Supervisor de Vendas', collaboratorCount: 16, unit: 'Sede 2', active: false },
  { id: 'assistente-de-rh', name: 'Assistente de RH', collaboratorCount: 31, unit: 'Sede 1', active: true },
  { id: 'desenvolvedor-web', name: 'Desenvolvedor Web', collaboratorCount: 24, unit: 'Sede 2', active: true },
]

const units = ['Sede 1', 'Sede 2']
const statusFilterOptions = [
  { value: '', label: 'Todos', triggerLabel: 'Status', tone: 'muted' as const },
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
  const [positions, setPositions] = useState<Position[]>(initialPositions)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [dialog, setDialog] = useState<PositionDialogState | null>(null)
  const [editorDimmed, setEditorDimmed] = useState(false)
  const [editorClosing, setEditorClosing] = useState(false)
  const [savedPositionId, setSavedPositionId] = useState<string | null>(null)
  const saveAnimationTimerRef = useRef<number | null>(null)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const [actionsMenuPosition, setActionsMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [feedback, setFeedback] = useState('')
  const { closing: actionsClosing, requestClose: requestActionsClose } = useAnimatedClose(160)

  useEffect(() => () => {
    if (saveAnimationTimerRef.current !== null) window.clearTimeout(saveAnimationTimerRef.current)
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

  function savePosition(values: PositionFormValues, editingId?: string): string | null {
    const name = values.name.trim()
    const duplicateError = checkDuplicatePosition(values, editingId)
    if (duplicateError) return duplicateError

    if (editingId) {
      setPositions((current) => current.map((position) => position.id === editingId
        ? { ...position, name, collaboratorCount: Number(values.collaboratorCount), unit: values.unit, active: values.active }
        : position))
      showSavedPosition(editingId, `Cargo ${name} atualizado.`)
    } else {
      const newPositionId = crypto.randomUUID()
      setPositions((current) => [...current, {
        id: newPositionId,
        name,
        collaboratorCount: Number(values.collaboratorCount),
        unit: values.unit,
        active: values.active,
      }])
      showSavedPosition(newPositionId, `Cargo ${name} adicionado.`)
    }

    return null
  }

  function toggleStatus(position: Position) {
    setPositions((current) => current.map((item) => item.id === position.id ? { ...item, active: !item.active } : item))
    showSavedPosition(position.id, `Cargo ${position.name} ${position.active ? 'desativado' : 'ativado'}.`)
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
      render: (position) => <span className={`position-status${position.active ? ' position-status--active' : ''}${position.id === savedPositionId ? ' position-status--saved' : ''}`}>{position.active ? 'Ativo' : 'Inativo'}</span>,
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
          <button
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
            <span aria-hidden="true" className="position-actions-dots"><span /><span /><span /></span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="main-position-screen">
      <AppSidebar />

      <main className="position-main" id="conteudo-principal">
        <section aria-labelledby="positions-title" className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="positions-title">Cargos</h1>
            <p>Organize, cadastre seus cargos e acompanhe as responsabilidades de cada função.</p>
          </header>

          <div aria-label="Ações e filtros dos cargos" className="position-toolbar" role="group">
            <CompactPurpleButton onClick={(event) => { dialogOriginRef.current = event.currentTarget; setDialog({ kind: 'form', position: null }) }} type="button">
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
              <ToolbarSelect label="Filtrar por status" onValueChange={(status) => setFilters((current) => ({ ...current, status }))} options={statusFilterOptions} value={filters.status} />
            </div>
          </div>

          <DataTable ariaLabel="Cargos" columns={columns} emptyMessage="Nenhum cargo encontrado para esses filtros." getRowClassName={(position) => position.id === savedPositionId ? 'astro-data-table-row--saved' : undefined} getRowKey={(position) => position.id} rows={visiblePositions} />
          <p className="sr-only" role="status">{feedback}</p>
        </section>

        {openPosition && createPortal(
          <OptionsPopup
            ariaLabel={`Opções para ${openPosition.name}`}
            closing={actionsClosing}
            id={`position-actions-${openPosition.id}`}
            items={[
              { id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => closeActions() },
              { id: 'edit', label: 'Editar', separatorAfter: true, onSelect: () => closeActions(() => {
                dialogOriginRef.current = actionsTriggerRef.current
                setDialog({ kind: 'form', position: openPosition })
              }) },
              { id: 'manage-nrs', label: 'Gerenciar NRs', separatorAfter: true, onSelect: () => closeActions(() => {
                setFeedback(`Gerenciamento de NRs para ${openPosition.name} estará disponível em breve.`)
              }) },
              { id: 'toggle-status', label: openPosition.active ? 'Inativar' : 'Ativar', tone: openPosition.active ? 'danger' : 'default', onSelect: () => closeActions(() => toggleStatus(openPosition)) },
            ]}
            onClose={() => closeActions()}
            panelRef={actionsPanelRef}
            style={{ top: actionsMenuPosition?.top ?? 0, left: actionsMenuPosition?.left ?? 0, visibility: actionsMenuPosition ? 'visible' : 'hidden' }}
          />,
          document.body,
        )}

        <AstroChat />
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
          units={units}
        />
      )}
      {dialog?.kind === 'confirmation' && (
        <ConfirmationModal
          confirmCloseDelay={60}
          confirmLabel="Salvar"
          onCancel={() => {
            setEditorDimmed(false)
            setDialog({ kind: 'form', position: dialog.position })
          }}
          onCancelRequest={() => setEditorDimmed(false)}
          onConfirm={() => {
            const error = savePosition(dialog.values, dialog.position.id)
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
    </div>
  )
}

export default MainPositionScreenPage
