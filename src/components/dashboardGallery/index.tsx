import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import DashboardCard, { type DashboardGalleryItem } from '../dashboardCard'
import DashboardGallerySkeleton from '../dashboardGallerySkeleton'
import { useExitPresence } from '../../hooks/useExitPresence'
import AstroIcon from '../astroIcon'
import OptionsPopup from '../optionsPopup'
import PurpleButton from '../purpleButton'
import ToolbarSearch from '../toolbarSearch'

interface DashboardGalleryProps {
  items: readonly DashboardGalleryItem[]
  loading: boolean
  busy: boolean
  onOpen: (item: DashboardGalleryItem, edit: boolean, trigger: HTMLButtonElement) => void
  onCreate: (trigger: HTMLButtonElement) => void
  onDelete: (item: DashboardGalleryItem, trigger: HTMLButtonElement) => void
  onCustomize: (item: DashboardGalleryItem, trigger: HTMLButtonElement) => void
}

export default function DashboardGallery({ items, loading, busy, onOpen, onCreate, onDelete, onCustomize }: DashboardGalleryProps) {
  const presence = useExitPresence(true, loading)
  const resultsId = useId()
  const [search, setSearch] = useState('')
  const [requestedPage, setPage] = useState(1)
  const [menu, setMenu] = useState<DashboardGalleryItem | null>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const panel = useRef<HTMLDivElement | null>(null)
  const { closing, requestClose } = useAnimatedClose()
  const matching = items.filter(item => item.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
  const pageCount = Math.max(1, Math.ceil(matching.length / 4))
  const page = Math.min(requestedPage, pageCount)
  const close = useCallback((after?: () => void, restoreFocus = true) => {
    requestClose(() => { setMenu(null); setPosition(null); if (restoreFocus) trigger.current?.focus({ preventScroll: true }); after?.() })
  }, [requestClose])
  useLayoutEffect(() => {
    if (!menu || !trigger.current || !panel.current) return
    const a = trigger.current.getBoundingClientRect(), b = panel.current.getBoundingClientRect(), gap = 8
    const top = a.bottom + gap + b.height <= window.innerHeight - gap ? a.bottom + gap : a.top - b.height - gap
    setPosition({ top: Math.max(gap, top), left: Math.max(gap, Math.min(a.right - b.width, window.innerWidth - b.width - gap)) })
  }, [menu])
  useEffect(() => {
    if (!menu) return
    function outside(event: PointerEvent) {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close()
    }
    function moved(event: Event) {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return
      close()
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('scroll', moved, true)
    window.addEventListener('resize', moved)
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('scroll', moved, true); window.removeEventListener('resize', moved) }
  }, [menu, close])
  return <section className="dashboard-gallery" aria-label="Visões de dashboards" aria-busy={presence.present}>
    <div className="position-toolbar dashboard-gallery-toolbar">
      <PurpleButton type="button" disabled={busy || loading} onClick={event => onCreate(event.currentTarget)}><AstroIcon name="plus" />Nova visão</PurpleButton>
      <ToolbarSearch label="Buscar dashboards" placeholder="Buscar dashboards..." value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} onClear={() => { setSearch(''); setPage(1) }} />
      <span className="dashboard-gallery-page" aria-live="polite">{presence.present ? <span aria-hidden="true" className={`api-skeleton dashboard-gallery-page-skeleton${presence.exiting ? ' analytics-skeleton--exit' : ''}`} /> : <>Página {page} de {pageCount} · {matching.length} {matching.length === 1 ? 'visão' : 'visões'}</>}</span>
    </div>
    <div className="dashboard-gallery-stage" role="group" aria-label="Paginação dos dashboards">
      <button className="dashboard-gallery-page-arrow dashboard-gallery-page-arrow--previous" type="button" aria-label="Página anterior" aria-controls={resultsId} disabled={loading || page <= 1} onClick={() => setPage(page - 1)}><AstroIcon name="chevron-left" /></button>
      <div id={resultsId} className="dashboard-gallery-results">
    {presence.present ? <div className={`analytics-skeleton${presence.exiting ? ' analytics-skeleton--exit' : ''}`}><DashboardGallerySkeleton /></div> : <>
      <div className="forms-grid dashboard-gallery-grid" key={`${search}/${page}`}>
        {matching.slice((page - 1) * 4, page * 4).map(item => <DashboardCard key={item.id} item={item} menuOpen={menu?.id === item.id} onOpen={event => onOpen(item, false, event.currentTarget)} onOpenMenu={event => {
          const button = event.currentTarget
          const open = () => { trigger.current = button; setPosition(null); setMenu(item) }
          if (menu?.id === item.id) close()
          else if (menu) close(open, false)
          else open()
        }} />)}
      </div>
      {matching.length === 0 && <p className="forms-empty" role="status">Nenhum dashboard encontrado.</p>}
    </>}
      </div>
      <button className="dashboard-gallery-page-arrow dashboard-gallery-page-arrow--next" type="button" aria-label="Próxima página" aria-controls={resultsId} disabled={loading || page >= pageCount} onClick={() => setPage(page + 1)}><AstroIcon name="chevron-right" /></button>
    </div>
    {menu && createPortal(<OptionsPopup id="dashboard-card-options" ariaLabel={`Opções para ${menu.name}`} closing={closing} panelRef={panel} onClose={() => close()} style={{ top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? 'visible' : 'hidden' }} items={[
      { id: 'cancel', label: 'Cancelar', tone: 'muted', separatorAfter: true, onSelect: () => close() },
      { id: 'edit', label: 'Editar', separatorAfter: true, onSelect: () => close(() => onOpen(menu, true, trigger.current!), false) },
      { id: 'appearance', label: 'Personalizar card', separatorAfter: !!menu.saved, onSelect: () => close(() => onCustomize(menu, trigger.current!), false) },
      ...(menu.saved ? [{ id: 'delete', label: 'Excluir', tone: 'danger' as const, onSelect: () => close(() => onDelete(menu, trigger.current!), false) }] : []),
    ]} />, document.body)}
  </section>
}
