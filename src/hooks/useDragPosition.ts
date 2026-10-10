import { useCallback, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

interface DragPosition {
  left: number
  top: number
}

interface DragMotion {
  element: HTMLElement
  origin: DragPosition
  position: DragPosition
  commit: (position: DragPosition) => void
  transform: string
  transition: string
  willChange: string
  frame: number | null
  moved: boolean
}

function restoreElement(motion: DragMotion) {
  if (motion.frame !== null) cancelAnimationFrame(motion.frame)
  motion.element.style.transform = motion.transform
  motion.element.style.transition = motion.transition
  motion.element.style.willChange = motion.willChange
}

// Move só a superfície durante o gesto; React recebe a posição ao soltar.
export function useDragPosition() {
  const motionRef = useRef<DragMotion | null>(null)

  const finish = useCallback(() => {
    const motion = motionRef.current
    if (!motion) return
    motionRef.current = null
    if (!motion.moved) return
    if (motion.frame !== null) cancelAnimationFrame(motion.frame)
    motion.element.style.transition = 'none'
    flushSync(() => motion.commit(motion.position))
    // A posição definitiva e a remoção do deslocamento ocorrem no mesmo quadro.
    motion.element.style.transform = motion.transform
    motion.element.style.willChange = motion.willChange
    // Resolve a nova posição sem transição antes de reativar as animações de tamanho.
    motion.element.getBoundingClientRect()
    motion.element.style.transition = motion.transition
  }, [])

  const begin = useCallback((element: HTMLElement, origin: DragPosition, commit: DragMotion['commit']) => {
    finish()
    motionRef.current = {
      element, origin, position: origin, commit,
      transform: element.style.transform,
      transition: element.style.transition,
      willChange: element.style.willChange,
      frame: null,
      moved: false,
    }
  }, [finish])

  const move = useCallback((position: DragPosition) => {
    const motion = motionRef.current
    if (!motion) return
    motion.moved = true
    motion.position = position
    if (motion.frame !== null) return
    motion.frame = requestAnimationFrame(() => {
      motion.frame = null
      motion.element.style.transition = 'none'
      motion.element.style.willChange = 'transform'
      motion.element.style.transform = `translate3d(${motion.position.left - motion.origin.left}px, ${motion.position.top - motion.origin.top}px, 0)`
    })
  }, [])

  useEffect(() => () => {
    if (motionRef.current) restoreElement(motionRef.current)
  }, [])

  return { begin, move, finish }
}
