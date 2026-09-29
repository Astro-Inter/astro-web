import { useRef } from 'react'
import AppModal from '../AppModal'
import type { FormQuestionKind } from '../../types/forms'

interface AddQuestionCreateFormsModalProps {
  onCancel: () => void
  onChoose: (kind: FormQuestionKind) => void
}

const questionKinds: { kind: FormQuestionKind; label: string; icon: string }[] = [
  { kind: 'text', label: 'Texto', icon: 'text.svg' },
  { kind: 'option', label: 'Opção', icon: 'option.svg' },
  { kind: 'photo', label: 'Foto', icon: 'paper4.svg' },
  { kind: 'date', label: 'Data', icon: 'calendar.svg' },
]

function AddQuestionCreateFormsModal({ onCancel, onChoose }: AddQuestionCreateFormsModalProps) {
  const selectedKindRef = useRef<FormQuestionKind | null>(null)
  return (
    <AppModal preservePageScroll className="create-forms-add-modal" onClose={() => {
      if (selectedKindRef.current) onChoose(selectedKindRef.current)
      else onCancel()
    }} title="Adicionar nova pergunta">
      {(dismiss) => <div className="create-forms-add-grid">
        {questionKinds.map(({ kind, label, icon }) => (
          <button className="create-forms-kind-button" key={kind} onClick={() => { selectedKindRef.current = kind; dismiss() }} type="button">
            <img alt="" src={`${import.meta.env.BASE_URL}icon/${icon}`} /><span>{label}</span>
          </button>
        ))}
        <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
      </div>}
    </AppModal>
  )
}

export default AddQuestionCreateFormsModal
