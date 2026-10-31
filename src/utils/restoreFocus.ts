export function restoreFocus(opener: HTMLElement | null, dismissed: HTMLElement | null): void {
  const active = document.activeElement
  if (active !== document.body && active?.isConnected && active !== dismissed && !dismissed?.contains(active)) return
  const dialogs = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')]
  const parentDialog = dialogs.filter(dialog => dialog !== dismissed).at(-1)
  const availableOpener = opener?.isConnected && !opener.closest('[hidden], [inert], dialog:not([open])')
    && !opener.matches(':disabled, [aria-disabled="true"]')
    && (!parentDialog || parentDialog.contains(opener))
  const target = availableOpener ? opener : parentDialog?.querySelector<HTMLElement>('[autofocus], button:not(:disabled), [tabindex="-1"]')
    ?? document.querySelector<HTMLElement>('main h1, [role="main"] h1')
    ?? document.querySelector<HTMLElement>('main, [role="main"], h1')
  if (!target) return
  if (!target.matches('button, input, select, textarea, a[href], [tabindex]')) target.tabIndex = -1
  target.focus({ preventScroll: true })
}
