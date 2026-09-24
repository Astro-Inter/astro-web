import { useRef } from 'react'
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog'
import AstroIcon from '../AstroIcon'
import PurpleButton from '../PurpleButton'

interface ChargeExplanationModalProps {
  onDismiss: () => void
  open: boolean
}

function ChargeExplanationModal({ onDismiss, open }: ChargeExplanationModalProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const { closing, dialogRef, dismiss, handleBackdropClick, handleCancel, handleClose } = useAnimatedDialog({ initialFocusRef: titleRef, onClose: onDismiss, open })

  return (
    <dialog
      aria-describedby="charge-explanation-subtitle"
      aria-labelledby="charge-explanation-title"
      className={`charge-explanation-modal astro-scale-100${closing ? ' astro-dialog--closing' : ''}`}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      onClose={handleClose}
      ref={dialogRef}
    >
      <h2 id="charge-explanation-title" ref={titleRef} tabIndex={-1}>Como funciona a cobrança do Astro?</h2>
      <p className="charge-explanation-subtitle" id="charge-explanation-subtitle">
        Você paga apenas pelos colaboradores ativos no workspace.
      </p>

      <div className="charge-explanation-highlight">
        <span className="charge-explanation-highlight-icon"><AstroIcon name="document" strokeScale={0.9} /></span>
        <div>
          <h3>Cobrança justa</h3>
          <p>No Astro, a cobrança é de R$ 10 por colaborador ativo no período. Ao desativar um colaborador, você deixa de pagar por ele e recebe um crédito proporcional na próxima fatura.</p>
        </div>
      </div>

      <h3 className="charge-explanation-section-title">Como funciona na prática?</h3>
      <ul className="charge-explanation-list">
        <li>
          <span className="charge-explanation-list-icon"><AstroIcon name="active" strokeScale={0.9} /></span>
          <div><h4>Apenas colaboradores ativos</h4><p>Colaboradores desativados não entram na cobrança.</p></div>
        </li>
        <li>
          <span className="charge-explanation-list-icon"><AstroIcon name="calendar" strokeScale={0.9} /></span>
          <div><h4>Cobrança proporcional</h4><p>Novos colaboradores são cobrados apenas pelos dias restantes do ciclo.</p></div>
        </li>
        <li>
          <span className="charge-explanation-list-icon"><AstroIcon name="receipt" strokeScale={0.9} /></span>
          <div><h4>Sem surpresas</h4><p>Toda alteração aparece detalhada na sua próxima fatura.</p></div>
        </li>
      </ul>

      <PurpleButton className="charge-explanation-confirm" onClick={dismiss}>
        Entendi
      </PurpleButton>
    </dialog>
  )
}

export default ChargeExplanationModal
