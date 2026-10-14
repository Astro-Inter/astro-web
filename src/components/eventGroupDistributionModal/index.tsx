import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useRef, useState } from 'react'
import AppModal from '../appModal'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

interface EventGroupDistributionModalProps {
  onCancel: () => void
  onDismissRequest: () => void
  onContinue: (count: number) => void
}

const countOptions = [
  { value: '', label: 'Selecione a quantidade de grupos', tone: 'muted' as const },
  ...Array.from({ length: 7 }, (_, index) => ({ value: String(index + 2), label: String(index + 2) })),
]

function EventGroupDistributionModal({ onCancel, onContinue, onDismissRequest }: EventGroupDistributionModalProps) {
  const [count, setCount] = useState('')
  const confirmedRef = useRef(false)

  return <AppModal trackingName={DIALOG_NAMES.definir_quantidade_equipes_evento} backdrop="transparent" className="event-create-random-modal" onClose={() => {
    if (confirmedRef.current) onContinue(Number(count))
    else onCancel()
  }} onDismissRequest={onDismissRequest} preservePageScroll title="Em quantos grupos você deseja distribuir aleatoriamente?">
    {dismiss => <div className="event-create-random-body">
      <div className="event-create-field"><label htmlFor="event-create-group-count">Quantidade de grupos</label><ToolbarSelect trackingAction={BUTTONS.comuns.grupo} escapeOverflow className="event-create-select" id="event-create-group-count" label="Quantidade de grupos" onValueChange={setCount} options={countOptions} maxVisibleRows={3} preferredPlacement="below" searchable={false} value={count} /></div>
      <div className="astro-modal-actions event-create-actions"><button data-track-action={BUTTONS.comuns.cancelar} className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button><PurpleButton data-track-action={BUTTONS.comuns.continuar} disabled={!count} onClick={() => { confirmedRef.current = true; dismiss() }} type="button">Continuar</PurpleButton></div>
    </div>}
  </AppModal>
}

export default EventGroupDistributionModal
