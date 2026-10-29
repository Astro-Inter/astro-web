import { useEffect, useRef, useState } from 'react'
import { validateDashboardViewName } from '../../utils/dashboardViewValidation'
import { useActionFeedback } from '../../hooks/useActionFeedback'
import AppModal from '../appModal'
import AnimatedFieldError from '../animatedFieldError'
import PurpleButton from '../purpleButton'
import DashboardArtworkPicker from '../dashboardArtworkPicker'
import DashboardArtwork from '../dashboardArtwork'
import CardAppearancePreview from '../cardAppearancePreview'
import type { DashboardArtworkId } from '../../types/dashboard'

interface DashboardViewModalProps {
  existingNames: readonly string[]
  initialView?: { name: string; artwork: DashboardArtworkId }
  onCreate: (name: string, artwork: DashboardArtworkId) => Promise<void>
  onClose: () => void
}

export default function DashboardViewModal({ existingNames, initialView, onCreate, onClose }: DashboardViewModalProps) {
  const [name, setName] = useState(initialView?.name ?? '')
  const [artwork, setArtwork] = useState<DashboardArtworkId>(initialView?.artwork ?? 'overview')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const alive = useRef(true)
  const notify = useActionFeedback()
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  async function submit(dismiss: () => void) {
    if (savingRef.current) return
    const validation = initialView ? '' : validateDashboardViewName(name, existingNames)
    setError(validation)
    if (validation) { inputRef.current?.focus(); return }
    savingRef.current = true; setSaving(true)
    try {
      await onCreate(name.trim(), artwork)
      if (alive.current) { setSaving(false); dismiss() }
    } catch (failure: unknown) {
      if (!alive.current) return
      savingRef.current = false; setSaving(false)
      if (!(failure instanceof DOMException && failure.name === 'AbortError')) notify(failure instanceof Error ? failure.message : 'Não foi possível salvar a visão. Tente novamente.', 'error')
    }
  }

  return <AppModal className="dashboard-view-modal" title={initialView ? 'Editar visão' : 'Nova visão'} dismissible={!saving} onClose={onClose} preservePageScroll>
    {dismiss => <form className="analytics-new-view-form" noValidate onSubmit={event => { event.preventDefault(); void submit(dismiss) }}>
      {!initialView && <div className="create-forms-field">
        <label htmlFor="dashboard-view-name">Nome da visão</label>
        <input id="dashboard-view-name" ref={inputRef} required maxLength={120} placeholder="Digite o nome da visão" value={name} disabled={saving} aria-invalid={!!error} aria-describedby={error ? 'dashboard-view-name-error' : undefined} onChange={event => { setName(event.target.value); setError('') }} />
        <AnimatedFieldError id="dashboard-view-name-error" message={error} />
      </div>}
      <CardAppearancePreview name={name.trim() || 'Nova visão'} className="dashboard-artwork-preview"><DashboardArtwork artwork={artwork} /></CardAppearancePreview>
      <DashboardArtworkPicker value={artwork} onChange={setArtwork} disabled={saving} />
      <div className="astro-modal-actions">
        <button className="astro-modal-cancel" type="button" disabled={saving} onClick={dismiss}>Cancelar</button>
        <PurpleButton type="submit" disabled={saving}>{initialView ? 'Salvar alterações' : 'Criar visão'}</PurpleButton>
      </div>
    </form>}
  </AppModal>
}
