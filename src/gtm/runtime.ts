import { resolveScreen } from './routes'
import { pushTracking, type EventFields, type EventName, type TrackingBrowser } from './track'

interface RuntimeOptions {
  document: Document
  browser: Window & typeof globalThis & TrackingBrowser
  getUid: () => string | null
  enabled?: boolean
}

/** Somente atributos explícitos são rastreados; texto visível, URL, IDs de linhas e inputs não são lidos. */
export function createTrackingRuntime({ document, browser, getUid, enabled = true }: RuntimeOptions) {
  let activeVisit: string | null = null
  let route: HTMLElement | null = null
  const viewed = new Map<HTMLElement, string>()
  const observed = new Set<HTMLElement>()
  const intersecting = new Set<HTMLElement>()
  let intersection: IntersectionObserver | undefined
  let mutation: MutationObserver | undefined

  function visible(element: HTMLElement): boolean {
    if (!element.isConnected || element.closest('[hidden], [aria-hidden="true"], dialog:not([open])')) return false
    for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
      const style = browser.getComputedStyle(parent)
      if (style.display === 'none' || style.visibility === 'hidden') return false
    }
    return true
  }

  function base(): EventFields | null {
    if (!route || !route.querySelector('[data-track-page]')) return null
    const screen = resolveScreen(route.dataset.trackRoute ?? '', route.dataset.trackSearch ?? '')
    return screen ? { ...screen, firebase_uid: getUid() } : null
  }

  function emit(event: EventName, fields: Partial<EventFields> = {}): void {
    const screen = base()
    if (!screen || !enabled) return
    try { pushTracking(browser, event, { ...screen, ...fields }) }
    catch (error) { console.warn('Falha ao preparar evento de tracking:', error) }
  }

  function trackView(element: HTMLElement): void {
    if (!visible(element) || !base()) return
    const dialog = element.dataset.trackDialog
    const showcase = element.dataset.trackShowcase
    if (!dialog && !showcase) return
    if (showcase && intersection && !intersecting.has(element)) return
    const signature = `${activeVisit}:${dialog ?? showcase}`
    if (viewed.get(element) === signature) return
    viewed.set(element, signature)
    if (dialog) emit('dialog_viewed', { nome_dialog: dialog })
    else emit('showcase_viewed', { nome_showcase: showcase })
  }

  function scan(): void {
    if (!enabled) return
    route = document.querySelector<HTMLElement>('[data-track-route]')
    const page = route?.querySelector<HTMLElement>('[data-track-page]')
    if (!route || !page || !visible(page) || !base()) return
    const visit = `${route.dataset.trackVisit}:${route.dataset.trackRoute}:${route.dataset.trackSearch}`
    if (activeVisit !== visit) {
      activeVisit = visit
      emit('screen_view')
    }
    for (const [element] of viewed) {
      if (!visible(element) || (!element.dataset.trackDialog && !element.dataset.trackShowcase)) viewed.delete(element)
    }
    for (const element of observed) {
      if (!element.isConnected) {
        intersection?.unobserve(element)
        observed.delete(element)
        intersecting.delete(element)
        viewed.delete(element)
      }
    }
    for (const element of document.querySelectorAll<HTMLElement>('[data-track-dialog], [data-track-showcase]')) {
      if (element.dataset.trackShowcase && intersection && !observed.has(element)) {
        observed.add(element)
        intersection.observe(element)
      }
      trackView(element)
    }
  }

  function interaction(event: Event): void {
    if (!enabled || !(event.target instanceof browser.Element)) return
    const target = event.target as HTMLElement
    if (event.type === 'click' && target instanceof browser.HTMLDialogElement && target.dataset.trackDialog && target.dataset.trackDismissible !== 'false') {
      const bounds = target.getBoundingClientRect()
      const click = event as MouseEvent
      if (click.clientX < bounds.left || click.clientX > bounds.right || click.clientY < bounds.top || click.clientY > bounds.bottom) {
        emit('dialog_clicked', { nome_dialog: target.dataset.trackDialog, dialog_clicado: 'fechar' })
      }
      return
    }
    const control = (event.target as Element).closest<HTMLElement>('[data-track-action], [data-track-item], [data-track-submit]')
    if ((event.target as Element).closest('[data-track-ignore]')) return
    if (!control || !visible(control) || control.closest('[disabled], [aria-disabled="true"], [inert]')) return
    // Submit tem um único evento: clique ou Enter chegam pelo submit do formulário.
    if (event.type === 'click' && (control.dataset.trackSubmit || control.closest('[data-track-submit]') && control.matches('button[type="submit"], input[type="submit"]'))) return
    if (event.type === 'submit' && !control.dataset.trackSubmit) return
    scan()
    const item = control.dataset.trackItem
    if (item) {
      const showcase = control.closest<HTMLElement>('[data-track-showcase]')?.dataset.trackShowcase
      if (showcase) emit('showcase_clicked', { nome_showcase: showcase, showcase_click: item })
      return
    }
    const action = control.dataset.trackSubmit ?? control.dataset.trackAction
    if (!action) return
    const dialog = control.closest<HTMLElement>('[data-track-dialog]')?.dataset.trackDialog
    if (dialog) emit('dialog_clicked', { nome_dialog: dialog, dialog_clicado: action })
    else emit('button_click', { nome_botao: action })
  }

  function cancel(event: Event): void {
    const dialog = event.target as HTMLElement
    if (dialog.dataset.trackDialog && dialog.dataset.trackDismissible !== 'false' && visible(dialog)) emit('dialog_clicked', { nome_dialog: dialog.dataset.trackDialog, dialog_clicado: 'fechar' })
  }

  function closeMenu(event: KeyboardEvent): void {
    if (!(event.target instanceof browser.Element)) return
    const control = event.target as HTMLElement
    if (control.matches('[role="combobox"][data-track-action]')) {
      const opening = control.getAttribute('aria-expanded') !== 'true'
      const activates = event.key === 'Enter' || opening && ['ArrowDown', 'ArrowUp'].includes(event.key)
        || opening && event.key === ' ' && control.getAttribute('aria-autocomplete') === 'none'
      if (activates) interaction(event)
    }
    if (event.key !== 'Escape') return
    const menu = (event.target as Element).closest<HTMLElement>('[role="menu"][data-track-dialog]')
    if (menu?.dataset.trackDialog && visible(menu)) emit('dialog_clicked', { nome_dialog: menu.dataset.trackDialog, dialog_clicado: 'fechar' })
  }

  function start(): () => void {
    if (!enabled) return () => undefined
    if (browser.IntersectionObserver) {
      intersection = new browser.IntersectionObserver(entries => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement
          if (entry.isIntersecting) { intersecting.add(element); trackView(element) }
          else intersecting.delete(element)
        }
      })
    }
    mutation = new browser.MutationObserver(scan)
    mutation.observe(document.body, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['open', 'hidden', 'aria-hidden', 'style', 'class', 'data-track-page', 'data-track-route', 'data-track-search', 'data-track-visit', 'data-track-dialog', 'data-track-showcase'] })
    document.addEventListener('click', interaction, true)
    document.addEventListener('submit', interaction, true)
    document.addEventListener('cancel', cancel, true)
    document.addEventListener('keydown', closeMenu, true)
    scan()
    return () => {
      mutation?.disconnect()
      intersection?.disconnect()
      observed.clear()
      intersecting.clear()
      document.removeEventListener('click', interaction, true)
      document.removeEventListener('submit', interaction, true)
      document.removeEventListener('cancel', cancel, true)
      document.removeEventListener('keydown', closeMenu, true)
    }
  }
  return { start }
}
