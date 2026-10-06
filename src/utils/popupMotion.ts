export type PopupMotionKind = 'modal' | 'popover'

/** Lê o mesmo token que controla a animação CSS, evitando tempos divergentes. */
export function getPopupDuration(kind: PopupMotionKind): number {
  const token = kind === 'modal' ? '--astro-popup-duration' : '--astro-popover-duration'
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return kind === 'modal' ? 260 : 200
  return value.endsWith('ms') ? parsed : parsed * 1000
}
