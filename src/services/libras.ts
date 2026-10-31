import type { LibrasPosition } from '../types/accessibility'
import { parseLibrasWidgetStorage } from '../utils/librasStorage'
import widgetTheme from '../../styles/librasWidget.css?raw'
import handsUrl from '../../styles/assets/librasHands.svg?url'
import cursorUrl from '../../styles/assets/librasCursor.svg?url'
import imageCursorUrl from '../../styles/assets/librasImageCursor.svg?url'

interface LibrasWindow extends Window {
  VLibras?: { Widget: new (options: { position: LibrasPosition }) => unknown }
  vlibras?: { instance?: { Module?: { pauseMainLoop?: () => void } } }
}
let scriptPromise: Promise<void> | null = null
let initialized = false
let root: HTMLElement | null = null
let widgetObserver: MutationObserver | null = null
let currentPosition: LibrasPosition = 'L'
let appShadow: ShadowRoot | null = null
let launcherShadow: ShadowRoot | null = null
let appObserver: MutationObserver | null = null
let positionFrame: number | null = null

function onLibrasOpen(event: Event): void {
  if (!event.composedPath().some(target => target instanceof Element && target.id === 'vlibras-button')) return
  const app = document.getElementById('vlibras-app-root')
  if (app) app.dataset.astroOpen = 'true'
}

function onLibrasClick(event: Event): void {
  if (!event.composedPath().some(target => target instanceof Element && target.matches('button[aria-label="Fechar"]'))) return
  const app = document.getElementById('vlibras-app-root')
  if (app) app.dataset.astroOpen = 'false'
  clearLibrasCursor()
  // Limpar também após os handlers do SDK processarem o mesmo clique.
  queueMicrotask(clearLibrasCursor)
}

function syncLibrasCursor(app: HTMLElement, shadow: ShadowRoot): void {
  const panel = shadow.getElementById('vlibras-app')
  const open = !!panel && !panel.hasAttribute('inert') && app.dataset.active !== 'false'
  const value = String(open)
  if (app.dataset.astroOpen !== value) app.dataset.astroOpen = value
  if (!open) clearLibrasCursor()
}

function themeWidget(shadow: ShadowRoot): void {
  let style = shadow.getElementById('astro-libras-theme')
  const css = widgetTheme.replaceAll('__ASTRO_LIBRAS_HANDS__', handsUrl).replaceAll('__ASTRO_LIBRAS_CURSOR__', cursorUrl).replaceAll('__ASTRO_LIBRAS_IMAGE_CURSOR__', imageCursorUrl)
  if (!style) {
    style = document.createElement('style')
    style.id = 'astro-libras-theme'
    shadow.append(style)
  }
  if (style.textContent !== css) style.textContent = css
}

function schedulePosition(): void {
  if (positionFrame !== null || root?.hidden) return
  positionFrame = window.requestAnimationFrame(() => {
    positionFrame = null
    if (!root?.hidden) positionModernWidget()
  })
}

function resetLibrasOpenState(): void {
  // O SDK persiste se o player estava aberto e tenta inicializar o WebGL no
  // próximo reload. Preservamos suas demais preferências, mas exigimos clique.
  try {
    const raw = localStorage.getItem('@vlibras-widget')
    const saved = parseLibrasWidgetStorage(raw)
    if (saved) localStorage.setItem('@vlibras-widget', JSON.stringify(saved))
    else if (raw !== null) localStorage.removeItem('@vlibras-widget')
  } catch { /* O widget continua disponível sem persistência. */ }
}

function clearLibrasCursor(): void {
  const selector = '.vlibras--hover, .vlibras--active'
  const clear = (scope: Document | ShadowRoot) => scope.querySelectorAll(selector).forEach(element => {
    element.classList.remove('vlibras--hover', 'vlibras--active')
  })
  clear(document)
  for (const id of ['vlibras-access-wrapper', 'vlibras-app-root']) {
    const shadow = document.getElementById(id)?.shadowRoot
    if (shadow?.querySelectorAll) clear(shadow)
  }
}

