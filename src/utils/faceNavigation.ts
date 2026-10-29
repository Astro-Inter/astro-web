export interface FacePoint { x: number; y: number }
export interface FaceBounds { left: number; top: number; right: number; bottom: number }

export function moveFaceCursor(position: FacePoint, point: FacePoint, neutral: FacePoint, bounds: FaceBounds, elapsedMs = 50): FacePoint {
  const deadZone = (delta: number) => Math.abs(delta) < .008 ? 0 : delta - Math.sign(delta) * .008
  const frameScale = Math.max(0, Math.min(100, elapsedMs)) / 50
  return {
    // A prévia é espelhada: o movimento horizontal da mira acompanha o usuário.
    x: Math.max(bounds.left, Math.min(bounds.right, position.x - deadZone(point.x - neutral.x) * 115 * frameScale)),
    y: Math.max(bounds.top, Math.min(bounds.bottom, position.y + deadZone(point.y - neutral.y) * 125 * frameScale)),
  }
}

export function faceDwellProgress(start: number, now: number): number {
  return Math.max(0, Math.min(1, (now - start) / 1400))
}

export function faceInteractiveTarget(x: number, y: number, dialog: HTMLDialogElement | null): HTMLElement | null {
  const selector = 'a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[role="button"],[tabindex]:not([tabindex="-1"])'
  const hit = document.elementFromPoint(x, y)
  const label = hit?.closest('label')
  const control = label?.control
  const choice = control?.matches('input[type="radio"],input[type="checkbox"]') ? control : null
  const target = choice ? label : hit?.closest<HTMLElement>(selector) ?? null
  if (choice?.matches(':disabled') || choice?.closest('[hidden],[inert],[aria-disabled="true"]')) return null
  if (!target || target.matches(':disabled') || target.closest('[hidden],[inert],[aria-disabled="true"]') || (dialog && !dialog.contains(target))) return null
  return target
}

// Calibration requires consecutive stable samples.
export function stableFaceSamples(samples: FacePoint[], point: FacePoint): FacePoint[] {
  const anchor = samples[0]
  if (anchor && Math.hypot(point.x - anchor.x, point.y - anchor.y) > .015) return [point]
  return [...samples, { x: point.x, y: point.y }].slice(-35)
}

export function faceDwellMoved(anchor: FacePoint, position: FacePoint): boolean {
  return Math.hypot(position.x - anchor.x, position.y - anchor.y) > 12
}

export function faceScrollTarget(x: number, y: number, direction: number, dialog: HTMLDialogElement | null): HTMLElement | Window {
  const canScroll = (element: HTMLElement) => {
    const overflow = window.getComputedStyle(element).overflowY
    return /auto|scroll/.test(overflow) && element.clientHeight > 0 && element.scrollHeight > element.clientHeight
      && (direction < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight - 1)
  }
  let hit = document.elementFromPoint(x, y) as HTMLElement | null
  while (hit && (!dialog || dialog.contains(hit))) {
    if (canScroll(hit)) return hit
    hit = hit.parentElement
  }
  // Editores têm uma área rolável entre o cabeçalho e os botões fixos.
  const candidates = Array.from(dialog?.querySelectorAll<HTMLElement>('*') ?? []).filter(element => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && x >= rect.left && x <= rect.right && canScroll(element)
  })
  const distance = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return Math.max(rect.top - y, y - rect.bottom, 0)
  }
  candidates.sort((a, b) => distance(a) - distance(b))
  return candidates[0] ?? dialog ?? window
}
