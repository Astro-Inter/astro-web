import { iconAsset } from '../../utils/iconAsset'
import { useRef } from 'react'
import AppModal from '../appModal'
import type { FormQuestionKind } from '../../types/forms'

interface AddFormQuestionModalProps {
  onCancel: () => void
  onChoose: (kind: FormQuestionKind) => void
}

const questionKinds: { kind: FormQuestionKind; label: string; icon: string }[] = [
  { kind: 'text', label: 'Texto', icon: 'text.svg' },
  { kind: 'option', label: 'Opção', icon: 'option.svg' },
  { kind: 'photo', label: 'Foto', icon: 'photo.svg' },
  { kind: 'date', label: 'Data', icon: 'calendar.svg' },
]

function AddFormQuestionModal({ onCancel, onChoose }: AddFormQuestionModalProps) {
  const selectedKindRef = useRef<FormQuestionKind | null>(null)
  return (
    <AppModal preservePageScroll className="create-forms-add-modal" onClose={() => {
      if (selectedKindRef.current) onChoose(selectedKindRef.current)
      else onCancel()
    }} title="Adicionar nova pergunta">
      {(dismiss) => <div className="create-forms-add-grid">
        {questionKinds.map(({ kind, label, icon }) => (
          <button className="create-forms-kind-button" key={kind} onClick={() => { selectedKindRef.current = kind; dismiss() }} type="button">
            <img alt="" src={iconAsset(icon)} /><span>{label}</span>
          </button>
        ))}
        <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
      </div>}
    </AppModal>
  )
}

export default AddFormQuestionModal
