import ToggleSwitch from '../ToggleSwitch'
import ToolbarSelect from '../ToolbarSelect'
import AstroIcon from '../AstroIcon'
import CompactPurpleButton from '../CompactPurpleButton'
import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { FormQuestion, FormQuestionKind } from '../../types/forms'
import { animateRemoval } from '../../utils/animateRemoval'
import { otherOptionsLast } from '../../utils/forms'

interface CreateFormsQuestionCardProps {
  index: number
  question: FormQuestion
  onChange: (question: FormQuestion) => void
  onCopy: () => void
  onDelete: () => void
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onMove?: (direction: -1 | 1) => void
}

const nrOptions = [
  { value: '', label: 'Selecionar a NR', tone: 'muted' as const },
  ...Array.from({ length: 30 }, (_, index) => ({ value: `NR${index + 1}`, label: `NR${index + 1}` })),
]
const unitOptions = [
  { value: '', label: 'Selecionar a unidade', tone: 'muted' as const },
  { value: 'Sede 1', label: 'Sede 1' },
  { value: 'Sede 2', label: 'Sede 2' },
]
const fileCountOptions = Array.from({ length: 10 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }))
const fileSizeOptions = [5, 10, 20, 50, 100].map((size) => ({ value: String(size), label: `${size}MB` }))

function questionHeading(kind: FormQuestionKind, index: number) {
  if (kind === 'nr') return 'Qual NR será anexada?'
  if (kind === 'unit') return 'Qual unidade será anexada?'
  return `Pergunta ${index + 1}`
}


