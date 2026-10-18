import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AddFormQuestionModal from '../../components/addFormQuestionModal'
import { AstroBrand, AstroIcon } from '../../components'
import ConfirmationModal from '../../components/confirmationModal'
import FormInformationFields from '../../components/formInformationFields'
import FormQuestionCard from '../../components/formQuestionCard'
import HelpLink from '../../components/helpLink'
import OptionsPopup from '../../components/optionsPopup'
import PurpleButton from '../../components/purpleButton'
import CompactPurpleButton from '../../components/compactPurpleButton'
import { useFormEditor } from '../../hooks/useFormEditor'
import { makeQuestion, validateAndSanitizeForm } from '../../utils/forms'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { useQuestionReorder } from '../../hooks/useQuestionReorder'
import { animateRemoval } from '../../utils/animateRemoval'
import type { FormQuestion, FormQuestionKind } from '../../types/forms'

function EditFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const formId = searchParams.get('id') ?? ''
  const { values, setValues, options, detail, loading, error: loadError, saving, locked, retry, retryManagers, save } = useFormEditor(formId)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [showBackConfirmation, setShowBackConfirmation] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const { requestClose: finishPageExit } = useAnimatedClose(180)
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)
  const [showReloadConfirmation, setShowReloadConfirmation] = useState(false)
  const [publish, setPublish] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [deadlineValid, setDeadlineValid] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })


  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const pendingQuestionIdRef = useRef<string | null>(null)
  const removingQuestionIdsRef = useRef(new Set<string>())
  const { closing: menuClosing, requestClose: requestMenuClose } = useAnimatedClose()

  const { renderedQuestions, recentlyMovedQuestionId, draggingQuestionId, dropTarget, handleQuestionPointerDown, moveQuestionByKeyboard } = useQuestionReorder(values, setValues)

  const closeMenu = useCallback((onFinished?: () => void) => {
    requestMenuClose(() => {
      setMenuOpen(false)
      onFinished?.()
      if (!onFinished) menuTriggerRef.current?.focus()
    })
  }, [requestMenuClose])

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

  useLayoutEffect(() => {
    const pendingQuestionId = pendingQuestionIdRef.current
    if (!pendingQuestionId) return
    const questionCard = document.getElementById(`edit-forms-card-${pendingQuestionId}`)
    if (!questionCard) return
    pendingQuestionIdRef.current = null
    questionCard.focus({ preventScroll: true })
    questionCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [values.questions])

  function openMenu() {
    if (menuOpen) {
      closeMenu()
      return
    }
    const bounds = menuTriggerRef.current?.getBoundingClientRect()
    if (bounds) setMenuPosition({ top: bounds.bottom + 8, left: Math.max(8, bounds.left) })
    setMenuOpen(true)
  }

  function addQuestion(kind: FormQuestionKind) {
    const question = makeQuestion(kind)
    pendingQuestionIdRef.current = question.id
    setValues((current) => ({ ...current, questions: [...current.questions, question] }))
    setShowAddQuestion(false)

  }

  function updateQuestion(nextQuestion: FormQuestion) {
    setValues((current) => ({
      ...current,
      questions: current.questions.map((question) => question.id === nextQuestion.id ? nextQuestion : question),
    }))

  }

  function copyQuestion(question: FormQuestion, index: number) {
    const copy: FormQuestion = {
      ...question,
      id: crypto.randomUUID(),
      options: question.options.map((option) => ({ ...option, id: crypto.randomUUID() })),
    }
    pendingQuestionIdRef.current = copy.id
    setValues((current) => ({
      ...current,
      questions: [...current.questions.slice(0, index + 1), copy, ...current.questions.slice(index + 1)],
    }))

  }

  function deleteQuestion(questionId: string) {
    if (removingQuestionIdsRef.current.has(questionId)) return
    removingQuestionIdsRef.current.add(questionId)
    animateRemoval(document.getElementById(`edit-forms-card-${questionId}`), () => {
      removingQuestionIdsRef.current.delete(questionId)
      setValues((current) => ({ ...current, questions: current.questions.filter((question) => question.id !== questionId) }))

    })
  }

  function confirmSave(publishing = false) {
    if (loading || loadError || saving || locked || leaving) return
    if (removingQuestionIdsRef.current.size) { setValidationError('Aguarde a remoção da pergunta antes de salvar.'); return }
    if (!deadlineValid) { setValidationError('Informe uma data limite válida ou deixe o campo vazio.'); return }
    const validation = validateAndSanitizeForm(values, detail?.status === 'RASCUNHO' && !publishing)
    const message = Object.values(validation.errors)[0]
    setValidationError(message ?? '')
    if (message) return
    setValues(validation.values)
    setPublish(publishing)
    setShowSaveConfirmation(true)
  }

  return (
    <div className={`create-forms-page edit-forms-page astro-scale-90${leaving ? ' create-forms-page--leaving' : ''}`}>
      <button data-track-action={BUTTONS.comuns.acoes}
        aria-controls="edit-forms-options"
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

      <main data-track-page={true} className="create-forms-main edit-forms-main">
        <h1>Editar formulário</h1>
        {loading && <p role="status">Carregando formulário...</p>}
        {loadError && <div role="alert"><p>{loadError}</p><button type="button" onClick={retry}>Tentar novamente</button></div>}
        <div className="forms-editor-navigation">
        <CompactPurpleButton auto variant="outline" disabled={saving || leaving} onClick={() => {
          if (loading || loadError || locked) navigate('/mainFormScreen')
          else setShowBackConfirmation(true)
        }}><AstroIcon name="back" />Voltar aos formulários</CompactPurpleButton>
        {!loading && !loadError && <CompactPurpleButton auto variant="outline" disabled={saving || leaving} onClick={() => setShowReloadConfirmation(true)}><AstroIcon name="reload" />Recarregar formulário</CompactPurpleButton>}
        </div>
        {locked && <p role="status">Este formulário está concluído ou já recebeu respostas e está disponível somente para consulta.</p>}
        {saving && <p role="status">{publish ? 'Salvando e publicando formulário...' : 'Salvando formulário...'}</p>}
        <form data-track-submit={BUTTONS.comuns.salvar_alteracoes} noValidate onSubmit={(event) => {
          event.preventDefault()
          confirmSave()
        }}>
          {validationError && <p className="form-validation-error" role="alert">{validationError}</p>}
          <fieldset aria-label="Definição do formulário" className="forms-editor-fields" disabled={loading || !!loadError || saving || locked || leaving} aria-busy={loading || saving}>
          <section aria-labelledby="edit-forms-initial-title" className="create-forms-card">
            <h2 id="edit-forms-initial-title">Informações do formulário</h2>
            <FormInformationFields prefix="edit-forms" values={values} setValues={setValues} options={options} onDeadlineValidityChange={setDeadlineValid} onRetryManagers={retryManagers} />
          </section>

          <div aria-label="Perguntas do formulário" className="create-forms-questions" role="list">
            {renderedQuestions.map((question, index) => (
              <div
                className={["create-forms-question-item", question.id === recentlyMovedQuestionId ? "create-forms-question-item--moved" : "", question.id === draggingQuestionId ? "create-forms-question-item--dragging" : "", dropTarget?.id === question.id ? `create-forms-question-item--drop-${dropTarget.position}` : ""].filter(Boolean).join(" ")}
                data-question-id={question.id}
                id={`edit-forms-card-${question.id}`}
                key={question.id}
                role="listitem"
                tabIndex={-1}
              >
                <FormQuestionCard
                  index={renderedQuestions.slice(0, index).filter((item) => !['nr', 'unit'].includes(item.kind)).length}
                  onChange={updateQuestion}
                  onCopy={() => copyQuestion(question, index)}
                  onDelete={() => deleteQuestion(question.id)}
                  onPointerDown={(event) => handleQuestionPointerDown(event, question.id)}
                  onMove={(direction) => moveQuestionByKeyboard(question.id, direction)}
                  question={question}
                />
              </div>
            ))}
          </div>



          <div className="create-forms-footer edit-forms-footer">
            <button data-track-action={BUTTONS.comuns.adicionar_pergunta} className="create-forms-add-question" onClick={() => setShowAddQuestion(true)} type="button">
              <AstroIcon className="create-forms-add-question-icon" name="plus-square" />
              Adicionar pergunta
            </button>
            <PurpleButton data-track-action={BUTTONS.comuns.salvar_alteracoes} type="submit"><AstroIcon name="file-plus" />Salvar alterações</PurpleButton>
            {detail?.status === 'RASCUNHO' && <PurpleButton type="button" onClick={() => confirmSave(true)}>Publicar formulário</PurpleButton>}
          </div>
          </fieldset>
        </form>
      </main>

      {menuOpen && createPortal(<OptionsPopup trackingName={DIALOG_NAMES.acoes_formulario}
        ariaLabel="Opções do formulário"
        closing={menuClosing}
        id="edit-forms-options"
        items={[
          { trackingAction: BUTTONS.comuns.cancelar, id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => closeMenu() },
          { trackingAction: BUTTONS.comuns.sair, id: 'exit', label: 'Sair', tone: 'danger', onSelect: () => closeMenu(() => setShowBackConfirmation(true)) },
        ]}
        onClose={() => closeMenu()}
        panelRef={menuPanelRef}
        style={{ top: menuPosition.top, left: menuPosition.left }}
      />, document.body)}

      {showAddQuestion && <AddFormQuestionModal onCancel={() => setShowAddQuestion(false)} onChoose={addQuestion} />}
      {showReloadConfirmation && <ConfirmationModal
        backdrop="dimmed" preservePageScroll confirmLabel="Recarregar"
        title="Recarregar este formulário?"
        description="As alterações não salvas serão descartadas e os dados salvos serão carregados novamente."
        onCancel={() => setShowReloadConfirmation(false)} onConfirm={() => null}
        onConfirmed={() => { setShowReloadConfirmation(false); setValidationError(''); retry() }}
      />}
      {showBackConfirmation && <ConfirmationModal trackingName={DIALOG_NAMES.descartar_alteracoes_formulario}
        backdrop="dimmed"
        preservePageScroll
        className="create-forms-exit-modal edit-forms-back-modal"
        confirmLabel="Sair"
        icon={<span aria-hidden="true" className="position-deactivation-icon"><AstroIcon name="warning" /></span>}
        onCancel={() => setShowBackConfirmation(false)}
        onConfirm={() => null}
        onConfirmed={() => {
          setShowBackConfirmation(false)
          setLeaving(true)
          finishPageExit(() => navigate('/mainFormScreen'))
        }}
        title="Tem certeza de que deseja voltar? As alterações não serão salvas."
        tone="danger"
      />}
      {showSaveConfirmation && <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_alteracoes_formulario}
        backdrop="dimmed"
        preservePageScroll
        className="edit-forms-save-modal"
        confirmLabel={publish ? 'Publicar' : 'Salvar'}
        progressLabel={publish ? 'Salvando e publicando formulário...' : 'Salvando formulário...'}
        onCancel={() => setShowSaveConfirmation(false)}
        onConfirm={async () => { await save(false, publish); return null }}
        onConfirmed={() => {
          setShowSaveConfirmation(false)
          setLeaving(true)
          finishPageExit(() => navigate('/mainFormScreen', { state: { message: publish ? 'Formulário publicado.' : 'Formulário salvo.' } }))
        }}
        title={publish ? 'Deseja salvar e publicar este formulário?' : 'Deseja salvar as alterações deste formulário?'}
      />}
      <HelpLink />
    </div>
  )
}

export default EditFormPage