function positionModernWidget(): void {
  const app = document.getElementById('vlibras-app-root') ?? root?.querySelector<HTMLElement>('#vlibras-app-root')
  const shadow = app?.shadowRoot
  if (!shadow) return
  themeWidget(shadow)
  if (appShadow !== shadow) {
    appObserver?.disconnect()
    appShadow?.removeEventListener('click', onLibrasClick, true)
    appShadow = shadow
    shadow.addEventListener('click', onLibrasClick, true)
    // Não reagir a cada texto/quadro do player nem escrever no DOM dentro
    // da própria entrega do observer: isso pode alimentar ciclos de mutações.
    appObserver = new MutationObserver(() => {
      if (app) syncLibrasCursor(app, shadow)
      if (!shadow.getElementById('astro-libras-position') || !shadow.getElementById('astro-libras-theme')) schedulePosition()
    })
    appObserver.observe(shadow, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert'] })
  }
  if (app) syncLibrasCursor(app, shadow)
  let style = shadow.getElementById('astro-libras-position')
  if (!style) { style = document.createElement('style'); style.id = 'astro-libras-position'; shadow.append(style) }
  const positions = {
    L: 'left:1rem;right:auto;top:50%;bottom:auto;transform:translateY(-50%)',
    R: 'left:auto;right:1rem;top:50%;bottom:auto;transform:translateY(-50%)',
  }
  const declarations = positions[currentPosition].split(';').map(value => `${value}!important`).join(';')
  // Preservar a âncora durante o fechamento evita o salto para a posição
  // externa do SDK antes de a transição de opacidade terminar.
  const css = `:host{--astro-libras-slide:${currentPosition === 'L' ? '-1rem' : '1rem'}}:host(:not([data-expanded="true"])) #vlibras-app{${declarations};scale:none!important;rotate:none!important;max-width:calc(100vw - 2rem)!important;max-height:calc(100dvh - 2rem)!important}`
  if (style.textContent !== css) style.textContent = css
}

// O VLibras atual usa Shadow DOM e cria suas raízes diretamente no body.
// Mantê-las no nosso contêiner permite desativar e acompanhar dialogs nativos.
function adoptWidgetRoots(): void {
  if (!root) return
  for (const id of ['vlibras-access-wrapper', 'vlibras-app-root']) {
    const instances = Array.from(document.querySelectorAll<HTMLElement>(`[id="${id}"]`))
    const widget = instances.find(element => element.shadowRoot?.getElementById('astro-libras-theme')) ?? instances[0]
    for (const duplicate of instances) {
      if (duplicate !== widget) duplicate.remove()
    }
    if (widget && widget.parentElement !== root) root.append(widget)
    if (widget && id === 'vlibras-app-root' && root.hidden && widget.dataset.active !== 'false') widget.dataset.active = 'false'
  }
  const launcher = document.getElementById('vlibras-access-wrapper')
  if (launcher && launcher.dataset.astroSide !== currentPosition) launcher.dataset.astroSide = currentPosition
  const shadow = launcher?.shadowRoot
  if (shadow) themeWidget(shadow)
  if (shadow && launcherShadow !== shadow) {
    launcherShadow?.removeEventListener('click', onLibrasOpen, true)
    launcherShadow = shadow
    shadow.addEventListener('click', onLibrasOpen, true)
  }
  const access = shadow?.getElementById('vlibras-access')
  const button = shadow?.getElementById('vlibras-button')
  if (access) {
    const left = currentPosition === 'L'
    const values = { left: left ? '10px' : 'auto', right: left ? 'auto' : '10px', top: 'calc(50vh - 20px)', bottom: 'auto', flexDirection: left ? 'row-reverse' : 'row' }
    for (const [key, value] of Object.entries(values)) {
      const property = key as keyof typeof values
      if (access.style[property] !== value) access.style[property] = value
    }
  }
  if (button) {
    const left = currentPosition === 'L' ? '0px' : 'auto'
    const right = currentPosition === 'L' ? 'auto' : '0px'
    if (button.style.left !== left) button.style.left = left
    if (button.style.right !== right) button.style.right = right
  }
  positionModernWidget()
}

export async function enableLibras(position: LibrasPosition, signal: AbortSignal): Promise<HTMLElement> {
  let container = document.getElementById('astro-libras') ?? root
  if (!container) {
    container = document.createElement('div')
    container.id = 'astro-libras'
    container.setAttribute('vw', '')
    container.setAttribute('popover', 'manual')
    container.className = 'enabled'
    const access = document.createElement('div')
    access.setAttribute('vw-access-button', '')
    access.className = 'active'
    const wrapper = document.createElement('div')
    wrapper.setAttribute('vw-plugin-wrapper', '')
    const top = document.createElement('div')
    top.className = 'vw-plugin-top-wrapper'
    wrapper.append(top)
    container.append(access, wrapper)
    document.body.append(container)
  }
  root = container
  if (!widgetObserver) {
    widgetObserver = new MutationObserver(records => {
      if (records.some(record => Array.from(record.addedNodes).some(node => node instanceof Element && (node.id === 'vlibras-app-root' || node.id === 'vlibras-access-wrapper')))) adoptWidgetRoots()
    })
    widgetObserver.observe(document.body, { childList: true })
  }
  container.hidden = false
  // O módulo é reavaliado pelo Vite, mas o SDK e suas raízes continuam no DOM.
  // Recarregar o script reinicia o singleton interno e cria outro launcher.
  if (!scriptPromise && (window as LibrasWindow).VLibras?.Widget) scriptPromise = Promise.resolve()
  if (!scriptPromise) {
    resetLibrasOpenState()
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js'
      script.async = true
      script.id = 'astro-libras-script'
      const timer = window.setTimeout(() => fail(), 20_000)
      const fail = () => { window.clearTimeout(timer); script.onload = null; script.onerror = null; script.remove(); scriptPromise = null; reject(new Error('Não foi possível carregar o VLibras. Confira sua conexão e tente novamente.')) }
      script.onload = () => { window.clearTimeout(timer); resolve() }
      script.onerror = fail
      document.head.append(script)
    })
  }
  await scriptPromise
  signal.throwIfAborted()
  if (!initialized) {
    const browser = window as LibrasWindow
    if (!browser.VLibras?.Widget) { scriptPromise = null; throw new Error('O VLibras não ficou disponível. Tente novamente.') }
    if (!document.getElementById('vlibras-access-wrapper')) new browser.VLibras.Widget({ position })
    initialized = true
  }
  positionLibras(position)
  container.hidden = false
  return container
}

