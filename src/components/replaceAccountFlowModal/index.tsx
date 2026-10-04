import { useLayoutEffect, useRef, useState } from 'react'
import { usePopupStepTransition } from '../../hooks/usePopupStepTransition'
import type { EventCollaborator } from '../../types/eventCreation'
import AccountManagerSelectionForm from '../accountManagerSelectionForm'
import AppModal from '../appModal'
import AstroIcon from '../astroIcon'
import PasswordConfirmationForm from '../passwordConfirmationForm'
import PurpleButton from '../purpleButton'

interface ReplaceAccountFlowModalProps {
  collaborators: readonly EventCollaborator[]
  onCancel: () => void
  onReplaced: () => void
}

type ReplacementStep = 'selection' | 'confirmation' | 'password'

function ReplaceAccountFlowModal({ collaborators, onCancel, onReplaced }: ReplaceAccountFlowModalProps) {
  const [step, setStep] = useState<ReplacementStep>('selection')
  const [replacementId, setReplacementId] = useState('')
  const replacement = collaborators.find(person => person.id === replacementId)
  const replacedRef = useRef(false)
  const animatePopupChange = usePopupStepTransition()
  const stepClasses: Record<ReplacementStep, string> = {
    selection: 'account-manager-selection-modal',
    confirmation: 'astro-confirmation-modal astro-confirmation-modal--with-icon position-deactivation-modal replaceManagerAccountModalWeb account-replace-confirmation',
    password: 'workspace-password-modal textPasswotdAccount4ModalWeb',
  }

  useLayoutEffect(() => {
    document.querySelector<HTMLElement>('.account-replace-flow-modal[open] .astro-modal-title')?.focus({ preventScroll: true })
  }, [step])

  function changeStep(next: ReplacementStep) {
    if (replacement) animatePopupChange(() => setStep(next))
  }

  const title = step === 'selection' ? 'Selecione o novo gestor do workspace'
    : step === 'password' ? 'Digite sua senha atual para poder continuar'
    : <><span className="astro-confirmation-title-icon"><span className="position-deactivation-icon"><AstroIcon name="warning" /></span></span><span className="astro-confirmation-title-text">Tem certeza que deseja substituir o gestor atual do workspace por outro gestor?</span></>

  return (
    <AppModal className={`account-replace-flow-modal ${stepClasses[step]}`} onClose={() => replacedRef.current ? onReplaced() : onCancel()} preservePageScroll title={title}>
      {dismiss => <>
        {step === 'selection' && <AccountManagerSelectionForm collaborators={collaborators} onCancel={dismiss} onChange={setReplacementId} onContinue={() => changeStep('confirmation')} value={replacementId} />}
        {step === 'confirmation' && replacement && <>
          <p className="astro-confirmation-description">Novo gestor: <strong>{replacement.name}</strong><span>{replacement.email}</span></p>
          <div className="astro-modal-actions">
            <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
            <PurpleButton onClick={() => changeStep('password')} variant="danger">Alterar gestor</PurpleButton>
          </div>
        </>}
        {step === 'password' && <PasswordConfirmationForm confirmLabel="Alterar gestor" danger onCancel={dismiss} onContinue={() => { replacedRef.current = true; dismiss() }} />}
      </>}
    </AppModal>
  )
}

export default ReplaceAccountFlowModal
