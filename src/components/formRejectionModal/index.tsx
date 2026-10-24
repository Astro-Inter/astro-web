import { useRef, useState } from 'react'
import AppModal from '../appModal'
import PurpleButton from '../purpleButton'
import AstroIcon from '../astroIcon'
import { rejectionDescriptionError, rejectionDescriptionLimit } from '../../utils/formReview'

interface FormRejectionModalProps { onCancel: () => void; onConfirm: (description: string) => void }
function FormRejectionModal({ onCancel, onConfirm }: FormRejectionModalProps) {
  const [state, setState] = useState({ description: '', error: '' })
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  return <AppModal className="form-rejection-modal" preservePageScroll title={<><AstroIcon name="warning-circle" />Reprovar formulário</>} onClose={onCancel} initialFocusRef={descriptionRef}>
    {dismiss => <form noValidate onSubmit={event => {
      event.preventDefault()
      const error = rejectionDescriptionError(state.description)
      if (error) { setState(current => ({ ...current, error })); descriptionRef.current?.focus(); return }
      try { onConfirm(state.description.trim()); dismiss() }
      catch (error: unknown) { setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Não foi possível reprovar o formulário.' })) }
    }}>
      <p className="form-review-modal-copy">Informe por que as respostas não são válidas. O formulário será encerrado como reprovado e não poderá ser respondido novamente.</p>
      <div className="form-rejection-field"><label htmlFor="form-rejection-description">Descrição da reprovação <span>(obrigatória)</span></label>
        <textarea id="form-rejection-description" ref={descriptionRef} rows={5} maxLength={rejectionDescriptionLimit} value={state.description}
          aria-invalid={!!state.error} aria-describedby={`form-rejection-description-count${state.error ? ' form-rejection-description-error' : ''}`}
          placeholder="Descreva o que não está de acordo nas respostas..." onChange={event => setState({ description: event.target.value, error: '' })} />
        <span id="form-rejection-description-count" className="form-rejection-count">{state.description.length}/{rejectionDescriptionLimit} caracteres</span>
        {state.error && <p id="form-rejection-description-error" role="alert" className="login-field-error">{state.error}</p>}
      </div>
      <div className="astro-modal-actions"><button className="astro-modal-cancel" type="button" onClick={dismiss}>Voltar à análise</button>
        <PurpleButton variant="danger" type="submit">Confirmar reprovação</PurpleButton></div>
    </form>}
  </AppModal>
}
export default FormRejectionModal
