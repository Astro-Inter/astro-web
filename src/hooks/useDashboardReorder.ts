import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { AnalyticsWidget } from '../types/dashboard'

export function useDashboardReorder(widgets: AnalyticsWidget[], disabled: boolean, save: (widgets: AnalyticsWidget[]) => Promise<void>) {
  const gridRef = useRef<HTMLDivElement>(null)
  const cleanup = useRef<(() => void) | null>(null)
  const positions = useRef<Map<string, DOMRect> | null>(null)
  const pending = useRef(false)
  const mounted = useRef(true)
  const [order, setOrder] = useState<string[] | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const cards = () => Array.from(gridRef.current?.querySelectorAll<HTMLElement>('[data-widget-id]') ?? [])
  const capture = () => new Map(cards().map(card => [card.dataset.widgetId!, card.getBoundingClientRect()]))

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cleanup.current?.() } }, [])
  useEffect(() => { if (disabled) cleanup.current?.() }, [disabled])
  useLayoutEffect(() => {
    const previous = positions.current
    positions.current = null
    if (!previous || (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.astroReducedMotion === 'true')) return
    cards().forEach(card => {
      const old = previous.get(card.dataset.widgetId!)
      if (!old) return
      const next = card.getBoundingClientRect()
      const x = old.left - next.left, y = old.top - next.top
      if (Math.abs(x) + Math.abs(y) < 1) return
      card.getAnimations?.().forEach(animation => animation.cancel())
      card.animate?.([{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }], { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
    })
  }, [order, widgets])

  async function commit(ids: string[]) {
    if (pending.current) return
    const byId = new Map(widgets.map(widget => [widget.id, widget]))
    const next = ids.map(id => byId.get(id)!).filter(Boolean)
    if (next.length !== widgets.length || ids.every((id, index) => id === widgets[index].id)) { setOrder(null); return }
    pending.current = true
    setOrder(ids)
    try { await save(next); if (mounted.current) setAnnouncement('Ordem dos gráficos atualizada.') }
    catch { if (mounted.current) setAnnouncement('Não foi possível salvar a ordem dos gráficos.') }
    finally {
      pending.current = false
      if (mounted.current) { positions.current = capture(); setOrder(null) }
    }
  }

  function moveByKeyboard(id: string, direction: -1 | 1) {
    if (disabled || pending.current || cleanup.current) return
    const ids = widgets.map(widget => widget.id), from = ids.indexOf(id), to = from + direction
    if (from < 0 || to < 0 || to >= ids.length) return
    ids.splice(from, 1); ids.splice(to, 0, id)
    positions.current = capture()
    void commit(ids)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    const grid = gridRef.current
    if (event.button !== 0 || disabled || pending.current || cleanup.current || !grid) return
    event.preventDefault()
    const handle = event.currentTarget, pointerId = event.pointerId
    handle.focus({ preventScroll: true })
    const origin = { x: event.clientX, y: event.clientY }
    const original = widgets.map(widget => widget.id)
    cards().forEach(card => card.getAnimations?.().forEach(animation => animation.cancel()))
    const slots = cards().map(card => ({ id: card.dataset.widgetId!, rect: card.getBoundingClientRect() }))
    const scrollStart = window.scrollY
    let current = original, started = false, valid = false, ghost: HTMLElement | null = null, badge: HTMLElement | null = null
    let point = origin, frame: number | null = null
    const bounds = handle.closest<HTMLElement>('[data-widget-id]')!.getBoundingClientRect()
    function update() {
      if (!started) return
      const shift = window.scrollY - scrollStart
      const area = grid!.getBoundingClientRect()
      valid = point.x >= area.left - 8 && point.x <= area.right + 8 && point.y >= Math.max(0, area.top - 24) && point.y <= Math.min(window.innerHeight, area.bottom + 24)
      if (ghost) ghost.style.transform = `translate3d(${point.x - origin.x}px, ${point.y - origin.y}px, 0) scale(1.005)`
      if (valid) {
        let closest = 0, distance = Infinity
        slots.forEach((slot, index) => {
          const dx = Math.max(slot.rect.left - point.x, 0, point.x - slot.rect.right)
          const dy = Math.max(slot.rect.top - shift - point.y, 0, point.y - (slot.rect.bottom - shift))
          const score = dx * dx + dy * dy
          if (score < distance) { distance = score; closest = index }
        })
        const next = original.filter(item => item !== id)
        next.splice(closest, 0, id)
        if (next.some((item, index) => item !== current[index])) { positions.current = capture(); current = next; setOrder(next) }
      }
      if (badge) {
        badge.textContent = `Posição ${current.indexOf(id) + 1} de ${current.length}`
        badge.style.transform = `translate(${Math.max(12, Math.min(point.x + 16, window.innerWidth - badge.offsetWidth - 12))}px, ${Math.max(12, Math.min(point.y + 16, window.innerHeight - badge.offsetHeight - 12))}px)`
      }
    }
    function tick() {
      frame = null
      if (!started) return
      const area = grid!.getBoundingClientRect()
      if (point.x >= area.left && point.x <= area.right) {
        const delta = point.y < 76 ? -6 : point.y > window.innerHeight - 76 ? 6 : 0
        if (delta) window.scrollBy({ top: delta, behavior: 'instant' })
        update()
        if (delta) frame = window.requestAnimationFrame(tick)
      }
    }
    function move(native: PointerEvent) {
      if (native.pointerId !== pointerId) return
      native.preventDefault()
      point = { x: native.clientX, y: native.clientY }
      if (!started) {
        if (Math.hypot(point.x - origin.x, point.y - origin.y) < 6) return
        started = true; handle.blur(); setDragging(id)
        document.documentElement.classList.add('create-forms-drag-active')
        ghost = handle.closest<HTMLElement>('[data-widget-id]')!.cloneNode(true) as HTMLElement
        ghost.removeAttribute('id'); ghost.removeAttribute('data-widget-id')
        ghost.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'))
        ghost.setAttribute('aria-hidden', 'true'); ghost.setAttribute('inert', '')
        const scale = grid!.closest('.astro-scale-90') ? 'astro-scale-90' : 'astro-scale-100'
        ghost.classList.add(scale)
        Object.assign(ghost.style, { position: 'fixed', zIndex: '10000', left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px`, margin: '0', opacity: '.68', pointerEvents: 'none' })
        document.body.append(ghost)
        badge = document.createElement('div'); badge.className = 'create-forms-drag-position-badge'; badge.setAttribute('aria-hidden', 'true'); document.body.append(badge)
      }
      update()
      if (frame === null) frame = window.requestAnimationFrame(tick)
    }
    function finish(confirm = false) {
      const next = current
      positions.current = capture()
      cleanup.current?.()
      if (confirm && started && valid) void commit(next)
      else setOrder(null)
    }
    function up(native: PointerEvent) { if (native.pointerId === pointerId) { point = { x: native.clientX, y: native.clientY }; update(); finish(true) } }
    function cancelPointer(native: PointerEvent) { if (native.pointerId === pointerId) finish() }
    function cancel() { finish() }
    function key(native: KeyboardEvent) { if (native.key === 'Escape') { native.preventDefault(); finish() } }
    function visibility() { if (document.hidden) finish() }
    grid.setPointerCapture?.(pointerId)
    window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', cancelPointer, true); window.addEventListener('blur', cancel)
    window.addEventListener('resize', cancel); window.addEventListener('keydown', key)
    window.addEventListener('scroll', update, true)
    grid.addEventListener('lostpointercapture', cancel); document.addEventListener('visibilitychange', visibility)
    cleanup.current = () => {
      cleanup.current = null
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up, true)
      window.removeEventListener('pointercancel', cancelPointer, true); window.removeEventListener('blur', cancel)
      window.removeEventListener('resize', cancel); window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', update, true)
      grid!.removeEventListener('lostpointercapture', cancel); document.removeEventListener('visibilitychange', visibility)
      if (grid!.hasPointerCapture?.(pointerId)) grid!.releasePointerCapture(pointerId)
      if (frame !== null) window.cancelAnimationFrame(frame)
      ghost?.remove(); badge?.remove(); document.documentElement.classList.remove('create-forms-drag-active')
      if (mounted.current) { setDragging(null); if (!pending.current) setOrder(null) }
    }
  }
  const byId = new Map(widgets.map(widget => [widget.id, widget]))
  return { gridRef, dragging, announcement, onPointerDown, moveByKeyboard, renderedWidgets: order ? order.map(id => byId.get(id)!).filter(Boolean) : widgets }
}
