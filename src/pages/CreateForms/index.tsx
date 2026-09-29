import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import AddQuestionCreateFormsModal from '../../components/AddQuestionCreateFormsModal'
import { AstroBrand, AstroIcon } from '../../components'
import ConfirmationModal from '../../components/ConfirmationModal'
import CreateFormsDatePicker from '../../components/CreateFormsDatePicker'
import CreateFormsQuestionCard from '../../components/CreateFormsQuestionCard'
import HelpLink from '../../components/HelpLink'
import OptionsPopup from '../../components/OptionsPopup'
import PurpleButton from '../../components/PurpleButton'
import ToolbarSelect from '../../components/ToolbarSelect'
import { managerOptions, nrOptions, unitOptions } from '../../data/formOptions'
import { makeQuestion, validateForm } from '../../utils/forms'
import { animateRemoval } from '../../utils/animateRemoval'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import type { CreateFormValues, FormQuestion, FormQuestionKind } from '../../types/forms'


const initialValues: CreateFormValues = { name: '', description: '', manager: '', nr: '', unit: '', deadline: '', questions: [] }
type QuestionDropTarget = { id: string; position: 'before' | 'after' }

function CreateFormsPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<CreateFormValues>(initialValues)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [showBackConfirmation, setShowBackConfirmation] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null)
  const [recentlyMovedQuestionId, setRecentlyMovedQuestionId] = useState<string | null>(null)
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<QuestionDropTarget | null>(null)
  const [previewQuestionOrder, setPreviewQuestionOrder] = useState<string[] | null>(null)
  const [feedback, setFeedback] = useState('')
  const [deadlineValid, setDeadlineValid] = useState(true)
  const [error, setError] = useState('')
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const highlightTimerRef = useRef<number | null>(null)
  const movedQuestionTimerRef = useRef<number | null>(null)
  const activeQuestionDragRef = useRef<{ questionId: string; pointerId: number } | null>(null)
  const dragPointerPositionRef = useRef({ x: 0, y: 0 })
  const dragStartQuestionOrderRef = useRef<string[]>([])
  const dragQuestionMidpointsRef = useRef<Map<string, number>>(new Map())
  const dragHorizontalBoundsRef = useRef({ left: 0, right: 0 })
  const previewQuestionOrderRef = useRef<string[] | null>(null)
  const questionPositionsBeforeAnimationRef = useRef<Map<string, number> | null>(null)
  const dragPreviewElementRef = useRef<HTMLElement | null>(null)
  const dragPositionBadgeRef = useRef<HTMLDivElement | null>(null)
  const dragPreviewOffsetRef = useRef({ x: 0, y: 0 })
  const dragPreviewOriginRef = useRef({ x: 0, y: 0 })
  const dragOriginalIndexRef = useRef<number | null>(null)
  const pendingQuestionScrollIdRef = useRef<string | null>(null)
  const removingQuestionIdsRef = useRef(new Set<string>())
  const dragListenersCleanupRef = useRef<(() => void) | null>(null)
  const autoScrollFrameRef = useRef<number | null>(null)
  const { closing: menuClosing, requestClose: requestMenuClose } = useAnimatedClose(160)

  const closeMenu = useCallback((onFinished?: () => void) => {
    requestMenuClose(() => {
      setMenuOpen(false)
      onFinished?.()
      if (!onFinished) menuTriggerRef.current?.focus()
    })
  }, [requestMenuClose])

  useEffect(() => () => {
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current)
    if (movedQuestionTimerRef.current !== null) window.clearTimeout(movedQuestionTimerRef.current)
    if (autoScrollFrameRef.current !== null) window.cancelAnimationFrame(autoScrollFrameRef.current)
    dragListenersCleanupRef.current?.()
    dragPreviewElementRef.current?.remove()
    dragPositionBadgeRef.current?.remove()
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
  }, [previewQuestionOrder])

  useLayoutEffect(() => {
    const pendingQuestionScrollId = pendingQuestionScrollIdRef.current
    if (!pendingQuestionScrollId) return
    const questionCard = document.getElementById(`create-forms-card-${pendingQuestionScrollId}`)
    if (!questionCard) return
    pendingQuestionScrollIdRef.current = null
    questionCard.focus({ preventScroll: true })
    questionCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [values.questions])

  useEffect(() => {
    if (!menuOpen) return
    function closeOutside(event: PointerEvent) {
      if (!menuPanelRef.current?.contains(event.target as Node) && !menuTriggerRef.current?.contains(event.target as Node)) closeMenu()
    }
    function closeOnScroll() { closeMenu() }
    window.addEventListener('pointerdown', closeOutside)
    window.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('resize', closeOnScroll)
    return () => {
      window.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('resize', closeOnScroll)
    }
  }, [closeMenu, menuOpen])

  function openMenu() {
    if (menuOpen) { closeMenu(); return }
    const bounds = menuTriggerRef.current?.getBoundingClientRect()
    if (bounds) setMenuPosition({ top: bounds.bottom + 8, left: Math.max(8, bounds.left) })
    setMenuOpen(true)
  }

  function addQuestion(kind: FormQuestionKind) {
    const question = makeQuestion(kind)
    pendingQuestionScrollIdRef.current = question.id
    setValues((current) => ({ ...current, questions: [...current.questions, question] }))
    setHighlightedQuestionId(question.id)
    setShowAddQuestion(false)
    setError('')
    setFeedback('Pergunta adicionada.')
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = window.setTimeout(() => setHighlightedQuestionId(null), 900)
  }

  function updateQuestion(nextQuestion: FormQuestion) {
    setValues((current) => ({ ...current, questions: current.questions.map((question) => question.id === nextQuestion.id ? nextQuestion : question) }))
  }

  function moveQuestion(questionId: string, targetId: string, position: 'before' | 'after') {
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

  function deleteQuestion(questionId: string) {
    if (removingQuestionIdsRef.current.has(questionId)) return
    removingQuestionIdsRef.current.add(questionId)
    const questionElement = document.getElementById(`create-forms-card-${questionId}`)
    animateRemoval(questionElement, () => {
      removingQuestionIdsRef.current.delete(questionId)
      setValues((current) => ({ ...current, questions: current.questions.filter((question) => question.id !== questionId) }))
    })
  }

  function captureQuestionPositions() {
    const positions = new Map<string, number>()
    document.querySelectorAll<HTMLElement>('.create-forms-question-item[data-question-id]').forEach((item) => {
      if (item.dataset.questionId) positions.set(item.dataset.questionId, item.getBoundingClientRect().top)
    })
    return positions
  }

  function createDragPreview(event: ReactPointerEvent<HTMLButtonElement>) {
    const card = event.currentTarget.closest<HTMLElement>('.create-forms-question-card')
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
    dragPreviewOffsetRef.current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    dragPreviewOriginRef.current = { x: bounds.left, y: bounds.top }

    const badge = document.createElement('div')
    badge.className = 'create-forms-drag-position-badge'
    badge.setAttribute('aria-hidden', 'true')
    badge.textContent = 'Arraste para reordenar'
    document.body.append(badge)
    dragPositionBadgeRef.current = badge
    moveDragPositionBadge(event.clientX, event.clientY)
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
    const currentOrder = previewQuestionOrderRef.current
    const startOrder = dragStartQuestionOrderRef.current
    const dragBounds = dragHorizontalBoundsRef.current
    if (!currentOrder || !startOrder.length || x < dragBounds.left || x > dragBounds.right) {
      setDropTarget(null)
      if (currentOrder) updateDragPositionBadge(currentOrder, questionId)
      return
    }

    const remainingOrder = startOrder.filter((id) => id !== questionId)
    if (!remainingOrder.length) return
    const pointerDocumentY = y + window.scrollY
    let insertIndex = remainingOrder.findIndex((id) => pointerDocumentY < (dragQuestionMidpointsRef.current.get(id) ?? Number.POSITIVE_INFINITY))
    if (insertIndex < 0) insertIndex = remainingOrder.length

    const currentIndex = currentOrder.indexOf(questionId)
    const hysteresis = 12
    if (insertIndex < currentIndex) {
      const previousItemId = remainingOrder[currentIndex - 1]
      const threshold = previousItemId ? dragQuestionMidpointsRef.current.get(previousItemId) : undefined
      if (threshold !== undefined && pointerDocumentY > threshold - hysteresis) insertIndex = currentIndex
    } else if (insertIndex > currentIndex) {
      const nextItemId = remainingOrder[currentIndex]
      const threshold = nextItemId ? dragQuestionMidpointsRef.current.get(nextItemId) : undefined
      if (threshold !== undefined && pointerDocumentY < threshold + hysteresis) insertIndex = currentIndex
    }

    const nextOrder = [...remainingOrder]
    nextOrder.splice(insertIndex, 0, questionId)
    updateDragPositionBadge(nextOrder, questionId)
    const targetId = insertIndex < remainingOrder.length ? remainingOrder[insertIndex] : remainingOrder[remainingOrder.length - 1]
    const position: QuestionDropTarget['position'] = insertIndex < remainingOrder.length ? 'before' : 'after'
    const nextTarget = { id: targetId, position }
    setDropTarget((current) => current?.id === nextTarget.id && current.position === nextTarget.position ? current : nextTarget)
    if (nextOrder.every((id, index) => id === currentOrder[index])) return

    questionPositionsBeforeAnimationRef.current = captureQuestionPositions()
    previewQuestionOrderRef.current = nextOrder
    setPreviewQuestionOrder(nextOrder)
  }

  function finishQuestionDrag(pointerId: number, shouldMove: boolean) {
    const activeDrag = activeQuestionDragRef.current
    if (!activeDrag || activeDrag.pointerId !== pointerId) return
    const finalOrder = previewQuestionOrderRef.current
    const originalOrder = values.questions.map((question) => question.id)
    const orderChanged = finalOrder?.some((questionId, index) => questionId !== originalOrder[index]) ?? false
    if (shouldMove && finalOrder && orderChanged) {
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
    questionPositionsBeforeAnimationRef.current = captureQuestionPositions()
    activeQuestionDragRef.current = null
    previewQuestionOrderRef.current = null
    dragStartQuestionOrderRef.current = []
    dragQuestionMidpointsRef.current.clear()
    dragHorizontalBoundsRef.current = { left: 0, right: 0 }
    dragPreviewElementRef.current?.remove()
    dragPreviewElementRef.current = null
    dragPositionBadgeRef.current?.remove()
    dragPositionBadgeRef.current = null
    dragOriginalIndexRef.current = null
    dragListenersCleanupRef.current?.()
    dragListenersCleanupRef.current = null
    if (autoScrollFrameRef.current !== null) window.cancelAnimationFrame(autoScrollFrameRef.current)
    autoScrollFrameRef.current = null
    setDraggingQuestionId(null)
    setDropTarget(null)
    setPreviewQuestionOrder(null)
  }

  function processQuestionDragFrame() {
    autoScrollFrameRef.current = null
    const activeDrag = activeQuestionDragRef.current
    if (!activeDrag) return

    const { x, y } = dragPointerPositionRef.current
    const edgeSize = 76
    let scrollDelta = 0
    if (y < edgeSize) scrollDelta = -Math.max(1, Math.ceil((edgeSize - y) / 16))
    else if (window.innerHeight - y < edgeSize) scrollDelta = Math.max(1, Math.ceil((edgeSize - (window.innerHeight - y)) / 16))
    const previousScrollY = window.scrollY
    if (scrollDelta) window.scrollBy(0, scrollDelta)
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
    const questionsBounds = document.querySelector<HTMLElement>('.create-forms-questions')?.getBoundingClientRect()
    const handleBounds = event.currentTarget.getBoundingClientRect()
    dragHorizontalBoundsRef.current = {
      left: Math.min(questionsBounds?.left ?? handleBounds.left, handleBounds.left) - 8,
      right: questionsBounds?.right ?? handleBounds.right,
    }
    createDragPreview(event)
    activeQuestionDragRef.current = { questionId, pointerId: event.pointerId }
    dragPointerPositionRef.current = { x: event.clientX, y: event.clientY }
    const startOrder = values.questions.map((question) => question.id)
    dragStartQuestionOrderRef.current = startOrder
    dragQuestionMidpointsRef.current = new Map()
    document.querySelectorAll<HTMLElement>('.create-forms-question-item[data-question-id]').forEach((item) => {
      const questionId = item.dataset.questionId
      if (questionId) {
        const bounds = item.getBoundingClientRect()
        dragQuestionMidpointsRef.current.set(questionId, bounds.top + window.scrollY + bounds.height / 2)
      }
    })
    previewQuestionOrderRef.current = startOrder
    dragOriginalIndexRef.current = values.questions.findIndex((question) => question.id === questionId)
    setDraggingQuestionId(questionId)
    setDropTarget(null)

    const handlePointerMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId || !activeQuestionDragRef.current) return
      nativeEvent.preventDefault()
      dragPointerPositionRef.current = { x: nativeEvent.clientX, y: nativeEvent.clientY }
      scheduleQuestionDragFrame()
    }
    const handlePointerUp = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      dragPointerPositionRef.current = { x: nativeEvent.clientX, y: nativeEvent.clientY }
      moveDragPreview(nativeEvent.clientX, nativeEvent.clientY)
      updateDropTargetAtPointer(nativeEvent.clientX, nativeEvent.clientY, questionId)
      finishQuestionDrag(pointerId, true)
    }
    const handlePointerCancel = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId === pointerId) finishQuestionDrag(pointerId, false)
    }
    const handleScroll = () => scheduleQuestionDragFrame()
    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp, true)
    window.addEventListener('pointercancel', handlePointerCancel, true)
    window.addEventListener('scroll', handleScroll, true)
    dragListenersCleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp, true)
      window.removeEventListener('pointercancel', handlePointerCancel, true)
      window.removeEventListener('scroll', handleScroll, true)
    }
    scheduleQuestionDragFrame()
  }

  function saveDraft() {
    try {
      window.localStorage.setItem('astro-create-forms-draft', JSON.stringify({ _versao: 1, values }))
      setFeedback('Rascunho salvo neste navegador.')
      setError('')
    } catch {
      setError('Não foi possível salvar o rascunho neste navegador.')
    }
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateForm(values, deadlineValid)
    if (validationError) { setError(validationError); return }
    try {
      window.localStorage.setItem('astro-created-form', JSON.stringify({ _versao: 1, values: { ...values, name: values.name.trim() } }))
      window.localStorage.removeItem('astro-create-forms-draft')
      setError('')
      setFeedback('Formulário criado com sucesso neste navegador.')
    } catch {
      setError('Não foi possível salvar o formulário neste navegador.')
    }
  }

  const questionsById = new Map(values.questions.map((question) => [question.id, question]))
  const renderedQuestions = previewQuestionOrder
    ? previewQuestionOrder.map((questionId) => questionsById.get(questionId)).filter((question): question is FormQuestion => Boolean(question))
    : values.questions

  return (
    <div className="create-forms-page astro-scale-90">
      <button
        aria-controls="create-forms-options"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Voltar e abrir opções do formulário"
        className="payment-back-button"
        onClick={openMenu}
        ref={menuTriggerRef}
        type="button"
      >
        <AstroIcon name="back" />
      </button>
      <header className="create-password-header create-forms-header">
        <AstroBrand />
      </header>

      <main className="create-forms-main">
        <h1>Crie seu formulário</h1>
        <form noValidate onSubmit={submitForm}>
          <section aria-labelledby="create-forms-initial-title" className="create-forms-card">
            <h2 id="create-forms-initial-title">Informações iniciais</h2>
            <div className="create-forms-field"><label htmlFor="create-forms-name">Nome do formulário</label><input id="create-forms-name" maxLength={100} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} placeholder="Digite o nome do formulário" value={values.name} /></div>
            <div className="create-forms-field"><label htmlFor="create-forms-description">Descrição do formulário</label><input id="create-forms-description" maxLength={240} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} placeholder="Digite a descrição do formulário" value={values.description} /></div>
            <div className="create-forms-field"><span className="create-forms-label">Gestor</span><ToolbarSelect className="create-forms-select" label="Gestor" onValueChange={(manager) => setValues((current) => ({ ...current, manager }))} options={managerOptions} value={values.manager} /></div>
            <div className="create-forms-field"><span className="create-forms-label">NR (opcional)</span><ToolbarSelect className="create-forms-select" label="NR (opcional)" onValueChange={(nr) => setValues((current) => ({ ...current, nr }))} options={nrOptions} value={values.nr} /></div>
            <div className="create-forms-field"><span className="create-forms-label">Unidade (opcional)</span><ToolbarSelect className="create-forms-select" label="Unidade (opcional)" onValueChange={(unit) => setValues((current) => ({ ...current, unit }))} options={unitOptions} value={values.unit} /></div>
            <div className="create-forms-field"><label htmlFor="create-forms-deadline">Data limite (opcional)</label><CreateFormsDatePicker id="create-forms-deadline" label="Data limite" onChange={(deadline) => setValues((current) => ({ ...current, deadline }))} onValidityChange={setDeadlineValid} value={values.deadline} /></div>
          </section>

          <div aria-label="Perguntas do formulário" className="create-forms-questions" role="list">
            {renderedQuestions.map((question, index) => (
              <div
                className={[
                  'create-forms-question-item',
                  question.id === highlightedQuestionId ? 'create-forms-new-question' : '',
                  question.id === recentlyMovedQuestionId ? 'create-forms-question-item--moved' : '',
                  question.id === draggingQuestionId ? 'create-forms-question-item--dragging' : '',
                  dropTarget?.id === question.id ? `create-forms-question-item--drop-${dropTarget.position}` : '',
                ].filter(Boolean).join(' ')}
                id={`create-forms-card-${question.id}`}
                key={question.id}
                data-question-id={question.id}
                role="listitem"
                tabIndex={-1}
              >
                {dropTarget?.id === question.id && <span aria-hidden="true" className={`create-forms-drop-label create-forms-drop-label--${dropTarget.position}`}>
                  {dropTarget.position === 'before' ? 'Inserir antes' : 'Inserir depois'}
                </span>}
                <CreateFormsQuestionCard
                  index={renderedQuestions.slice(0, index).filter((item) => !['nr', 'unit'].includes(item.kind)).length}
                  onChange={updateQuestion}
                  onCopy={() => addQuestionCopy(question, index)}
                  onDelete={() => deleteQuestion(question.id)}
                  onPointerDown={(event) => handleQuestionPointerDown(event, question.id)}
                  onMove={(direction) => moveQuestionByKeyboard(question.id, direction)}
                  question={question}
                />
              </div>
            ))}
          </div>

          {error && <p className="sr-only" role="alert">{error}</p>}
          {feedback && <p className="sr-only" role="status">{feedback}</p>}

          <div className="create-forms-footer">
            <button className="create-forms-add-question" onClick={() => setShowAddQuestion(true)} type="button"><svg aria-hidden="true" className="create-forms-add-question-icon" fill="none" viewBox="0 0 27 27"><path d="M13.2 7.35V19.05M19.05 13.2H7.35M5.4 24.9H21C23.1539 24.9 24.9 23.1539 24.9 21V5.4C24.9 3.24609 23.1539 1.5 21 1.5H5.4C3.24609 1.5 1.5 3.24609 1.5 5.4V21C1.5 23.1539 3.24609 24.9 5.4 24.9Z" stroke="currentColor" strokeLinecap="round" strokeWidth="3" /></svg>Adicionar pergunta</button>
            <PurpleButton type="submit"><img alt="" src="/icon/paper5.svg" />Criar formulário</PurpleButton>
          </div>
        </form>
      </main>

      {menuOpen && createPortal(<OptionsPopup
        ariaLabel="Opções do formulário"
        closing={menuClosing}
        id="create-forms-options"
        items={[
          { id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => closeMenu() },
          { id: 'draft', label: 'Salvar rascunho', separatorAfter: true, onSelect: () => closeMenu(saveDraft) },
          { id: 'exit', label: 'Sair', tone: 'danger', onSelect: () => closeMenu(() => setShowBackConfirmation(true)) },
        ]}
        onClose={() => closeMenu()}
        panelRef={menuPanelRef}
        style={{ top: menuPosition.top, left: menuPosition.left }}
      />, document.body)}

      {showAddQuestion && <AddQuestionCreateFormsModal onCancel={() => setShowAddQuestion(false)} onChoose={addQuestion} />}
      {showBackConfirmation && <ConfirmationModal
        backdrop="dimmed"
        preservePageScroll
        className="create-forms-exit-modal"
        confirmLabel="Sair"
        icon={<span aria-hidden="true" className="position-deactivation-icon"><img alt="" src="/icon/error-information.svg" /></span>}
        onCancel={() => setShowBackConfirmation(false)}
        onConfirm={() => null}
        onConfirmed={() => navigate(-1)}
        title="Tem certeza de que deseja voltar? Você perderá todo o conteúdo realizado."
        tone="danger"
      />}
      <HelpLink />
    </div>
  )

  function addQuestionCopy(question: FormQuestion, index: number) {
    const copy = { ...question, id: crypto.randomUUID(), options: question.options.map((option) => ({ ...option, id: crypto.randomUUID() })) }
    setValues((current) => ({ ...current, questions: [...current.questions.slice(0, index + 1), copy, ...current.questions.slice(index + 1)] }))
    setHighlightedQuestionId(copy.id)
    setFeedback('Pergunta duplicada.')
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = window.setTimeout(() => setHighlightedQuestionId(null), 900)
  }
}

export default CreateFormsPage
