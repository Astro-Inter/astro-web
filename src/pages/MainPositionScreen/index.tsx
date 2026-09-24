import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, DataTable, PositionDialog, ToolbarSearch, ToolbarSelect, TruncatedText } from '../../components'
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
  { value: '', label: 'Status' },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

function MainPositionScreenPage() {
  const dialogOriginRef = useRef<HTMLButtonElement | null>(null)
  const actionsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const actionsPanelRef = useRef<HTMLDivElement | null>(null)
  const [positions, setPositions] = useState<Position[]>(initialPositions)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [dialog, setDialog] = useState<{ open: boolean; position: Position | null }>({ open: false, position: null })
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const [actionsMenuPosition, setActionsMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!openActionsId) return

    function closeOutside(event: PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest('[data-position-actions]')) {
        setOpenActionsId(null)
      }
    }

    window.addEventListener('pointerdown', closeOutside)
    window.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('resize', closeOnScroll)
    function closeOnScroll() { setOpenActionsId(null) }
    return () => {
      window.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('resize', closeOnScroll)
    }
  }, [openActionsId])

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

  function savePosition(values: PositionFormValues, editingId?: string): string | null {
    const name = values.name.trim()
    const duplicate = positions.some((position) => position.id !== editingId && position.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))
    if (duplicate) return 'Já existe um cargo com esse nome.'

    if (editingId) {
      setPositions((current) => current.map((position) => position.id === editingId
        ? { ...position, name, collaboratorCount: Number(values.collaboratorCount), unit: values.unit, active: values.active }
        : position))
      setFeedback(`Cargo ${name} atualizado.`)
    } else {
      setPositions((current) => [...current, {
        id: crypto.randomUUID(),
        name,
        collaboratorCount: Number(values.collaboratorCount),
        unit: values.unit,
        active: values.active,
      }])
      setFeedback(`Cargo ${name} adicionado.`)
    }

    return null
  }

  function toggleStatus(position: Position) {
    setPositions((current) => current.map((item) => item.id === position.id ? { ...item, active: !item.active } : item))
    setOpenActionsId(null)
    setFeedback(`Cargo ${position.name} ${position.active ? 'desativado' : 'ativado'}.`)
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
      render: (position) => <span className={`position-status${position.active ? ' position-status--active' : ''}`}>{position.active ? 'Ativo' : 'Inativo'}</span>,
    },
    {
      id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
      render: (position) => (
        <div
          className="position-actions"
          data-position-actions
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpenActionsId(null)
              event.currentTarget.querySelector('button')?.focus()
            }
          }}
        >
          <button
            aria-controls={openActionsId === position.id ? `position-actions-${position.id}` : undefined}
            aria-expanded={openActionsId === position.id}
            aria-label={`Ações para ${position.name}`}
            className="position-actions-trigger"
            onClick={(event) => {
              actionsTriggerRef.current = event.currentTarget
              setActionsMenuPosition(null)
              setOpenActionsId((current) => current === position.id ? null : position.id)
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
            <CompactPurpleButton onClick={(event) => { dialogOriginRef.current = event.currentTarget; setDialog({ open: true, position: null }) }} type="button">
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
              <ToolbarSelect label="Filtrar por status" onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} options={statusFilterOptions} value={filters.status} />
            </div>
          </div>

          <DataTable ariaLabel="Cargos" columns={columns} emptyMessage="Nenhum cargo encontrado para esses filtros." getRowKey={(position) => position.id} rows={visiblePositions} />
          <p className="sr-only" role="status">{feedback}</p>
        </section>

        {openPosition && createPortal(
          <div
            className="position-actions-panel astro-scale-90"
            data-position-actions
            id={`position-actions-${openPosition.id}`}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setOpenActionsId(null)
                actionsTriggerRef.current?.focus()
              }
            }}
            ref={actionsPanelRef}
            style={{ top: actionsMenuPosition?.top ?? 0, left: actionsMenuPosition?.left ?? 0, visibility: actionsMenuPosition ? 'visible' : 'hidden' }}
          >
            <button onClick={() => {
              dialogOriginRef.current = actionsTriggerRef.current
              setDialog({ open: true, position: openPosition })
              setOpenActionsId(null)
            }} type="button">Editar cargo</button>
            <button onClick={() => {
              toggleStatus(openPosition)
              actionsTriggerRef.current?.focus()
            }} type="button">{openPosition.active ? 'Desativar' : 'Ativar'} cargo</button>
          </div>,
          document.body,
        )}

        <AstroChat />
      </main>

      {dialog.open && (
        <PositionDialog
          onClose={() => { setDialog({ open: false, position: null }); dialogOriginRef.current?.focus() }}
          onSave={savePosition}
          position={dialog.position}
          units={units}
        />
      )}
    </div>
  )
}

export default MainPositionScreenPage
