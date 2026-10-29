import { useCallback, useEffect, useRef, useState } from 'react'
import type { FaceDetector } from '../types/faceNavigation'
import { createFaceLandmarker, requestFaceCamera } from '../services/faceNavigation'
import { faceDwellMoved, faceDwellProgress, faceInteractiveTarget, faceScrollTarget, moveFaceCursor, stableFaceSamples, type FacePoint } from '../utils/faceNavigation'
import { matchesAccessibilityShortcut } from '../utils/accessibilityShortcuts'

type FaceStatus = 'idle' | 'starting' | 'calibrating' | 'active' | 'paused' | 'error'
interface FaceState { status: FaceStatus; message: string; error: string }

export function useFaceNavigation() {
  const [state, setState] = useState<FaceState>({ status: 'idle', message: '', error: '' })
  const controllerRef = useRef<AbortController | null>(null)
  const detectorRef = useRef<FaceDetector | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(0)
  const targetRef = useRef<HTMLElement | null>(null)
  const samplesRef = useRef<FacePoint[]>([])
  const neutralRef = useRef<FacePoint | null>(null)
  const smoothRef = useRef<FacePoint | null>(null)
  const positionRef = useRef<FacePoint>({ x: 0, y: 0 })
  const dwellRef = useRef(0)
  const dwellAnchorRef = useRef<FacePoint>({ x: 0, y: 0 })
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const pausedRef = useRef(false)

  const clearResources = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    detectorRef.current?.close()
    detectorRef.current = null
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; videoRef.current.remove(); videoRef.current = null }
    targetRef.current?.classList.remove('a11y-face-target')
    targetRef.current = null
    pausedRef.current = false
  }, [])

  const stop = useCallback(() => { clearResources(); setState({ status: 'idle', message: '', error: '' }) }, [clearResources])
  const calibrate = useCallback(() => {
    pausedRef.current = false
    samplesRef.current = []
    neutralRef.current = null
    smoothRef.current = null
    targetRef.current?.classList.remove('a11y-face-target')
    targetRef.current = null
    positionRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    setState({ status: 'calibrating', message: 'Olhe para o centro da tela para calibrar.', error: '' })
  }, [])

  const togglePause = useCallback(() => {
    if (!controllerRef.current || !neutralRef.current) return
    pausedRef.current = !pausedRef.current
    targetRef.current?.classList.remove('a11y-face-target')
    dwellRef.current = Number.POSITIVE_INFINITY
    cursorRef.current?.style.setProperty('--face-dwell', '0deg')
    setState({ status: pausedRef.current ? 'paused' : 'active', message: pausedRef.current ? 'Cliques pausados. Mire em Retomar ou use Alt + P.' : 'Mova o rosto e pare sobre um controle para clicar.', error: '' })
  }, [])

  useEffect(() => {
    const stopOnHide = () => { if (document.hidden) stop() }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && controllerRef.current) { event.preventDefault(); stop() }
      if (matchesAccessibilityShortcut(event, 'alt', 'p') && controllerRef.current) { event.preventDefault(); event.stopPropagation(); togglePause() }
    }
    document.addEventListener('visibilitychange', stopOnHide)
    document.addEventListener('keydown', escape, true)
    window.addEventListener('pagehide', stop)
    return () => { clearResources(); document.removeEventListener('visibilitychange', stopOnHide); document.removeEventListener('keydown', escape, true); window.removeEventListener('pagehide', stop) }
  }, [clearResources, stop, togglePause])

  async function start(): Promise<void> {
    if (controllerRef.current) return
    const controller = new AbortController()
    controllerRef.current = controller
    setState({ status: 'starting', message: 'Preparando a navegação facial…', error: '' })
    try {
      const stream = await requestFaceCamera(controller.signal)
      streamRef.current = stream
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.setAttribute('aria-hidden', 'true')
      video.srcObject = stream
      videoRef.current = video
      previewRef.current?.append(video)
      await video.play()
      controller.signal.throwIfAborted()
      const detector = await createFaceLandmarker(controller.signal)
      detectorRef.current = detector
      calibrate()
      let lastFrame = -1
      let lastInference = 0
      let inferenceInterval = 66
      let missedFrames = 0
      let faceMissing = false
      let edgeDirection = 0
      let edgeSince = 0

      const process = async () => {
        if (controller.signal.aborted) return
        const now = performance.now()
        const dialogs = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]'))
        const dialog = dialogs.at(-1) ?? null
        const rect = dialog?.getBoundingClientRect()
        const bounds = { left: Math.max(18, rect?.left ?? 18), top: Math.max(18, rect?.top ?? 18), right: Math.min(innerWidth - 18, rect?.right ?? innerWidth - 18), bottom: Math.min(innerHeight - 18, rect?.bottom ?? innerHeight - 18) }
        if (dialogRef.current !== dialog) {
          dialogRef.current = dialog
          positionRef.current = { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 }
          targetRef.current?.classList.remove('a11y-face-target'); targetRef.current = null
        }
        if (video.readyState >= 2 && video.currentTime !== lastFrame && now - lastInference >= inferenceInterval) {
          const elapsedMs = lastInference ? now - lastInference : 50
          lastFrame = video.currentTime; lastInference = now
          try {
            const result = await detector.detectForVideo(video, now)
            if (controller.signal.aborted) return
            const inferenceDuration = performance.now() - now
            // Reservar tempo para a interface e o restante do sistema em máquinas lentas.
            inferenceInterval = Math.max(66, Math.min(500, inferenceDuration * 2))
            if (elapsedMs > Math.max(500, inferenceInterval * 2) || inferenceDuration > 1000) {
              targetRef.current?.classList.remove('a11y-face-target')
              targetRef.current = null
              dwellRef.current = now
            }
            const point = result.faceLandmarks?.[0]?.[1]
            if (point) {
              missedFrames = 0
              if (faceMissing) { faceMissing = false; setState({ status: pausedRef.current ? 'paused' : neutralRef.current ? 'active' : 'calibrating', message: pausedRef.current ? 'Cliques pausados. Mire em Retomar ou use Alt + P.' : neutralRef.current ? 'Mova o rosto e pare sobre um controle para clicar.' : 'Olhe para o centro da tela para calibrar.', error: '' }) }
              const previous = smoothRef.current ?? point
              const smoothing = 1 - Math.exp(-Math.min(100, elapsedMs) / 200)
              const smooth = { x: previous.x + (point.x - previous.x) * smoothing, y: previous.y + (point.y - previous.y) * smoothing }
              smoothRef.current = smooth
              if (!neutralRef.current) {
                const previousCount = samplesRef.current.length
                samplesRef.current = stableFaceSamples(samplesRef.current, point)
                if (previousCount > 1 && samplesRef.current.length === 1) setState({ status: 'calibrating', message: 'Mantenha o rosto parado olhando para o centro. Reiniciando a calibração.', error: '' })
                if (samplesRef.current.length % 7 === 0 && samplesRef.current.length < 35) setState({ status: 'calibrating', message: `Olhe para o centro da tela. Calibrando: ${Math.round(samplesRef.current.length / 35 * 100)}%.`, error: '' })
                if (samplesRef.current.length >= 35) {
                  neutralRef.current = samplesRef.current.reduce((sum, sample) => ({ x: sum.x + sample.x / 35, y: sum.y + sample.y / 35 }), { x: 0, y: 0 })
                  setState({ status: 'active', message: 'Mova o rosto e pare sobre um controle para clicar.', error: '' })
                }
              } else {
                positionRef.current = moveFaceCursor(positionRef.current, smooth, neutralRef.current, bounds, elapsedMs)
                const { x, y } = positionRef.current
                const edge = pausedRef.current ? 0 : y < bounds.top + 26 ? -1 : y > bounds.bottom - 26 ? 1 : 0
                if (edge !== edgeDirection) { edgeDirection = edge; edgeSince = now }
                const scrolling = edge !== 0
                if (scrolling && now - edgeSince >= 600) faceScrollTarget(x, y, edge, dialog).scrollBy({ top: edge * 7 * Math.min(100, elapsedMs) / 50, behavior: 'instant' })
                const candidate = scrolling ? null : faceInteractiveTarget(x, y, dialog)
                const target = pausedRef.current && !candidate?.hasAttribute('data-face-resume') ? null : candidate
                if (target !== targetRef.current) {
                  targetRef.current?.classList.remove('a11y-face-target')
                  targetRef.current = target; dwellRef.current = now
                  dwellAnchorRef.current = { x, y }
                  target?.classList.add('a11y-face-target')
                }
                if (target && Number.isFinite(dwellRef.current) && faceDwellMoved(dwellAnchorRef.current, positionRef.current)) {
                  dwellAnchorRef.current = { x, y }; dwellRef.current = now
                }
                const progress = target ? faceDwellProgress(dwellRef.current, now) : 0
                cursorRef.current?.style.setProperty('--face-dwell', `${progress * 360}deg`)
                if (target && progress === 1) {
                  dwellRef.current = Number.POSITIVE_INFINITY
                  target.focus({ preventScroll: true }); target.click()
                }

              }
            } else {
              smoothRef.current = null
              if (!neutralRef.current) samplesRef.current = []
              edgeDirection = 0
              targetRef.current?.classList.remove('a11y-face-target'); targetRef.current = null
              cursorRef.current?.style.setProperty('--face-dwell', '0deg')
              if (!faceMissing) { faceMissing = true; setState({ status: pausedRef.current ? 'paused' : neutralRef.current ? 'active' : 'calibrating', message: 'Rosto não encontrado. Olhe para a câmera.', error: '' }) }
            }
          } catch {
            if (controller.signal.aborted) return
            if (++missedFrames >= 3) { clearResources(); setState({ status: 'error', message: '', error: 'A análise facial foi interrompida. Tente ativar novamente.' }); return }
          }
        }
        if (cursorRef.current) {
          // getBoundingClientRect inclui o zoom do popup, que precisa ser compensado.
          const zoom = dialog ? dialog.getBoundingClientRect().width / Math.max(1, dialog.offsetWidth) : 1
          const cursor = cursorRef.current
          const rect = cursor.getBoundingClientRect()
          cursor.style.left = `${(Number.parseFloat(cursor.style.left) || 0) + (positionRef.current.x - rect.left - rect.width / 2) / zoom}px`
          cursor.style.top = `${(Number.parseFloat(cursor.style.top) || 0) + (positionRef.current.y - rect.top - rect.height / 2) / zoom}px`
        }
        frameRef.current = requestAnimationFrame(process)
      }
      frameRef.current = requestAnimationFrame(process)
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      clearResources()
      setState({ status: 'error', message: '', error: error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'A permissão da câmera foi negada. Autorize-a no navegador para usar a navegação facial.'
        : error instanceof DOMException && error.name === 'NotFoundError' ? 'Nenhuma câmera disponível foi encontrada.' : error instanceof Error ? error.message : 'Não foi possível iniciar a navegação facial. Confira a câmera e a conexão.' })
    }
  }

  const attachPreview = useCallback((element: HTMLDivElement | null) => { previewRef.current = element; if (element && videoRef.current) element.append(videoRef.current) }, [])
  const attachCursor = useCallback((element: HTMLDivElement | null) => { cursorRef.current = element; if (element) { element.style.left = '0px'; element.style.top = '0px' } }, [])
  return { ...state, start, stop, calibrate, togglePause, attachCursor, attachPreview }
}

export type FaceNavigationController = ReturnType<typeof useFaceNavigation>
