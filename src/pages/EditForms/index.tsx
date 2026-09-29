import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { animateRemoval } from '../../utils/animateRemoval'
import type { CreateFormValues, FormQuestion, FormQuestionKind } from '../../types/forms'

function createMockEditForm(): CreateFormValues {
  return {
    name: 'Inspeção de segurança do trabalho',
    description: 'Identificação de riscos e ações preventivas no local de trabalho.',
    manager: 'Gerente',
    nr: 'NR1',
    unit: 'Sede 2',
    deadline: '2026-10-30',
    questions: [
      {
        id: 'edit-form-risk-question',
        kind: 'option',
        title: 'Você identificou algum risco na área inspecionada?',
        answer: '',
        options: [
          { id: 'edit-form-risk-yes', value: 'Sim' },
          { id: 'edit-form-risk-no', value: 'Não' },
          { id: 'edit-form-risk-other', value: '', isOther: true },
        ],
        multiple: false,
        required: true,
      },
      {
        id: 'edit-form-risk-description',
        kind: 'text',
        title: 'Descreva o risco ou a condição encontrada.',
        answer: '',
        options: [],
        multiple: false,
        required: false,
      },
      {
        id: 'edit-form-risk-photo',
        kind: 'photo',
        title: 'Envie uma foto do local inspecionado.',
        answer: '',
        options: [],
        multiple: false,
        required: false,
        maxFiles: 3,
        maxFileSizeMb: 10,
      },
      {
        id: 'edit-form-inspection-date',
        kind: 'date',
        title: 'Qual foi a data da última inspeção?',
        answer: '',
        options: [],
        multiple: false,
        required: true,
      },
    ],
  }
}


function EditFormsPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<CreateFormValues>(createMockEditForm)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [showBackConfirmation, setShowBackConfirmation] = useState(false)
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [feedback, setFeedback] = useState('')
  const [deadlineValid, setDeadlineValid] = useState(true)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const pendingQuestionIdRef = useRef<string | null>(null)
  const removingQuestionIdsRef = useRef(new Set<string>())
  const { closing: menuClosing, requestClose: requestMenuClose } = useAnimatedClose(160)

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
    setFeedback('')
  }

  function updateQuestion(nextQuestion: FormQuestion) {
    setValues((current) => ({
      ...current,
      questions: current.questions.map((question) => question.id === nextQuestion.id ? nextQuestion : question),
    }))
    setFeedback('')
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
    setFeedback('')
  }

  function deleteQuestion(questionId: string) {
    if (removingQuestionIdsRef.current.has(questionId)) return
    removingQuestionIdsRef.current.add(questionId)
    animateRemoval(document.getElementById(`edit-forms-card-${questionId}`), () => {
      removingQuestionIdsRef.current.delete(questionId)
      setValues((current) => ({ ...current, questions: current.questions.filter((question) => question.id !== questionId) }))
      setFeedback('')
    })
  }

  function saveChanges() {
    const validationError = validateForm(values, deadlineValid)
    if (validationError) return validationError
    setValues((current) => ({ ...current, name: current.name.trim() }))
    setFeedback('Alterações salvas no formulário de demonstração.')
    return null
  }

  return (
    <div className="create-forms-page edit-forms-page astro-scale-90">
      <button
        aria-controls="edit-forms-options"
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

      <main className="create-forms-main edit-forms-main">
        <h1>Editar formulário</h1>
        <form noValidate onSubmit={(event) => { event.preventDefault(); setShowSaveConfirmation(true) }}>
          <section aria-labelledby="edit-forms-initial-title" className="create-forms-card">
            <h2 id="edit-forms-initial-title">Informações do formulário</h2>
            <div className="create-forms-field"><label htmlFor="edit-forms-name">Nome do formulário</label><input id="edit-forms-name" maxLength={100} onChange={(event) => { setValues((current) => ({ ...current, name: event.target.value })); setFeedback('') }} value={values.name} /></div>
            <div className="create-forms-field"><label htmlFor="edit-forms-description">Descrição do formulário</label><input id="edit-forms-description" maxLength={240} onChange={(event) => { setValues((current) => ({ ...current, description: event.target.value })); setFeedback('') }} value={values.description} /></div>
            <div className="create-forms-field"><span className="create-forms-label">Gestor</span><ToolbarSelect className="create-forms-select" label="Gestor" onValueChange={(manager) => { setValues((current) => ({ ...current, manager })); setFeedback('') }} options={managerOptions} value={values.manager} /></div>
            <div className="create-forms-field"><span className="create-forms-label">NR (opcional)</span><ToolbarSelect className="create-forms-select" label="NR (opcional)" onValueChange={(nr) => { setValues((current) => ({ ...current, nr })); setFeedback('') }} options={nrOptions} value={values.nr} /></div>
            <div className="create-forms-field"><span className="create-forms-label">Unidade (opcional)</span><ToolbarSelect className="create-forms-select" label="Unidade (opcional)" onValueChange={(unit) => { setValues((current) => ({ ...current, unit })); setFeedback('') }} options={unitOptions} value={values.unit} /></div>
            <div className="create-forms-field"><label htmlFor="edit-forms-deadline">Data limite (opcional)</label><CreateFormsDatePicker id="edit-forms-deadline" label="Data limite" onChange={(deadline) => { setValues((current) => ({ ...current, deadline })); setFeedback('') }} onValidityChange={setDeadlineValid} value={values.deadline} /></div>
          </section>

          <div aria-label="Perguntas do formulário" className="create-forms-questions" role="list">
            {values.questions.map((question, index) => (
              <div
                className="create-forms-question-item"
                data-question-id={question.id}
                id={`edit-forms-card-${question.id}`}
                key={question.id}
                role="listitem"
                tabIndex={-1}
              >
                <CreateFormsQuestionCard
                  index={values.questions.slice(0, index).filter((item) => !['nr', 'unit'].includes(item.kind)).length}
                  onChange={updateQuestion}
                  onCopy={() => copyQuestion(question, index)}
                  onDelete={() => deleteQuestion(question.id)}
                  question={question}
                />
              </div>
            ))}
          </div>

          {feedback && <p className="edit-forms-feedback" role="status">{feedback}</p>}

          <div className="create-forms-footer edit-forms-footer">
            <button className="create-forms-add-question" onClick={() => setShowAddQuestion(true)} type="button">
              <svg aria-hidden="true" className="create-forms-add-question-icon" fill="none" viewBox="0 0 27 27"><path d="M13.2 7.35V19.05M19.05 13.2H7.35M5.4 24.9H21C23.1539 24.9 24.9 23.1539 24.9 21V5.4C24.9 3.24609 23.1539 1.5 21 1.5H5.4C3.24609 1.5 1.5 3.24609 1.5 5.4V21C1.5 23.1539 3.24609 24.9 5.4 24.9Z" stroke="currentColor" strokeLinecap="round" strokeWidth="3" /></svg>
              Adicionar pergunta
            </button>
            <PurpleButton type="submit"><img alt="" src="/icon/paper5.svg" />Salvar alterações</PurpleButton>
          </div>
        </form>
      </main>

      {menuOpen && createPortal(<OptionsPopup
        ariaLabel="Opções do formulário"
        closing={menuClosing}
        id="edit-forms-options"
        items={[
          { id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => closeMenu() },
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
        className="create-forms-exit-modal edit-forms-back-modal"
        confirmLabel="Sair"
        icon={<span aria-hidden="true" className="position-deactivation-icon"><img alt="" src="/icon/error-information.svg" /></span>}
        onCancel={() => setShowBackConfirmation(false)}
        onConfirm={() => null}
        onConfirmed={() => navigate('/createForms')}
        title="Tem certeza de que deseja voltar? As alterações não serão salvas."
        tone="danger"
      />}
      {showSaveConfirmation && <ConfirmationModal
        backdrop="dimmed"
        preservePageScroll
        className="edit-forms-save-modal"
        confirmLabel="Salvar"
        onCancel={() => setShowSaveConfirmation(false)}
        onConfirm={saveChanges}
        onConfirmed={() => setShowSaveConfirmation(false)}
        title="Deseja salvar as alterações deste formulário?"
      />}
      <HelpLink />
    </div>
  )
}

export default EditFormsPage
