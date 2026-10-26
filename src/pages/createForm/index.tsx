import ActionLoading from '../../components/actionLoading'
import { useActionFeedback } from '../../hooks/useActionFeedback'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import AddFormQuestionModal from '../../components/addFormQuestionModal'
import { AstroBrand, AstroIcon } from '../../components'
import ConfirmationModal from '../../components/confirmationModal'
import FormInformationFields from '../../components/formInformationFields'
import FormQuestionCard from '../../components/formQuestionCard'
import HelpLink from '../../components/helpLink'
import OptionsPopup from '../../components/optionsPopup'
import PurpleButton from '../../components/purpleButton'
import { makeQuestion, validateAndSanitizeForm } from '../../utils/forms'
import { useFormEditor } from '../../hooks/useFormEditor'
import { animateRemoval } from '../../utils/animateRemoval'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { useQuestionReorder } from '../../hooks/useQuestionReorder'
import type { FormQuestion, FormQuestionKind } from '../../types/forms'


function CreateFormPage() {
  const navigate = useNavigate()
  const { values, setValues, options, loading, error: loadError, saving, retry, retryManagers, save } = useFormEditor()
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [showBackConfirmation, setShowBackConfirmation] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const { requestClose: finishPageExit } = useAnimatedClose(180)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null)
  const setFeedback = useActionFeedback()
  const [error, setError] = useState('')
  const [deadlineValid, setDeadlineValid] = useState(true)
  const [validationAttempt, setValidationAttempt] = useState<{ values: typeof values; draft: boolean } | null>(null)
  const fieldErrors = validationAttempt?.values === values ? validateAndSanitizeForm(values, validationAttempt.draft).errors : {}
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

  async function persist(draft: boolean) {
    if (saving || leaving) return
    if (removingQuestionIdsRef.current.size) { setError('Aguarde a remoção da pergunta antes de salvar.'); return }
    setValidationAttempt({ values, draft })
    const validation = validateAndSanitizeForm(values, draft)
    if (validation.errors.questions) setFeedback(validation.errors.questions, 'error')
    if (!deadlineValid || Object.keys(validation.errors).length) return
    try {
      await save(draft)
      setError('')
      setLeaving(true)
      finishPageExit(() => navigate('/mainFormScreen', { state: { message: draft ? 'Rascunho salvo.' : 'Formulário criado.' } }))
    } catch (cause: unknown) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setFeedback(cause instanceof Error ? cause.message : 'Não foi possível salvar o formulário.', 'error')
    }
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void persist(false)
  }

  if (loading) return <div className="create-forms-page astro-scale-90" aria-busy="true"><ActionLoading /></div>

  return (
    <div className={`create-forms-page astro-scale-90${leaving ? ' create-forms-page--leaving' : ''}`}>
      <button data-track-action={BUTTONS.comuns.acoes}
        aria-controls="create-forms-options"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Voltar e abrir opções do formulário"
        className="payment-back-button"
        disabled={saving}
        onClick={openMenu}
        ref={menuTriggerRef}
        type="button"
      >
        <AstroIcon name="back" />
      </button>
      <header className="create-password-header create-forms-header">
        <AstroBrand />
      </header>

      <main data-track-page={true} className="create-forms-main">
        <h1>Crie seu formulário</h1>
        {loadError && <div role="alert"><p>{loadError}</p><button type="button" onClick={retry}>Tentar novamente</button><button type="button" onClick={() => navigate('/mainFormScreen')}>Voltar aos formulários</button></div>}
        <ActionLoading active={loading || options.managersLoading || saving} />
        <form hidden={loading} data-track-submit={BUTTONS.comuns.criar_forms} noValidate onSubmit={submitForm}>
          <fieldset aria-label="Definição do formulário" className="forms-editor-fields" disabled={loading || !!loadError || saving || leaving} aria-busy={loading || saving}>
          <section aria-labelledby="create-forms-initial-title" className="create-forms-card">
            <h2 id="create-forms-initial-title">Informações iniciais</h2>
            <FormInformationFields errors={fieldErrors} prefix="create-forms" values={values} setValues={setValues} options={options} onDeadlineValidityChange={setDeadlineValid} onRetryManagers={retryManagers} />
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
                  error={fieldErrors[`questions.${index}`]}
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

          {error && <p className="form-validation-error" role="alert">{error}</p>}

          <div className="create-forms-footer">
            <button data-track-action={BUTTONS.comuns.adicionar_pergunta} className="create-forms-add-question" onClick={() => setShowAddQuestion(true)} type="button"><AstroIcon className="create-forms-add-question-icon" name="plus-square" />Adicionar pergunta</button>
            <PurpleButton data-track-action={BUTTONS.comuns.criar_forms} type="submit"><AstroIcon name="file-plus" />Criar formulário</PurpleButton>
          </div>
          </fieldset>
        </form>
      </main>

      {menuOpen && createPortal(<OptionsPopup trackingName={DIALOG_NAMES.acoes_formulario}
        ariaLabel="Opções do formulário"
        closing={menuClosing}
        id="create-forms-options"
        items={[
          { trackingAction: BUTTONS.comuns.cancelar, id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => closeMenu() },
          { trackingAction: BUTTONS.comuns.salvar_rascunho, id: 'draft', label: 'Salvar rascunho', disabled: loading || !!loadError || saving || leaving, separatorAfter: true, onSelect: () => closeMenu(() => { void persist(true) }) },
          { trackingAction: BUTTONS.comuns.sair, id: 'exit', label: 'Sair', tone: 'danger', onSelect: () => closeMenu(() => setShowBackConfirmation(true)) },
        ]}
        onClose={() => closeMenu()}
        panelRef={menuPanelRef}
        style={{ top: menuPosition.top, left: menuPosition.left }}
      />, document.body)}

      {showAddQuestion && <AddFormQuestionModal onCancel={() => setShowAddQuestion(false)} onChoose={addQuestion} />}
      {showBackConfirmation && <ConfirmationModal trackingName={DIALOG_NAMES.descartar_alteracoes_formulario}
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
