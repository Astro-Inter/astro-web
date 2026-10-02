import { useRef, useState } from 'react'
import AppModal from '../AppModal'
import PurpleButton from '../PurpleButton'
import ToolbarSelect from '../ToolbarSelect'

interface CreateEvent3RandomModalWebProps {
  onCancel: () => void
  onContinue: (count: number) => void
}

const countOptions = [
  { value: '', label: 'Selecione a quantidade de grupos', tone: 'muted' as const },
  ...Array.from({ length: 7 }, (_, index) => ({ value: String(index + 2), label: String(index + 2) })),
]

function CreateEvent3RandomModalWeb({ onCancel, onContinue }: CreateEvent3RandomModalWebProps) {
  const [count, setCount] = useState('')
  const confirmedRef = useRef(false)

  return <AppModal backdrop="transparent" className="event-create-random-modal" onClose={() => {
    if (confirmedRef.current) onContinue(Number(count))
    else onCancel()
  }} preservePageScroll title="Em quantos grupos você deseja distribuir aleatoriamente?">
    {dismiss => <div className="event-create-random-body">
      <div className="event-create-field"><label htmlFor="event-create-group-count">Quantidade de grupos</label><ToolbarSelect className="event-create-select" id="event-create-group-count" label="Quantidade de grupos" onValueChange={setCount} options={countOptions} searchable={false} value={count} /></div>
      <div className="astro-modal-actions event-create-actions"><button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button><PurpleButton disabled={!count} onClick={() => { confirmedRef.current = true; dismiss() }} type="button">Continuar</PurpleButton></div>
    </div>}
  </AppModal>
}

export default CreateEvent3RandomModalWeb
