import { BUTTONS } from '../../gtm/buttons'
import type { MouseEvent } from 'react'
import AstroIcon from '../astroIcon'
import { formStatusLabels } from '../../data/forms'
import type { FormSummary } from '../../types/forms'
import FormCardSymbol from '../formCardSymbol'
import { reviewStatusLabels } from '../../utils/formReview'

interface FormCardProps {
  form: FormSummary
  menuOpen: boolean
  onOpen: () => void
  onOpenMenu: (event: MouseEvent<HTMLButtonElement>) => void
}

function FormCard({ form, menuOpen, onOpen, onOpenMenu }: FormCardProps) {
  return (
    <article aria-labelledby={`form-title-${form.id}`} className="form-card">
      <div className="form-card-heading">
        <FormCardSymbol appearance={form} />
        <div className="form-card-copy">
          <h2 id={`form-title-${form.id}`}><button type="button" className="form-card-open" aria-label={`Visualizar formulário ${form.name}`} onClick={onOpen}>{form.name}</button></h2>
          <p>{form.description}</p>
        </div>
        <button data-track-item={BUTTONS.comuns.acoes} aria-controls={menuOpen ? `form-options-${form.id}` : undefined} aria-expanded={menuOpen} aria-haspopup="menu" aria-label={`Opções para ${form.name}`} className="form-card-options" onClick={onOpenMenu} type="button">
          <AstroIcon className="form-card-options-dots" name="dots" />
        </button>
      </div>
      <div className="form-card-badges">
        <span>{form.questionCount} perguntas</span>
        {form.status !== 'completed' && <span className={`form-card-status form-card-status--${form.status}`}><i aria-hidden="true" />{formStatusLabels[form.status]}</span>}
        {form.status === 'completed' && <span role="status" className={`form-card-status form-card-status--${form.reviewStatus ?? 'unavailable'}`}>
          <i aria-hidden="true" />{form.reviewStatus ? reviewStatusLabels[form.reviewStatus] : 'Análise indisponível'}
        </span>}
      </div>
    </article>
  )
}

export default FormCard