export function positionLibras(position: LibrasPosition): void {
  currentPosition = position
  adoptWidgetRoots()
  window.dispatchEvent(new CustomEvent('vp-widget-wrapper-set-side', { detail: position }))
}

export function pauseLibras(): void {
  const container = document.getElementById('astro-libras') ?? root
  const app = document.getElementById('vlibras-app-root') ?? container?.querySelector<HTMLElement>('#vlibras-app-root')
  // Ocultar o DOM não encerra a captura de texto do SDK. Fechar pelo próprio
  // controle e data-active desliga seus listeners e pausa o tradutor.
  app?.shadowRoot?.querySelector<HTMLButtonElement>('button[aria-label="Fechar"]')?.click()
  if (app) {
    app.dataset.astroOpen = 'false'
    if (app.dataset.active !== 'false') app.dataset.active = 'false'
    delete app.dataset.expanded
  }
  // Também pausar diretamente o renderizador já carregado, sem depender
  // da próxima entrega assíncrona do observer do SDK.
  try { (window as LibrasWindow).vlibras?.instance?.Module?.pauseMainLoop?.() } catch { /* SDK ainda inicializando. */ }
  delete document.body.dataset.vlibrasExpanded
  delete document.documentElement.dataset.vlibrasStatus
  clearLibrasCursor()
}

export function hideLibras(): void {
  widgetObserver?.disconnect(); widgetObserver = null
  appObserver?.disconnect(); appObserver = null
  appShadow?.removeEventListener('click', onLibrasClick, true); appShadow = null
  launcherShadow?.removeEventListener('click', onLibrasOpen, true); launcherShadow = null
  if (positionFrame !== null) { window.cancelAnimationFrame(positionFrame); positionFrame = null }
  resetLibrasOpenState()
  pauseLibras()
  const container = document.getElementById('astro-libras') ?? root
  if (!container) return
  try { if (container.matches(':popover-open')) container.hidePopover() } catch { /* Compatibilidade sem Popover API. */ }
  container.hidden = true
}
