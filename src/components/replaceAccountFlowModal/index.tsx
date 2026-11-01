import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useLayoutEffect, useRef, useState } from 'react'
import { usePopupStepTransition } from '../../hooks/usePopupStepTransition'
import { usePasswordConfirmation } from '../../hooks/usePasswordConfirmation'
import type { EventCollaborator } from '../../types/eventCreation'
import AccountManagerSelectionForm from '../accountManagerSelectionForm'
import AppModal from '../appModal'
import AstroIcon from '../astroIcon'
import PasswordConfirmationForm from '../passwordConfirmationForm'
import PurpleButton from '../purpleButton'

interface ReplaceAccountFlowModalProps {
  collaborators: readonly Pick<EventCollaborator, 'id' | 'name' | 'email'>[]
  onCancel: () => void
  onReplaced: (managerId: string) => void
  initialReplacementId?: string
  loading?: boolean
}

type ReplacementStep = 'selection' | 'confirmation' | 'password'

function ReplaceAccountFlowModal({ collaborators, onCancel, onReplaced, initialReplacementId = '', loading = false }: ReplaceAccountFlowModalProps) {
  const [step, setStep] = useState<ReplacementStep>('selection')
  const [replacementId, setReplacementId] = useState(initialReplacementId)
  const replacement = collaborators.find(person => person.id === replacementId)
  const replacedRef = useRef(false)
  const actionRef = useRef(onReplaced)
  const confirmation = usePasswordConfirmation()
  const animatePopupChange = usePopupStepTransition()
  const stepClasses: Record<ReplacementStep, string> = {
    selection: 'account-manager-selection-modal',
    confirmation: 'astro-confirmation-modal astro-confirmation-modal--with-icon position-deactivation-modal replaceManagerAccountModalWeb account-replace-confirmation',
    password: 'workspace-password-modal textPasswotdAccount4ModalWeb',
  }

  useLayoutEffect(() => {
    document.querySelector<HTMLElement>('.account-replace-flow-modal[open] .astro-modal-title')?.focus({ preventScroll: true })
  }, [step])

  useLayoutEffect(() => {
    actionRef.current = onReplaced
  }, [onReplaced])

  function changeStep(next: ReplacementStep) {
    if (replacement) animatePopupChange(() => setStep(next))
  }

  const title = step === 'selection' ? 'Selecione o novo gestor do workspace'
    : step === 'password' ? 'Digite sua senha atual para poder continuar'
    : <><span className="astro-confirmation-title-icon"><span className="position-deactivation-icon"><AstroIcon name="warning" /></span></span><span className="astro-confirmation-title-text">Tem certeza que deseja substituir o gestor atual do workspace por outro gestor?</span></>

  return (
    <AppModal trackingName={({ selection: DIALOG_NAMES.selecionar_gestor_workspace, confirmation: DIALOG_NAMES.confirmar_substituicao_gestor, password: DIALOG_NAMES.confirmar_senha })[step]} className={`account-replace-flow-modal ${stepClasses[step]}`} dismissible={confirmation.status !== 'success'} onDismissRequest={() => { if (!replacedRef.current) confirmation.cancel() }} onClose={() => confirmation.consumeConfirmation() ? actionRef.current(replacementId) : onCancel()} preservePageScroll title={title}>
      {dismiss => <>
        {step === 'selection' && <AccountManagerSelectionForm collaborators={collaborators} loading={loading} onCancel={dismiss} onChange={setReplacementId} onContinue={() => changeStep('confirmation')} value={replacementId} />}
        {step === 'confirmation' && replacement && <>
          <p className="astro-confirmation-description">Novo gestor: <strong>{replacement.name}</strong><span>{replacement.email}</span></p>
          <p className="astro-confirmation-description">Você passará a gestor e perderá as permissões exclusivas de responsável pelo workspace.</p>
          <div className="astro-modal-actions">
            <button data-track-action={BUTTONS.comuns.cancelar} className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
            <PurpleButton data-track-action={BUTTONS.comuns.substituir} onClick={() => changeStep('password')} variant="danger">Alterar gestor</PurpleButton>
          </div>
        </>}
        {step === 'password' && <PasswordConfirmationForm confirmation={confirmation} confirmLabel="Alterar gestor" danger onCancel={dismiss} onContinue={async () => {
          if (await confirmation.submit()) { replacedRef.current = true; dismiss() }
        }} />}
      </>}
    </AppModal>
  )
}

export default ReplaceAccountFlowModal
