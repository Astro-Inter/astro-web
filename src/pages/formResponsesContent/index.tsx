import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ActionLoading from '../../components/actionLoading'
import AppModal from '../../components/appModal'
import AstroBrand from '../../components/astroBrand'
import AstroIcon from '../../components/astroIcon'
import CompactPurpleButton from '../../components/compactPurpleButton'
import ConfirmationModal from '../../components/confirmationModal'
import FormRejectionModal from '../../components/formRejectionModal'
import FormResponseCard from '../../components/formResponseCard'
import FormResponseInformation from '../../components/formResponseInformation'
import FormReviewPanel from '../../components/formReviewPanel'
import HelpLink from '../../components/helpLink'
import { useFormResponseImage } from '../../hooks/useFormResponseImage'
import { useFormReview } from '../../hooks/useFormReview'
import type { FormResponseFile, FormReviewStatus } from '../../types/formReview'
import { answeredQuestionCount } from '../../utils/formReview'

const previewStates: FormReviewStatus[] = ['awaiting_review', 'approved', 'rejected', 'awaiting_response']
function FormResponsesContent() {
  const [params] = useSearchParams()
  const preview = import.meta.env.DEV && params.get('preview') === '1'
  const scenario = previewStates.find(status => status === params.get('state')) ?? 'awaiting_review'
  const { data, error, loading, retry, decide, canReview, submitting, decisionError } = useFormReview(params.get('id'), preview, scenario)
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null)
  const [photo, setPhoto] = useState<FormResponseFile | null>(null)
  const decisionTitleRef = useRef<HTMLHeadingElement>(null)
  const form = data?.form
  const review = data?.review
  const actionsAvailable = canReview && !submitting
  const image = useFormResponseImage(form?.id ?? null, photo, preview)
  const activeDialog = review?.status === 'awaiting_review' ? dialog : null
  useEffect(() => {
    if (dialog && (review?.status === 'approved' || review?.status === 'rejected')) {
      requestAnimationFrame(() => decisionTitleRef.current?.focus())
    }
  }, [dialog, review?.status])
  function closeDecision() { setDialog(null); requestAnimationFrame(() => decisionTitleRef.current?.focus()) }
  if (loading) return <div className="create-forms-page astro-scale-90" aria-busy="true"><ActionLoading /></div>
  return <div className="create-forms-page form-responses-screen astro-scale-90">
    <Link className="payment-back-button" aria-label="Voltar aos formulários" title="Voltar aos formulários" to="/mainFormScreen"><AstroIcon name="back" /></Link>
    <header className="create-password-header create-forms-header"><AstroBrand /></header>
    <main className="create-forms-main form-responses-main" id="conteudo-principal" data-track-page={true}>
      <h1>Respostas do formulário</h1>
        {error && <section className="create-forms-card form-review-load-error" role="alert"><AstroIcon name="warning-circle" /><h2>Não foi possível abrir as respostas</h2><p>{error}</p>
          <CompactPurpleButton auto type="button" onClick={retry}><AstroIcon name="reload" />Tentar novamente</CompactPurpleButton></section>}
        {!activeDialog && decisionError && <p className="form-review-load-error" role="alert">{decisionError}</p>}
        {!loading && !error && data && form && review && <>
          <FormResponseInformation data={data} />
          <div className="form-review-layout">
            <section className="form-responses-list" aria-labelledby="responses-list-title"><header className="form-responses-list-heading"><h2 className="astro-card-title" id="responses-list-title">Respostas enviadas</h2><span>{answeredQuestionCount(form.questions)} de {form.questions.length} respondidas</span></header>
              {form.questions.map((question, index) => <FormResponseCard key={question.id} question={question} number={index + 1} onOpenPhoto={setPhoto} />)}
              {!form.questions.length && <p className="form-response-empty">Este formulário não possui perguntas.</p>}
            </section>
            <div className="form-review-sidebar">
              <FormReviewPanel review={review} recipientName={data.recipientName} answeredCount={answeredQuestionCount(form.questions)} questionCount={form.questions.length}
                actionsAvailable={actionsAvailable} titleRef={decisionTitleRef} onApprove={() => setDialog('approve')} onReject={() => setDialog('reject')}
                availabilityMessage={!canReview && review.status === 'awaiting_review' ? 'Apenas o remetente e o gestor do workspace podem validar as respostas.' : undefined} />
            </div>
          </div>
        </>}
    </main>
    <HelpLink />
    {activeDialog === 'approve' && data && <ConfirmationModal title="Aprovar este formulário?" confirmLabel="Confirmar aprovação" cancelLabel="Voltar à análise" backdrop="dimmed"
      description="Ao confirmar, as respostas serão consideradas válidas e a análise será encerrada. Esta decisão é definitiva."
      onCancel={closeDecision} onConfirm={async () => { await decide('approved'); return null }} onConfirmed={closeDecision} />}
    {activeDialog === 'reject' && data && <FormRejectionModal onCancel={closeDecision} onConfirm={description => decide('rejected', description)} />}
    {photo && <AppModal className="form-response-photo-modal" title={photo.name} onClose={() => setPhoto(null)}>
      {dismiss => <>
        {image.loading ? <p role="status" aria-live="polite">Carregando imagem...</p>
          : image.error ? <div className="form-response-photo-unavailable" role="alert"><p>{image.error}</p><CompactPurpleButton type="button" onClick={image.retry}>Tentar novamente</CompactPurpleButton></div>
            : image.url ? <img className="form-response-photo" src={image.url} alt={`Registro enviado: ${photo.name}`} referrerPolicy="no-referrer" onError={image.fail} />
              : <div className="form-response-photo-unavailable"><AstroIcon name="document" /><p>{preview ? 'Arquivo de exemplo para validar a apresentação dos anexos. Nenhuma imagem real foi carregada nesta prévia.' : 'A imagem deste arquivo não está disponível.'}</p></div>}
        <div className="astro-modal-actions"><CompactPurpleButton auto type="button" onClick={dismiss}>Fechar visualização</CompactPurpleButton></div></>}
    </AppModal>}
  </div>
}
export default FormResponsesContent
