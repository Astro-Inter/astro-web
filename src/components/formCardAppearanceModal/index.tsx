import { useEffect, useRef, useState } from 'react'
import type { FormCardAppearance } from '../../types/forms'
import { formCardColors, formCardIcons } from '../../data/formCardAppearance'
import { useActionFeedback } from '../../hooks/useActionFeedback'
import AppModal from '../appModal'
import FormCardSymbol from '../formCardSymbol'
import PurpleButton from '../purpleButton'
import AstroIcon from '../astroIcon'
import ActionLoading from '../actionLoading'
import CardAppearancePreview from '../cardAppearancePreview'

interface FormCardAppearanceModalProps {
  name: string; initial: FormCardAppearance
  onSave: (appearance: FormCardAppearance) => Promise<void>
  onClose: () => void
}
export default function FormCardAppearanceModal({ name, initial, onSave, onClose }: FormCardAppearanceModalProps) {
  const [appearance, setAppearance] = useState(initial)
  const submitted = useRef(false)
  const alive = useRef(true)
  const [saving, setSaving] = useState(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const notify = useActionFeedback()
  async function save(dismiss: () => void) {
    if (submitted.current) return
    submitted.current = true; setSaving(true)
    try { await onSave(appearance); if (alive.current) { setSaving(false); dismiss() } }
    catch (error) {
      if (!alive.current) return
      submitted.current = false; setSaving(false)
      if (!(error instanceof DOMException && error.name === 'AbortError')) notify(error instanceof Error ? error.message : 'Não foi possível salvar a aparência do card.', 'error')
    }
  }
  return <AppModal title="Personalizar card" className="form-card-appearance-modal" onClose={onClose} dismissible={!saving} preservePageScroll>
    {dismiss => <form className="form-card-appearance-form" onSubmit={event => {
      event.preventDefault()
      void save(dismiss)
    }}>
      <ActionLoading active={saving} />
      <fieldset disabled={saving} className="form-card-appearance-fields">
      <CardAppearancePreview name={name} className="form-card-appearance-preview"><FormCardSymbol appearance={appearance} /></CardAppearancePreview>
      <fieldset className="form-card-appearance-options"><legend>Ícone</legend><div className="form-card-icon-options">{formCardIcons.map(icon => <label className="form-card-appearance-option" key={icon.value}>
        <input type="radio" name="form-card-icon" value={icon.value} checked={appearance.icon === icon.value} onChange={() => setAppearance(current => ({ ...current, icon: icon.value }))} />
        <span className="form-card-icon-choice"><FormCardSymbol appearance={{ ...appearance, icon: icon.value }} neutral /><span>{icon.label}</span></span>
      </label>)}</div></fieldset>
      <fieldset className="form-card-appearance-options"><legend>Cor do fundo</legend><div className="form-card-color-options">{formCardColors.map(color => <label className="form-card-appearance-option" key={color.value} title={color.label}>
        <input type="radio" name="form-card-color" aria-label={color.label} value={color.value} checked={appearance.color === color.value} onChange={() => setAppearance(current => ({ ...current, color: color.value }))} />
        <span className="form-card-color-choice" style={{ backgroundColor: color.background }}>{appearance.color === color.value && <AstroIcon name="check" />}</span><span className="form-card-color-name">{color.label}</span>
      </label>)}</div></fieldset>
      <div className="astro-modal-actions"><button type="button" className="astro-modal-cancel" onClick={dismiss}>Cancelar</button><PurpleButton type="submit">Salvar alterações</PurpleButton></div>
      </fieldset>
    </form>}
  </AppModal>
}
