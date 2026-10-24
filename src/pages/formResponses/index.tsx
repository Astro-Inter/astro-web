import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppSidebar from '../../components/appSidebar'
import AstroIcon from '../../components/astroIcon'
import CompactPurpleButton from '../../components/compactPurpleButton'
import ConfirmationModal from '../../components/confirmationModal'
import AppModal from '../../components/appModal'
import ApiContentSkeleton from '../../components/apiContentSkeleton'
import FormResponseCard from '../../components/formResponseCard'
import FormRejectionModal from '../../components/formRejectionModal'
import FormReviewPanel from '../../components/formReviewPanel'
import { useFormReview } from '../../hooks/useFormReview'
import { answeredQuestionCount, formatResponseDate, reviewStatusLabels } from '../../utils/formReview'
import type { FormResponseFile, FormReviewStatus } from '../../types/formReview'

const previewStates: FormReviewStatus[] = ['awaiting_review', 'approved', 'rejected', 'awaiting_response']
function FormResponsesPage() {
  const [params] = useSearchParams()
  const preview = import.meta.env.DEV && params.get('preview') === '1'
  const scenario = previewStates.find(status => status === params.get('state')) ?? 'awaiting_review'
  const { data, error, loading, retry, decide, canReview } = useFormReview(params.get('id'), preview, scenario)
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null)
  const [photo, setPhoto] = useState<FormResponseFile | null>(null)
  const decisionTitleRef = useRef<HTMLHeadingElement>(null)
  const form = data?.form
  const review = data?.review
  const actionsAvailable = preview && canReview
  function closeDecision() { setDialog(null); requestAnimationFrame(() => decisionTitleRef.current?.focus()) }
  return <div className="main-position-screen form-responses-screen">
    <AppSidebar />
    <main className="position-main form-responses-main" id="conteudo-principal" data-track-page={true}>
      <div className="position-content astro-scale-90 form-responses-content">
        <header className="position-heading form-review-heading">
          <Link className="payment-back-button form-review-back" aria-label="Voltar aos formulários" title="Voltar aos formulários" to="/mainFormScreen"><AstroIcon name="back" /></Link>
          <div><h1>Respostas do formulário</h1><p>Confira as respostas do gestor e avalie a validade do formulário.</p></div>
        </header>
        {loading && <ApiContentSkeleton label="Carregando respostas do formulário" variant="cards" cardCount={2} />}
        {error && <section className="form-review-load-error" role="alert"><AstroIcon name="warning-circle" /><h2>Não foi possível abrir as respostas</h2><p>{error}</p>
          <CompactPurpleButton auto type="button" onClick={retry}><AstroIcon name="reload" />Tentar novamente</CompactPurpleButton></section>}
        {!loading && !error && data && form && review && <>
          <section className="form-review-overview" aria-labelledby="review-form-title">
            <div className="form-review-overview-title"><span className="form-card-icon form-card-icon--purple form-review-document-icon"><AstroIcon name="document" /></span><div><h2 id="review-form-title">{form.title || 'Formulário sem título'}</h2><p>{form.description || 'Sem descrição.'}</p></div>
              <div className="form-card-badges form-review-badges"><span className={`form-review-status form-review-status--${review.status}`}><i aria-hidden="true" />{reviewStatusLabels[review.status]}</span></div></div>
            <dl className="form-review-metadata"><div><dt>Gestor destinatário</dt><dd><AstroIcon name="person-outline" />{data.recipientName}</dd></div>
              <div><dt>Unidade</dt><dd><AstroIcon name="building" />{data.unitName}</dd></div><div><dt>Enviado por</dt><dd>{data.senderName}</dd></div>
              <div><dt>Respondido em</dt><dd>{form.respondedAt ? formatResponseDate(form.respondedAt, true) : 'Aguardando resposta'}</dd></div>
              <div><dt>Norma relacionada</dt><dd>{form.nrCode ? `NR ${form.nrCode}` : 'Não informada'}</dd></div><div><dt>Prazo de resposta</dt><dd>{formatResponseDate(form.dueDate)}</dd></div></dl>
          </section>
          <div className="form-review-layout">
            <section className="form-responses-list" aria-labelledby="responses-list-title"><header className="form-responses-list-heading"><h2 id="responses-list-title">Respostas enviadas</h2><span>{answeredQuestionCount(form.questions)} de {form.questions.length} respondidas</span></header>
              {form.questions.map((question, index) => <FormResponseCard key={question.id} question={question} number={index + 1} onOpenPhoto={setPhoto} />)}
              {!form.questions.length && <p className="form-response-empty">Este formulário não possui perguntas.</p>}
            </section>
            <div className="form-review-sidebar">
              <FormReviewPanel review={review} recipientName={data.recipientName} answeredCount={answeredQuestionCount(form.questions)} questionCount={form.questions.length}
                actionsAvailable={actionsAvailable} titleRef={decisionTitleRef} onApprove={() => setDialog('approve')} onReject={() => setDialog('reject')}
                availabilityMessage={!preview && review.status === 'awaiting_review' ? canReview ? 'A gravação da análise ainda não está disponível neste ambiente.' : 'Apenas o remetente e o gestor do workspace podem validar as respostas.' : undefined} />
            </div>
          </div>
        </>}
      </div>
    </main>
    {dialog === 'approve' && data && <ConfirmationModal title="Aprovar este formulário?" confirmLabel="Confirmar aprovação" cancelLabel="Voltar à análise" backdrop="dimmed"
      description="Ao confirmar, as respostas serão consideradas válidas e a análise será encerrada. Esta decisão é definitiva."
      onCancel={closeDecision} onConfirm={() => { decide('approved'); return null }} onConfirmed={closeDecision} />}
    {dialog === 'reject' && data && <FormRejectionModal onCancel={closeDecision} onConfirm={description => decide('rejected', description)} />}
    {photo && <AppModal className="form-response-photo-modal" title={photo.name} onClose={() => setPhoto(null)}>
      {dismiss => <>{photo.url ? <img className="form-response-photo" src={photo.url} alt={`Registro enviado: ${photo.name}`} referrerPolicy="no-referrer" /> : <div className="form-response-photo-unavailable"><AstroIcon name="document" /><p>{preview ? 'Arquivo de exemplo para validar a apresentação dos anexos. Nenhuma imagem real foi carregada nesta prévia.' : 'O arquivo foi registrado, mas não possui uma imagem disponível para visualização.'}</p></div>}
        <div className="astro-modal-actions"><CompactPurpleButton auto type="button" onClick={dismiss}>Fechar visualização</CompactPurpleButton></div></>}
    </AppModal>}
  </div>
}
export default FormResponsesPage
