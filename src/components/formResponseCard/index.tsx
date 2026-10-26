import AstroIcon from '../astroIcon'
import { answerText, formatResponseDate, responseFiles, selectedOptionIds } from '../../utils/formReview'
import type { FormQuestionResponse } from '../../types/forms'
import type { FormResponseFile } from '../../types/formReview'

interface FormResponseCardProps { question: FormQuestionResponse; number: number; onOpenPhoto: (file: FormResponseFile) => void }
const typeLabels = { texto: 'Texto', alternativa: 'Alternativa', foto: 'Foto', data: 'Data' }
function FormResponseCard({ question, number, onOpenPhoto }: FormResponseCardProps) {
  const text = answerText(question)
  const selected = selectedOptionIds(question)
  const files = responseFiles(question)
  const hasAnswer = question.answer.length > 0
  return <article className="create-forms-card create-forms-question-card form-response-card" aria-labelledby={`response-question-${question.id}`}>
    <header className="create-forms-question-header form-response-question-heading">
      <div><h2>Pergunta {number}</h2><p className="form-response-kind">{typeLabels[question.type]}<span aria-hidden="true"> · </span>{question.required ? 'Obrigatória' : 'Opcional'}</p></div>
      {hasAnswer && <span className="form-response-filled"><AstroIcon name="check" /><span>Respondida</span></span>}
    </header>
    <h3 className="create-forms-label" id={`response-question-${question.id}`}>{question.question || 'Pergunta sem título'}</h3>
    {!hasAnswer ? <p className="form-response-empty">Esta pergunta não foi respondida.</p>
      : question.type === 'alternativa' ? <ul className="form-response-options" aria-label="Alternativas da pergunta">
        {(question.options ?? []).map(option => <li key={option.id} className={selected.includes(option.id) ? 'is-selected' : ''}>
          <span className={`form-response-choice${question.multiple ? ' event-create-checkbox-box form-response-choice--multiple' : ' form-response-choice--single'}`} aria-hidden="true">{question.multiple && selected.includes(option.id) && <AstroIcon name="check" />}</span>
          <span>{option.text}</span>{selected.includes(option.id) && <span className="form-response-option-label">Selecionada</span>}
        </li>)}
        {selected.length === 0 && <li>Resposta enviada em um formato que ainda não pode ser exibido.</li>}
      </ul> : question.type === 'foto' ? <div className="form-response-files">
        {files.map(file => <button key={file.id} className="form-response-file" type="button" onClick={() => onOpenPhoto(file)} aria-label={`Ver arquivo ${file.name}`}>
          <span className="form-response-file-preview">{file.url ? <img src={file.url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <AstroIcon name="document" />}</span>
          <span className="form-response-file-name">{file.name}<small>{file.url ? 'Visualizar imagem' : 'Registro de arquivo'}</small></span><AstroIcon name="eye" />
        </button>)}
        {!files.length && <p>Não foi possível exibir os arquivos desta resposta.</p>}
      </div> : <div className={`form-response-value${question.type === 'data' ? ' form-response-value--date' : ''}`}>
        {question.type === 'data' && <AstroIcon name="calendar" />}
        {text.length ? text.map((value, index) => <p key={`${question.id}-${index}`}>{question.type === 'data' ? formatResponseDate(value) : value}</p>)
          : <p>Resposta enviada em um formato que ainda não pode ser exibido.</p>}
      </div>}
  </article>
}
export default FormResponseCard
