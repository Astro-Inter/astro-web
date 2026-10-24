import type { RefObject } from 'react'
import AstroIcon from '../astroIcon'
import CompactPurpleButton from '../compactPurpleButton'
import { formatResponseDate, reviewStatusLabels } from '../../utils/formReview'
import type { FormReviewState } from '../../types/formReview'

interface FormReviewPanelProps {
  review: FormReviewState
  recipientName: string
  answeredCount: number
  questionCount: number
  actionsAvailable: boolean
  availabilityMessage?: string
  titleRef: RefObject<HTMLHeadingElement | null>
  onApprove: () => void
  onReject: () => void
}

function FormReviewPanel({ review, recipientName, answeredCount, questionCount, actionsAvailable, availabilityMessage, titleRef, onApprove, onReject }: FormReviewPanelProps) {
  const final = review.status === 'approved' || review.status === 'rejected'
  const title = review.status === 'approved' ? 'Formulário aprovado' : review.status === 'rejected' ? 'Formulário reprovado' : 'Validação do formulário'
  return <aside className={`form-review-decision form-review-decision--${review.status}`} aria-labelledby="review-decision-title">
    <header className="form-review-decision-heading">
      <span className="form-card-icon form-card-icon--purple form-review-decision-icon"><AstroIcon name={review.status === 'approved' ? 'check' : review.status === 'rejected' ? 'close' : 'document-lines'} /></span>
      <h2 id="review-decision-title" ref={titleRef} tabIndex={-1}>{title}</h2>
    </header>
    <div className="form-card-badges form-review-badges form-review-decision-status"><span className={`form-review-status form-review-status--${review.status}`}><i aria-hidden="true" />{reviewStatusLabels[review.status]}</span></div>
    <dl className="form-review-decision-summary">
      <div><dt>Gestor destinatário</dt><dd>{recipientName}</dd></div>
      <div><dt>Respostas recebidas</dt><dd>{answeredCount} de {questionCount}</dd></div>
    </dl>
    {final ? <>
      <p className="form-review-decision-copy">{review.status === 'approved' ? 'As respostas foram consideradas válidas. A análise deste formulário foi concluída.' : 'As respostas não foram consideradas válidas. Este formulário foi encerrado, sem novo envio.'}</p>
      {review.status === 'rejected' && <div className="form-review-rejection-description"><h3>Descrição da reprovação</h3><p>{review.description}</p></div>}
      <dl className="form-review-audit" role="status"><div><dt>Analisado por</dt><dd>{review.reviewerName}</dd></div><div><dt>Data da análise</dt><dd>{formatResponseDate(review.reviewedAt, true)}</dd></div></dl>
    </> : <>
      <p className="form-review-decision-copy">{review.status === 'awaiting_response' ? 'A análise estará disponível quando o gestor concluir o envio das respostas.' : 'Confira as respostas antes de registrar sua decisão.'}</p>
      <div className="form-review-decision-actions">
        <CompactPurpleButton type="button" disabled={!actionsAvailable} onClick={onApprove}><AstroIcon name="check" />Aprovar formulário</CompactPurpleButton>
        <CompactPurpleButton type="button" variant="outline" disabled={!actionsAvailable} onClick={onReject}><AstroIcon name="close" />Reprovar formulário</CompactPurpleButton>
      </div>
      {availabilityMessage && <p className="form-review-availability">{availabilityMessage}</p>}
    </>}
  </aside>
}

export default FormReviewPanel
