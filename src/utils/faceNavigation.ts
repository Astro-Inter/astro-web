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
  const target = document.elementFromPoint(x, y)?.closest<HTMLElement>(selector) ?? null
  if (!target || target.closest('[hidden],[inert],[aria-disabled="true"]') || (dialog && !dialog.contains(target))) return null
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
