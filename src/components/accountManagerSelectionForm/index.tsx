import { BUTTONS } from '../../gtm/buttons'
import type { EventCollaborator } from '../../types/eventCreation'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

interface AccountManagerSelectionFormProps {
  collaborators: readonly Pick<EventCollaborator, 'id' | 'email'>[]
  value: string
  onChange: (id: string) => void
  onCancel: () => void
  onContinue: () => void
  loading?: boolean
}

function AccountManagerSelectionForm({ collaborators, value, onChange, onCancel, onContinue, loading = false }: AccountManagerSelectionFormProps) {
  const hasSelection = collaborators.some(person => person.id === value)
  const options = [
    { label: 'Selecione o e-mail do gestor', value: '', tone: 'muted' as const },
    ...collaborators.map(person => ({ label: person.email, value: person.id })),
  ]

  return (
      <form aria-busy={loading} data-track-submit={BUTTONS.comuns.continuar} className="account-manager-selection-form" noValidate onSubmit={event => {
        event.preventDefault()
        if (loading || !hasSelection) return
        onContinue()
      }}>
        <div className="field-group">
          <label htmlFor="account-replacement-email" id="account-replacement-email-label">E-mail do gestor</label>
          {loading ? <><span aria-hidden="true" className="api-skeleton api-skeleton-control" /><span className="sr-only" role="status">Carregando gestores disponíveis…</span></> : <ToolbarSelect escapeOverflow trackingAction={BUTTONS.comuns.colaborador} className="account-field-select" id="account-replacement-email" label="E-mail do gestor" onValueChange={onChange} options={options} value={value} labelledBy="account-replacement-email-label" />}
        </div>
        <div className="astro-modal-actions">
          <button data-track-action={BUTTONS.comuns.cancelar} className="astro-modal-cancel" onClick={onCancel} type="button">Cancelar</button>
          <PurpleButton data-track-action={BUTTONS.comuns.continuar} disabled={loading || !hasSelection} type="submit" variant="danger">Continuar</PurpleButton>
        </div>
      </form>
  )
}

export default AccountManagerSelectionForm
