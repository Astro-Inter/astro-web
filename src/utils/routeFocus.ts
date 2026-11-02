/** Aguarda o título de páginas que primeiro exibem apenas o carregamento. */
export function focusRouteHeading(container: HTMLElement): () => void {
  let observer: MutationObserver | null = null
  let deferred = false
  let previousHeading: HTMLElement | null = null
  function focusWhenReady(): void {
    const heading = container.querySelector<HTMLElement>('h1')
    if (!heading || heading === previousHeading || document.querySelector('dialog.login-loading-overlay[open]')) return
    previousHeading = heading
    const active = document.activeElement
    // Uma consulta lenta não deve interromper alguém que já começou a interagir.
    if (deferred && active && active !== document.body && active !== container
      && (active.matches('input, textarea, select, button, a[href], [contenteditable="true"], [tabindex]')
        || active.closest('dialog[open]'))) return
    heading.tabIndex = -1
    heading.focus({ preventScroll: true })
  }
  focusWhenReady()
  const Observer = container.ownerDocument.defaultView?.MutationObserver
  if (Observer) {
    deferred = true
    observer = new Observer(focusWhenReady)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] })
  }
  return () => observer?.disconnect()
}
