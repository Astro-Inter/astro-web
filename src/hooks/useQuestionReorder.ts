import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction, type PointerEvent as ReactPointerEvent } from 'react'
import type { CreateFormValues, FormQuestion } from '../types/forms'

type QuestionDropTarget = { id: string; position: 'before' | 'after' }
const ignoreAnnouncement = (_message: string) => { void _message }

export function useQuestionReorder(values: CreateFormValues, setValues: Dispatch<SetStateAction<CreateFormValues>>, setFeedback = ignoreAnnouncement, setError = ignoreAnnouncement) {
  const [recentlyMovedQuestionId, setRecentlyMovedQuestionId] = useState<string | null>(null)
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<QuestionDropTarget | null>(null)
  const [previewQuestionOrder, setPreviewQuestionOrder] = useState<string[] | null>(null)
  const movedQuestionTimerRef = useRef<number | null>(null)
  const activeQuestionDragRef = useRef<{ questionId: string; pointerId: number; started: boolean } | null>(null)
  const dragPointerPositionRef = useRef({ x: 0, y: 0 })
  const dragStartQuestionOrderRef = useRef<string[]>([])
  const dragStartMidpointsRef = useRef<Map<string, number>>(new Map())
  const validDropRef = useRef(false)
  const dragHorizontalBoundsRef = useRef({ left: 0, right: 0 })
  const previewQuestionOrderRef = useRef<string[] | null>(null)
  const questionPositionsBeforeAnimationRef = useRef<Map<string, number> | null>(null)
  const dragPreviewElementRef = useRef<HTMLElement | null>(null)
  const dragPositionBadgeRef = useRef<HTMLDivElement | null>(null)
  const dragPreviewOffsetRef = useRef({ x: 0, y: 0 })
  const dragPreviewOriginRef = useRef({ x: 0, y: 0 })
  const dragOriginalIndexRef = useRef<number | null>(null)
  const dragListenersCleanupRef = useRef<(() => void) | null>(null)
  const autoScrollFrameRef = useRef<number | null>(null)
  const lastAutoScrollTimeRef = useRef<number | null>(null)
  useEffect(() => () => {
    if (movedQuestionTimerRef.current !== null) window.clearTimeout(movedQuestionTimerRef.current)
    if (autoScrollFrameRef.current !== null) window.cancelAnimationFrame(autoScrollFrameRef.current)
    dragListenersCleanupRef.current?.()
    dragPreviewElementRef.current?.remove()
    dragPositionBadgeRef.current?.remove()
    document.documentElement.classList.remove('create-forms-drag-active')
  }, [])
  useLayoutEffect(() => {
    const previousPositions = questionPositionsBeforeAnimationRef.current
    if (!previousPositions) return
    questionPositionsBeforeAnimationRef.current = null
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    document.querySelectorAll<HTMLElement>('.create-forms-question-item[data-question-id]').forEach((item) => {
      if (item.dataset.removing === 'true') return
      const questionId = item.dataset.questionId
      const previousTop = questionId ? previousPositions.get(questionId) : undefined
      if (previousTop === undefined) return
      const distance = previousTop - item.getBoundingClientRect().top
      if (Math.abs(distance) < 1) return
      item.getAnimations().forEach((animation) => animation.cancel())
      item.animate(
        [{ transform: `translateY(${distance}px)` }, { transform: 'translateY(0)' }],
        { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      )
    })
  }, [previewQuestionOrder, values.questions])

  function moveQuestion(questionId: string, targetId: string, position: 'before' | 'after') {
    if (activeQuestionDragRef.current) return
    questionPositionsBeforeAnimationRef.current = captureQuestionPositions()
    setValues((current) => {
      const fromIndex = current.questions.findIndex((question) => question.id === questionId)
      const targetIndex = current.questions.findIndex((question) => question.id === targetId)
      if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return current

      const questions = [...current.questions]
      const [question] = questions.splice(fromIndex, 1)
      let insertIndex = targetIndex + (position === 'after' ? 1 : 0)
      if (fromIndex < targetIndex) insertIndex -= 1
      questions.splice(insertIndex, 0, question)
      return { ...current, questions }
    })
    setFeedback('Ordem das perguntas atualizada.')
    setError('')
  }

  function moveQuestionByKeyboard(questionId: string, direction: -1 | 1) {
    const index = values.questions.findIndex((question) => question.id === questionId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= values.questions.length) return
    const targetId = values.questions[nextIndex].id
    moveQuestion(questionId, targetId, direction < 0 ? 'before' : 'after')
  }

  function captureQuestionPositions() {
    const positions = new Map<string, number>()
    document.querySelectorAll<HTMLElement>('.create-forms-question-item[data-question-id]').forEach((item) => {
      if (item.dataset.questionId) positions.set(item.dataset.questionId, item.getBoundingClientRect().top)
    })
    return positions
  }

  function createDragPreview(handle: HTMLButtonElement, point: { x: number; y: number }) {
    const card = handle.closest<HTMLElement>('.create-forms-question-card')
    if (!card) return
    const bounds = card.getBoundingClientRect()
    const preview = card.cloneNode(true) as HTMLElement
    if (card.closest('.astro-scale-90')) preview.classList.add('astro-scale-90')
    else if (card.closest('.astro-scale-100')) preview.classList.add('astro-scale-100')
    preview.removeAttribute('id')
    preview.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'))
    preview.setAttribute('aria-hidden', 'true')
    preview.setAttribute('inert', '')
    preview.style.position = 'fixed'
    preview.style.zIndex = '10000'
    preview.style.left = `${bounds.left}px`
    preview.style.top = `${bounds.top}px`
    preview.style.width = `${bounds.width}px`
    preview.style.margin = '0'
    preview.style.opacity = '0.68'
    preview.style.pointerEvents = 'none'
    preview.style.boxShadow = '0 14px 36px rgb(0 0 0 / 35%)'
    preview.style.transform = 'translate3d(0, 0, 0) scale(1.005)'
    document.body.append(preview)
    dragPreviewElementRef.current = preview
    dragPreviewOffsetRef.current = { x: point.x - bounds.left, y: point.y - bounds.top }
    dragPreviewOriginRef.current = { x: bounds.left, y: bounds.top }

    const badge = document.createElement('div')
    badge.className = 'create-forms-drag-position-badge'
    badge.setAttribute('aria-hidden', 'true')
    badge.textContent = 'Arraste para reordenar'
    document.body.append(badge)
    dragPositionBadgeRef.current = badge
    moveDragPositionBadge(point.x, point.y)
  }

  function moveDragPreview(x: number, y: number) {
    const preview = dragPreviewElementRef.current
    if (!preview) return
    const left = x - dragPreviewOffsetRef.current.x
    const top = y - dragPreviewOffsetRef.current.y
    preview.style.transform = `translate3d(${left - dragPreviewOriginRef.current.x}px, ${top - dragPreviewOriginRef.current.y}px, 0) scale(1.005)`
    moveDragPositionBadge(x, y)
  }

  function moveDragPositionBadge(x: number, y: number) {
    const badge = dragPositionBadgeRef.current
    if (!badge) return
    const left = Math.max(12, Math.min(x + 16, window.innerWidth - badge.offsetWidth - 12))
    const top = Math.max(12, Math.min(y + 16, window.innerHeight - badge.offsetHeight - 12))
    badge.style.transform = `translate3d(${left}px, ${top}px, 0)`
  }

  function updateDragPositionBadge(order: string[], questionId: string) {
    const badge = dragPositionBadgeRef.current
    const currentIndex = order.indexOf(questionId)
    const originalIndex = dragOriginalIndexRef.current
    if (!badge || currentIndex < 0 || originalIndex === null) return
    const direction = currentIndex < originalIndex ? 'Subindo' : currentIndex > originalIndex ? 'Descendo' : 'Posição atual'
    badge.textContent = `${direction} · posição ${currentIndex + 1} de ${order.length}`
  }

  function updateDropTargetAtPointer(x: number, y: number, questionId: string) {
    const startOrder = dragStartQuestionOrderRef.current
    const currentOrder = previewQuestionOrderRef.current
    const dragBounds = dragHorizontalBoundsRef.current
    if (!currentOrder || !startOrder.length || x < dragBounds.left || x > dragBounds.right || y < 0 || y > window.innerHeight) {
      validDropRef.current = false
      setDropTarget(null)
      if (currentOrder) updateDragPositionBadge(currentOrder, questionId)
      return
    }
    validDropRef.current = true

    const remainingOrder = startOrder.filter((id) => id !== questionId)
    if (!remainingOrder.length) return
    const midpoints = dragStartMidpointsRef.current
    const pointerDocumentY = y + window.scrollY
    let insertIndex = remainingOrder.findIndex((id) => pointerDocumentY < (midpoints.get(id) ?? Number.POSITIVE_INFINITY))
    if (insertIndex < 0) insertIndex = remainingOrder.length

    const currentIndex = currentOrder.indexOf(questionId)
    const boundaryId = insertIndex < currentIndex ? remainingOrder[insertIndex] : remainingOrder[insertIndex - 1]
    const boundary = boundaryId ? midpoints.get(boundaryId) : undefined
    if (boundary !== undefined && Math.abs(pointerDocumentY - boundary) < 8) insertIndex = currentIndex

    const nextOrder = [...remainingOrder]
    nextOrder.splice(insertIndex, 0, questionId)
    updateDragPositionBadge(nextOrder, questionId)
    const targetId = insertIndex < remainingOrder.length ? remainingOrder[insertIndex] : remainingOrder[remainingOrder.length - 1]
    const position: QuestionDropTarget['position'] = insertIndex < remainingOrder.length ? 'before' : 'after'
    const nextTarget = { id: targetId, position }
    setDropTarget((current) => current?.id === nextTarget.id && current.position === nextTarget.position ? current : nextTarget)
    if (nextOrder.some((id, index) => id !== currentOrder[index])) {
      questionPositionsBeforeAnimationRef.current = captureQuestionPositions()
      previewQuestionOrderRef.current = nextOrder
      setPreviewQuestionOrder(nextOrder)
    }
  }

  function finishQuestionDrag(pointerId: number, shouldMove: boolean) {
    const activeDrag = activeQuestionDragRef.current
    if (!activeDrag || activeDrag.pointerId !== pointerId) return
    const finalOrder = previewQuestionOrderRef.current
    const originalOrder = values.questions.map((question) => question.id)
    const orderChanged = finalOrder?.some((questionId, index) => questionId !== originalOrder[index]) ?? false
    if (shouldMove && activeDrag.started && validDropRef.current && finalOrder && orderChanged) {
      const originalIndex = dragOriginalIndexRef.current ?? originalOrder.indexOf(activeDrag.questionId)
      const finalIndex = finalOrder.indexOf(activeDrag.questionId)
      setValues((current) => {
        const questionsById = new Map(current.questions.map((question) => [question.id, question]))
        const questions = finalOrder.map((questionId) => questionsById.get(questionId)).filter((question): question is FormQuestion => Boolean(question))
        return questions.length === current.questions.length ? { ...current, questions } : current
      })
      const direction = finalIndex < originalIndex ? 'para cima' : 'para baixo'
      setFeedback(`Pergunta movida ${direction} para a posição ${finalIndex + 1} de ${finalOrder.length}.`)
      setError('')
      setRecentlyMovedQuestionId(activeDrag.questionId)
      if (movedQuestionTimerRef.current !== null) window.clearTimeout(movedQuestionTimerRef.current)
      movedQuestionTimerRef.current = window.setTimeout(() => setRecentlyMovedQuestionId(null), 900)
    }
    if (activeDrag.started) {
      questionPositionsBeforeAnimationRef.current = captureQuestionPositions()
    }
    activeQuestionDragRef.current = null
    previewQuestionOrderRef.current = null
    dragStartQuestionOrderRef.current = []
    dragStartMidpointsRef.current.clear()
    validDropRef.current = false
    dragHorizontalBoundsRef.current = { left: 0, right: 0 }
    dragPreviewElementRef.current?.remove()
    dragPreviewElementRef.current = null
    dragPositionBadgeRef.current?.remove()
    dragPositionBadgeRef.current = null
    dragOriginalIndexRef.current = null
    document.documentElement.classList.remove('create-forms-drag-active')
    dragListenersCleanupRef.current?.()
    dragListenersCleanupRef.current = null
    if (autoScrollFrameRef.current !== null) window.cancelAnimationFrame(autoScrollFrameRef.current)
    autoScrollFrameRef.current = null
    lastAutoScrollTimeRef.current = null
    setDraggingQuestionId(null)
    setDropTarget(null)
    setPreviewQuestionOrder(null)
  }

  function processQuestionDragFrame(time: number) {
    autoScrollFrameRef.current = null
    const activeDrag = activeQuestionDragRef.current
    if (!activeDrag?.started) return

    const { x, y } = dragPointerPositionRef.current
    const edgeSize = 76
    let scrollDelta = 0
    const insideList = x >= dragHorizontalBoundsRef.current.left && x <= dragHorizontalBoundsRef.current.right
    const elapsed = Math.min(32, Math.max(0, time - (lastAutoScrollTimeRef.current ?? time - 16)))
    lastAutoScrollTimeRef.current = time
    if (insideList && y >= 0 && y < edgeSize) {
      scrollDelta = -(90 + 350 * (edgeSize - y) / edgeSize) * elapsed / 1000
    } else if (insideList && y <= window.innerHeight && window.innerHeight - y < edgeSize) {
      scrollDelta = (90 + 350 * (edgeSize - (window.innerHeight - y)) / edgeSize) * elapsed / 1000
    }
    const previousScrollY = window.scrollY
    if (scrollDelta) window.scrollBy({ top: scrollDelta, behavior: 'instant' })
    moveDragPreview(x, y)
    updateDropTargetAtPointer(x, y, activeDrag.questionId)
    if (scrollDelta && window.scrollY !== previousScrollY) scheduleQuestionDragFrame()
  }

  function scheduleQuestionDragFrame() {
    if (autoScrollFrameRef.current !== null) return
    autoScrollFrameRef.current = window.requestAnimationFrame(processQuestionDragFrame)
  }

  function handleQuestionPointerDown(event: ReactPointerEvent<HTMLButtonElement>, questionId: string) {
    if (event.button !== 0 || activeQuestionDragRef.current) return
    const pointerId = event.pointerId
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    const list = event.currentTarget.closest<HTMLElement>('.create-forms-questions')
    if (!list) return
    const handle = event.currentTarget
    const origin = { x: event.clientX, y: event.clientY }
    const questionsBounds = list.getBoundingClientRect()
    const handleBounds = event.currentTarget.getBoundingClientRect()
    dragHorizontalBoundsRef.current = {
      left: Math.min(questionsBounds?.left ?? handleBounds.left, handleBounds.left) - 8,
      right: questionsBounds?.right ?? handleBounds.right,
    }
    activeQuestionDragRef.current = { questionId, pointerId: event.pointerId, started: false }
    dragPointerPositionRef.current = { x: event.clientX, y: event.clientY }
    const startOrder = values.questions.map((question) => question.id)
    const startMidpoints = new Map<string, number>()
    document.querySelectorAll<HTMLElement>('.create-forms-question-item[data-question-id]').forEach((item) => {
      item.getAnimations().forEach((animation) => animation.cancel())
      if (item.dataset.questionId) {
        const bounds = item.getBoundingClientRect()
        startMidpoints.set(item.dataset.questionId, bounds.top + bounds.height / 2 + window.scrollY)
      }
    })
    dragStartQuestionOrderRef.current = startOrder
    dragStartMidpointsRef.current = startMidpoints
    previewQuestionOrderRef.current = startOrder
    dragOriginalIndexRef.current = values.questions.findIndex((question) => question.id === questionId)
    validDropRef.current = false

    const handlePointerMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId || !activeQuestionDragRef.current) return
      nativeEvent.preventDefault()
      const activeDrag = activeQuestionDragRef.current
      if (!activeDrag.started) {
        if (Math.hypot(nativeEvent.clientX - origin.x, nativeEvent.clientY - origin.y) < 6) return
        activeDrag.started = true
        handle.blur()
        window.scrollTo({ top: window.scrollY, behavior: 'instant' })
        document.documentElement.classList.add('create-forms-drag-active')
        createDragPreview(handle, origin)
        setDraggingQuestionId(questionId)
        setDropTarget(null)
      }
      dragPointerPositionRef.current = { x: nativeEvent.clientX, y: nativeEvent.clientY }
      scheduleQuestionDragFrame()
    }
    const handlePointerUp = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      dragPointerPositionRef.current = { x: nativeEvent.clientX, y: nativeEvent.clientY }
      if (activeQuestionDragRef.current?.started) {
        moveDragPreview(nativeEvent.clientX, nativeEvent.clientY)
        updateDropTargetAtPointer(nativeEvent.clientX, nativeEvent.clientY, questionId)
      }
      finishQuestionDrag(pointerId, true)
    }
    const handlePointerCancel = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId === pointerId) finishQuestionDrag(pointerId, false)
    }
    const handleScroll = () => scheduleQuestionDragFrame()
    const cancelDrag = () => finishQuestionDrag(pointerId, false)
    const handleKeyDown = (nativeEvent: KeyboardEvent) => {
      if (nativeEvent.key === 'Escape') { nativeEvent.preventDefault(); cancelDrag() }
    }
    const handleVisibility = () => { if (document.hidden) cancelDrag() }
    list.setPointerCapture(pointerId)
    list.addEventListener('lostpointercapture', cancelDrag)
    window.addEventListener('blur', cancelDrag)
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp, true)
    window.addEventListener('pointercancel', handlePointerCancel, true)
    window.addEventListener('scroll', handleScroll, true)
    dragListenersCleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp, true)
      window.removeEventListener('pointercancel', handlePointerCancel, true)
      window.removeEventListener('scroll', handleScroll, true)
      list.removeEventListener('lostpointercapture', cancelDrag)
      window.removeEventListener('blur', cancelDrag)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (list.hasPointerCapture(pointerId)) list.releasePointerCapture(pointerId)
    }
  }

  const questionsById = new Map(values.questions.map((question) => [question.id, question]))
  const renderedQuestions = previewQuestionOrder
    ? previewQuestionOrder.map((id) => questionsById.get(id)).filter((question): question is FormQuestion => Boolean(question))
    : values.questions
  return { renderedQuestions, recentlyMovedQuestionId, draggingQuestionId, dropTarget, handleQuestionPointerDown, moveQuestionByKeyboard }
}
