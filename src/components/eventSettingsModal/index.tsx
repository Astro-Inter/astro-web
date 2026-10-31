import AnimatedFieldError from '../animatedFieldError'
import { BUTTONS } from '../../gtm/buttons'
import { useState } from 'react'
import { validateEventSettings } from '../../utils/eventStepValidation'
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
  const [errors, setErrors] = useState<Partial<Record<keyof EventSettings, string>>>({})
  function update(field: keyof EventSettings, value: string) {
    setErrors(current => ({ ...current, [field]: undefined }))
    onChange({ [field]: value })
  }
  return <form noValidate data-track-submit={BUTTONS.comuns.continuar} onSubmit={event => {
    event.preventDefault()
    const validation = editing ? {} : validateEventSettings(settings)
    setErrors(validation)
    const field = validation.completion ? 'event-completion' : validation.evidenceRequired ? 'event-evidence' : null
    if (field) event.currentTarget.querySelector<HTMLInputElement>(`#${field}`)?.focus()
    else onContinue()
  }}>
    {editing && <p className="event-create-description">Modo de conclusão e evidência obrigatória não podem ser alterados após a criação.</p>}
    <div className="event-create-fields">
      <div className="event-create-field"><label htmlFor="event-completion" id="event-completion-label">Forma de conclusão</label><ToolbarSelect error={errors.completion} trackingAction={BUTTONS.comuns.forma_conclusao} escapeOverflow disabled={editing} className="event-create-select" id="event-completion" label="Forma de conclusão" maxVisibleRows={3} onValueChange={completion => update('completion', completion)} options={completionOptions} preferredPlacement="below" searchable={false} value={settings.completion} labelledBy="event-completion-label" /><AnimatedFieldError className="login-field-error" id="event-completion-error" message={errors.completion} /></div>
      <div className="event-create-field"><label htmlFor="event-evidence" id="event-evidence-label">Evidência obrigatória</label><ToolbarSelect error={errors.evidenceRequired} trackingAction={BUTTONS.comuns.evidencia} escapeOverflow disabled={editing} className="event-create-select" id="event-evidence" label="Evidência obrigatória" maxVisibleRows={3} onValueChange={evidenceRequired => update('evidenceRequired', evidenceRequired)} options={evidenceOptions} preferredPlacement="below" searchable={false} value={settings.evidenceRequired} labelledBy="event-evidence-label" /><AnimatedFieldError className="login-field-error" id="event-evidence-error" message={errors.evidenceRequired} /></div>
    </div>
    <div className="astro-modal-actions event-create-actions"><button data-track-action={BUTTONS.comuns.voltar} className="astro-modal-cancel" onClick={onBack} type="button">Voltar</button><PurpleButton data-track-action={BUTTONS.comuns.continuar} type="submit">Continuar</PurpleButton></div>
  </form>
}

export default EventSettingsModal
