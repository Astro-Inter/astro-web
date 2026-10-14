import { BUTTONS } from '../../gtm/buttons'
import { completionOptions, evidenceOptions } from '../../data/eventSettings'
import type { EventSettings } from '../../types/eventCreation'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

interface EventSettingsModalProps {
  settings: EventSettings
  onChange: (changes: Partial<EventSettings>) => void
  onBack: () => void
  onContinue: () => void
  editing?: boolean
}

function EventSettingsModal({ settings, onChange, onBack, onContinue, editing = false }: EventSettingsModalProps) {
  return <form data-track-submit={BUTTONS.comuns.continuar} onSubmit={event => { event.preventDefault(); onContinue() }}>
    {editing && <p className="event-create-description">Modo de conclusão e evidência obrigatória não podem ser alterados após a criação.</p>}
    <div className="event-create-fields">
      <div className="event-create-field"><label htmlFor="event-completion">Forma de conclusão</label><ToolbarSelect trackingAction={BUTTONS.comuns.forma_conclusao} escapeOverflow disabled={editing} className="event-create-select" id="event-completion" label="Forma de conclusão" maxVisibleRows={3} onValueChange={completion => onChange({ completion })} options={completionOptions} preferredPlacement="below" searchable={false} value={settings.completion} /></div>
      <div className="event-create-field"><label htmlFor="event-evidence">Evidência obrigatória</label><ToolbarSelect trackingAction={BUTTONS.comuns.evidencia} escapeOverflow disabled={editing} className="event-create-select" id="event-evidence" label="Evidência obrigatória" maxVisibleRows={3} onValueChange={evidenceRequired => onChange({ evidenceRequired })} options={evidenceOptions} preferredPlacement="below" searchable={false} value={settings.evidenceRequired} /></div>
    </div>
    <div className="astro-modal-actions event-create-actions"><button data-track-action={BUTTONS.comuns.voltar} className="astro-modal-cancel" onClick={onBack} type="button">Voltar</button><PurpleButton data-track-action={BUTTONS.comuns.continuar} type="submit">Continuar</PurpleButton></div>
  </form>
}

export default EventSettingsModal
