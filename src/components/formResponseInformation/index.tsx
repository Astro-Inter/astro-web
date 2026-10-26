import type { FormReviewData } from '../../types/formReview'
import { formatResponseDate } from '../../utils/formReview'

interface FormResponseInformationProps { data: FormReviewData }

export default function FormResponseInformation({ data }: FormResponseInformationProps) {
  const { form } = data
  const fields = [
    ['Nome do formulário', form.title || 'Formulário sem título'],
    ['Descrição do formulário', form.description || 'Sem descrição.'],
    ['Gestor destinatário', data.recipientName],
    ['NR (opcional)', form.nrCode ? `NR ${form.nrCode}` : 'Não informada'],
    ['Unidade (opcional)', data.unitName],
    ['Data limite (opcional)', formatResponseDate(form.dueDate)],
  ]
  return <section className="create-forms-card form-review-overview" aria-labelledby="review-form-title">
    <h2 id="review-form-title">Informações iniciais</h2>
    <dl className="form-response-information">
      {fields.map(([label, value]) => <div className="create-forms-field" key={label}>
        <dt className="create-forms-label">{label}</dt><dd className="form-response-value">{value}</dd>
      </div>)}
    </dl>
    <dl className="form-review-metadata">
      <div><dt>Enviado por</dt><dd>{data.senderName}</dd></div>
      <div><dt>Respondido em</dt><dd>{form.respondedAt ? formatResponseDate(form.respondedAt, true) : 'Aguardando resposta'}</dd></div>
    </dl>
  </section>
}