function CreateFormsQuestionCard({ index, question, onChange, onCopy, onDelete, onPointerDown, onMove }: CreateFormsQuestionCardProps) {
  const isAttachment = question.kind === 'nr' || question.kind === 'unit'
  const hasOtherOption = question.options.some((option) => option.isOther)
  const fieldId = `create-forms-question-${question.id}`
  const questionRef = useRef(question)
  const removingOptionIdsRef = useRef(new Set<string>())
  const [removingOptionId, setRemovingOptionId] = useState<string | null>(null)

  useLayoutEffect(() => {
    questionRef.current = question
  }, [question])

  function updateOption(id: string, value: string) {
    onChange({ ...question, options: question.options.map((option) => option.id === id ? { ...option, value } : option) })
  }

  function deleteOption(optionId: string) {
    if (question.options.length <= 2 || removingOptionIdsRef.current.size > 0) return
    removingOptionIdsRef.current.add(optionId)
    setRemovingOptionId(optionId)
    animateRemoval(document.getElementById(`create-forms-option-${optionId}`), () => {
      removingOptionIdsRef.current.delete(optionId)
      setRemovingOptionId(null)
      const currentQuestion = questionRef.current
      onChange({ ...currentQuestion, options: currentQuestion.options.filter((option) => option.id !== optionId) })
    }, true)
  }

  return (
    <section aria-label={questionHeading(question.kind, index)} className="create-forms-card create-forms-question-card">
      {onPointerDown && onMove && <>
        <button
        aria-label={`Arrastar ${questionHeading(question.kind, index)} para reordenar. Use Alt e as setas para mover pelo teclado.`}
        className="create-forms-drag-handle"
        onPointerDown={onPointerDown}
        onKeyDown={(event) => {
          if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
          event.preventDefault()
          onMove(event.key === 'ArrowUp' ? -1 : 1)
        }}
        title="Segure o ícone para arrastar. Use Alt + seta para cima ou para baixo."
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <circle cx="4" cy="3" r="1.35" />
          <circle cx="12" cy="3" r="1.35" />
          <circle cx="4" cy="8" r="1.35" />
          <circle cx="12" cy="8" r="1.35" />
          <circle cx="4" cy="13" r="1.35" />
          <circle cx="12" cy="13" r="1.35" />
        </svg>
        </button>
        <button
        aria-label={`Arrastar ${questionHeading(question.kind, index)} pela barra roxa superior. Use Alt e as setas para mover pelo teclado.`}
        className="create-forms-drag-bar-handle"
        onPointerDown={onPointerDown}
        onKeyDown={(event) => {
          if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
          event.preventDefault()
          onMove(event.key === 'ArrowUp' ? -1 : 1)
        }}
        title="Segure a barra roxa para arrastar. Use Alt + seta para cima ou para baixo."
        type="button"
        />
      </>}
      <div className="create-forms-question-header">
        <h2>{questionHeading(question.kind, index)}</h2>
        <div className="create-forms-question-actions">
          <button aria-label={`Duplicar ${questionHeading(question.kind, index)}`} onClick={onCopy} title="Duplicar" type="button"><img alt="" src="/icon/copy.svg" /></button>
          <button aria-label={`Excluir ${questionHeading(question.kind, index)}`} onClick={onDelete} title="Excluir" type="button"><img alt="" src="/icon/trash.svg" /></button>
        </div>
      </div>

      {isAttachment ? (
        <div className="create-forms-field">
          <span className="create-forms-label">{question.kind === 'nr' ? 'NR' : 'Unidade'}</span>
          <ToolbarSelect
            className="create-forms-select"
            label={question.kind === 'nr' ? 'Selecionar NR' : 'Selecionar unidade'}
            onValueChange={(answer) => onChange({ ...question, answer })}
            options={question.kind === 'nr' ? nrOptions : unitOptions}
            value={question.answer}
          />
        </div>
      ) : (
        <>
          <div className="create-forms-field">
            <label htmlFor={fieldId}>Pergunta</label>
            <input id={fieldId} maxLength={140} onChange={(event) => onChange({ ...question, title: event.target.value })} placeholder="Digite a sua pergunta" value={question.title} />
          </div>

          {question.kind === 'option' && <div className="create-forms-options">
            {otherOptionsLast(question.options).map((option, optionIndex) => (
              <div className="create-forms-option" id={`create-forms-option-${option.id}`} key={option.id}>
                <span aria-hidden="true" className="create-forms-option-radio" />
                {option.isOther ? <>
                  <label className="sr-only" htmlFor={`${fieldId}-option-${option.id}`}>Campo de resposta para outra opção</label>
                  <input className="create-forms-option-other-input" disabled id={`${fieldId}-option-${option.id}`} placeholder="Digite outra opção" />
                </> : <>
                  <label className="sr-only" htmlFor={`${fieldId}-option-${option.id}`}>Opção {optionIndex + 1}</label>
                  <input id={`${fieldId}-option-${option.id}`} maxLength={80} onChange={(event) => updateOption(option.id, event.target.value)} placeholder={`Opção ${optionIndex + 1}`} value={option.value} />
                </>}
                <button aria-label={`Excluir opção ${option.isOther ? 'de resposta livre' : optionIndex + 1}`} disabled={question.options.length <= 2 || removingOptionId !== null} onClick={() => deleteOption(option.id)} type="button"><img alt="" src="/icon/trash.svg" /></button>
              </div>
            ))}
            <div className="create-forms-option-links">
              <button onClick={() => onChange({ ...question, options: otherOptionsLast([...question.options, { id: crypto.randomUUID(), value: '' }]) })} type="button">
                <span aria-hidden="true" className="create-forms-option-link-icon" />
                <span className="create-forms-option-link-label">Adicionar opção</span>
              </button>
              <button disabled={hasOtherOption} onClick={() => onChange({ ...question, options: [...question.options, { id: crypto.randomUUID(), value: '', isOther: true }] })} type="button">
                <span aria-hidden="true" className="create-forms-option-link-icon" />
                <span className="create-forms-option-link-label">Adicionar opção outros</span>
              </button>
            </div>
          </div>}

          {question.kind === 'text' && <div className="create-forms-field create-forms-answer-preview"><label htmlFor={`${fieldId}-answer`}>Resposta</label><input disabled id={`${fieldId}-answer`} placeholder="Digite sua resposta" /></div>}
          {question.kind === 'photo' && <>
            <CompactPurpleButton aria-label="Prévia do botão para carregar foto" className="create-forms-photo-upload" disabled>
              <AstroIcon name="upload" />
              <span>Carregar foto</span>
            </CompactPurpleButton>
            <div className="create-forms-photo-settings">
              <div className="create-forms-photo-setting">
                <span className="create-forms-label">Limite de arquivos:</span>
                <ToolbarSelect
                  className="create-forms-photo-select create-forms-photo-count-select"
                  label="Limite de arquivos"
                  onValueChange={(maxFiles) => onChange({ ...question, maxFiles: Number(maxFiles) })}
                  options={fileCountOptions}
                  searchable={false}
                  value={String(question.maxFiles ?? 1)}
                />
              </div>
              <div className="create-forms-photo-setting create-forms-photo-size-setting">
                <span className="create-forms-label">Limite de tamanho<br />de arquivo único:</span>
                <ToolbarSelect
                  className="create-forms-photo-select create-forms-photo-size-select"
                  label="Limite de tamanho por arquivo"
                  onValueChange={(maxFileSizeMb) => onChange({ ...question, maxFileSizeMb: Number(maxFileSizeMb) })}
                  options={fileSizeOptions}
                  searchable={false}
                  value={String(question.maxFileSizeMb ?? 10)}
                />
              </div>
            </div>
          </>}
          {question.kind === 'date' && <div className="create-forms-field create-forms-answer-preview"><label htmlFor={`${fieldId}-answer`}>Resposta</label><div className="create-forms-answer-date-control"><input disabled id={`${fieldId}-answer`} placeholder="dd/mm/aaaa" /><AstroIcon name="calendar" /></div></div>}

          <div className="create-forms-question-footer">
            {question.kind === 'option' && <div className="create-forms-toggle-group">
              <ToggleSwitch checked={question.multiple} label={`Permitir várias respostas na pergunta ${index + 1}`} onChange={(multiple) => onChange({ ...question, multiple })} />
              <span>Várias respostas</span>
            </div>}
            <div className="create-forms-toggle-group">
              <ToggleSwitch checked={question.required} label={`Tornar a pergunta ${index + 1} obrigatória`} onChange={(required) => onChange({ ...question, required })} />
              <span>Obrigatória</span>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default CreateFormsQuestionCard
