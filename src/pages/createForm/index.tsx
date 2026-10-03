import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import AddFormQuestionModal from '../../components/addFormQuestionModal'
import { AstroBrand, AstroIcon } from '../../components'
import ConfirmationModal from '../../components/confirmationModal'
import FormDatePicker from '../../components/formDatePicker'
import FormQuestionCard from '../../components/formQuestionCard'
import HelpLink from '../../components/helpLink'
import OptionsPopup from '../../components/optionsPopup'
import PurpleButton from '../../components/purpleButton'
import ToolbarSelect from '../../components/toolbarSelect'
import { managerOptions, nrOptions, unitOptions } from '../../data/formOptions'
import { makeQuestion } from '../../utils/forms'
import { animateRemoval } from '../../utils/animateRemoval'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { useQuestionReorder } from '../../hooks/useQuestionReorder'
import type { CreateFormValues, FormQuestion, FormQuestionKind } from '../../types/forms'


const initialValues: CreateFormValues = { name: '', description: '', manager: '', nr: '', unit: '', deadline: '', questions: [] }

function CreateFormPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<CreateFormValues>(initialValues)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [showBackConfirmation, setShowBackConfirmation] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const { requestClose: finishPageExit } = useAnimatedClose(180)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const highlightTimerRef = useRef<number | null>(null)
  const pendingQuestionScrollIdRef = useRef<string | null>(null)
  const removingQuestionIdsRef = useRef(new Set<string>())
  const { closing: menuClosing, requestClose: requestMenuClose } = useAnimatedClose()

  const { renderedQuestions, recentlyMovedQuestionId, draggingQuestionId, dropTarget, handleQuestionPointerDown, moveQuestionByKeyboard } = useQuestionReorder(values, setValues, setFeedback, setError)

  const closeMenu = useCallback((onFinished?: () => void) => {
    requestMenuClose(() => {
      setMenuOpen(false)
      onFinished?.()
      if (!onFinished) menuTriggerRef.current?.focus()
    })
  }, [requestMenuClose])

  useEffect(() => () => {
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current)
  }, [])

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

  function deleteQuestion(questionId: string) {
    if (removingQuestionIdsRef.current.has(questionId)) return
    removingQuestionIdsRef.current.add(questionId)
    const questionElement = document.getElementById(`create-forms-card-${questionId}`)
    animateRemoval(questionElement, () => {
      removingQuestionIdsRef.current.delete(questionId)
      setValues((current) => ({ ...current, questions: current.questions.filter((question) => question.id !== questionId) }))
    })
  }

  function saveDraft() {
    try {
      window.localStorage.setItem('astro-create-forms-draft', JSON.stringify({ _versao: 1, values }))
      setError('')
      setLeaving(true)
      finishPageExit(() => navigate('/mainFormScreen'))
    } catch {
      setError('Não foi possível salvar o rascunho neste navegador.')
    }
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLeaving(true)
    finishPageExit(() => navigate('/mainFormScreen'))
  }

  return (
    <div className={`create-forms-page astro-scale-90${leaving ? ' create-forms-page--leaving' : ''}`}>
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
            <div className="create-forms-field"><label htmlFor="create-forms-deadline">Data limite (opcional)</label><FormDatePicker id="create-forms-deadline" label="Data limite" onChange={(deadline) => setValues((current) => ({ ...current, deadline }))} validate={false} value={values.deadline} /></div>
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
                <FormQuestionCard
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
            <button className="create-forms-add-question" onClick={() => setShowAddQuestion(true)} type="button"><AstroIcon className="create-forms-add-question-icon" name="file-plus" />Adicionar pergunta</button>
            <PurpleButton type="submit"><AstroIcon name="file-plus" />Criar formulário</PurpleButton>
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

      {showAddQuestion && <AddFormQuestionModal onCancel={() => setShowAddQuestion(false)} onChoose={addQuestion} />}
      {showBackConfirmation && <ConfirmationModal
        backdrop="dimmed"
        preservePageScroll
        className="create-forms-exit-modal"
        confirmLabel="Sair"
        icon={<span aria-hidden="true" className="position-deactivation-icon"><AstroIcon name="warning" /></span>}
        onCancel={() => setShowBackConfirmation(false)}
        onConfirm={() => null}
        onConfirmed={() => {
          setShowBackConfirmation(false)
          setLeaving(true)
          finishPageExit(() => navigate('/mainFormScreen'))
        }}
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

export default CreateFormPage
