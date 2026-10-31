export function containDialogTab(event: KeyboardEvent, dialog: HTMLDialogElement, fallback: HTMLElement | null): void {
  if (event.key !== 'Tab' || event.defaultPrevented || !dialog.open) return
  const activeDialogs = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')]
  if (activeDialogs.at(-1) !== dialog) return
  const controls = [...dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, summary, [contenteditable="true"], audio[controls], video[controls], iframe, [tabindex]')]
    .filter(element => element.tabIndex >= 0 && !element.matches(':disabled')
      && !element.closest('[hidden], [inert], [aria-hidden="true"]') && element.getClientRects().length > 0)
  const first = controls[0], last = controls.at(-1)
  const active = document.activeElement
  if (!first || event.shiftKey && (active === first || !controls.includes(active as HTMLElement))
    || !event.shiftKey && (active === last || !controls.includes(active as HTMLElement))) {
    event.preventDefault()
    const target = event.shiftKey ? last ?? fallback : first ?? fallback
    target?.focus({ preventScroll: true })
  }
}
