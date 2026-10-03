import type { EventCollaborator } from '../../types/eventCreation'
import PurpleButton from '../PurpleButton'
import ToolbarSelect from '../ToolbarSelect'

interface AccountManagerSelectionFormProps {
  collaborators: readonly Pick<EventCollaborator, 'id' | 'email'>[]
  value: string
  onChange: (id: string) => void
  onCancel: () => void
  onContinue: () => void
}

function AccountManagerSelectionForm({ collaborators, value, onChange, onCancel, onContinue }: AccountManagerSelectionFormProps) {
  const hasSelection = collaborators.some(person => person.id === value)
  const options = [
    { label: 'Selecione o e-mail do colaborador', value: '', tone: 'muted' as const },
    ...collaborators.map(person => ({ label: person.email, value: person.id })),
  ]

  return (
      <form className="account-manager-selection-form" noValidate onSubmit={event => {
        event.preventDefault()
        if (!hasSelection) return
        onContinue()
      }}>
        <div className="field-group">
          <label htmlFor="account-replacement-email">E-mail do colaborador</label>
          <ToolbarSelect className="account-field-select" id="account-replacement-email" label="E-mail do colaborador" onValueChange={onChange} options={options} value={value} />
        </div>
        <div className="astro-modal-actions">
          <button className="astro-modal-cancel" onClick={onCancel} type="button">Cancelar</button>
          <PurpleButton disabled={!hasSelection} type="submit" variant="danger">Continuar</PurpleButton>
        </div>
      </form>
  )
}

export default AccountManagerSelectionForm
