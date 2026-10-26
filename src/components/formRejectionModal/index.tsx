import { useRef, useState } from 'react'
import AppModal from '../appModal'
import PurpleButton from '../purpleButton'
import AstroIcon from '../astroIcon'
import ActionLoading from '../actionLoading'
import { rejectionDescriptionError, rejectionDescriptionLimit } from '../../utils/formReview'

interface FormRejectionModalProps { onCancel: () => void; onConfirm: (description: string) => void | Promise<void> }
function FormRejectionModal({ onCancel, onConfirm }: FormRejectionModalProps) {
  const [state, setState] = useState({ description: '', error: '', submitting: false })
  const submittingRef = useRef(false)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  return <AppModal className="form-rejection-modal" preservePageScroll dismissible={!state.submitting} title={<><AstroIcon name="warning-circle" />Reprovar formulário</>} onClose={onCancel} initialFocusRef={descriptionRef}>
    {dismiss => <form noValidate onSubmit={async event => {
      event.preventDefault()
      if (submittingRef.current) return
      const error = rejectionDescriptionError(state.description)
      if (error) { setState(current => ({ ...current, error })); descriptionRef.current?.focus(); return }
      submittingRef.current = true
      setState(current => ({ ...current, submitting: true, error: '' }))
      try { await onConfirm(state.description.trim()); dismiss() }
      catch (error: unknown) { setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Não foi possível reprovar o formulário.' })) }
      finally { submittingRef.current = false; setState(current => ({ ...current, submitting: false })) }
    }}>
      <p className="form-review-modal-copy">Informe por que as respostas não são válidas. O formulário será encerrado como reprovado e não poderá ser respondido novamente.</p>
      <ActionLoading active={state.submitting} />
      <div className="form-rejection-field"><label htmlFor="form-rejection-description">Descrição da reprovação <span>(obrigatória)</span></label>
        <textarea id="form-rejection-description" ref={descriptionRef} rows={5} disabled={state.submitting} maxLength={rejectionDescriptionLimit} value={state.description}
          aria-invalid={!!state.error} aria-describedby={`form-rejection-description-count${state.error ? ' form-rejection-description-error' : ''}`}
          placeholder="Descreva o que não está de acordo nas respostas..." onChange={event => setState(current => ({ ...current, description: event.target.value, error: '' }))} />
        <span id="form-rejection-description-count" className="form-rejection-count">{state.description.length}/{rejectionDescriptionLimit} caracteres</span>
        {state.error && <p id="form-rejection-description-error" role="alert" className="login-field-error">{state.error}</p>}
      </div>
      <div className="astro-modal-actions"><button className="astro-modal-cancel" disabled={state.submitting} type="button" onClick={dismiss}>Voltar à análise</button>
        <PurpleButton variant="danger" disabled={state.submitting} type="submit">Confirmar reprovação</PurpleButton></div>
    </form>}
  </AppModal>
}
export default FormRejectionModal
