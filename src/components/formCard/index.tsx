import type { MouseEvent } from 'react'
import AstroIcon from '../astroIcon'
import { formStatusLabels } from '../../data/forms'
import type { FormSummary } from '../../types/forms'

interface FormCardProps {
  form: FormSummary
  menuOpen: boolean
  onOpenMenu: (event: MouseEvent<HTMLButtonElement>) => void
}

function FormCard({ form, menuOpen, onOpenMenu }: FormCardProps) {
  return (
    <article aria-labelledby={`form-title-${form.id}`} className="form-card">
      <div className="form-card-heading">
        <span aria-hidden="true" className={`form-card-icon form-card-icon--${form.color}`}><AstroIcon name={form.icon} /></span>
        <div className="form-card-copy">
          <h2 id={`form-title-${form.id}`}>{form.name}</h2>
          <p>{form.description}</p>
        </div>
        <button aria-controls={menuOpen ? `form-options-${form.id}` : undefined} aria-expanded={menuOpen} aria-haspopup="menu" aria-label={`Opções para ${form.name}`} className="form-card-options" onClick={onOpenMenu} type="button">
          <span aria-hidden="true" className="form-card-options-dots"><i /><i /><i /></span>
        </button>
      </div>
      <div className="form-card-badges">
        <span>{form.questionCount} perguntas</span>
        <span className={`form-card-status form-card-status--${form.status}`}><i aria-hidden="true" />{formStatusLabels[form.status]}</span>
      </div>
    </article>
  )
}

export default FormCard
