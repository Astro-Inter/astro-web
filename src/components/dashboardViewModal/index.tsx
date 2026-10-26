import { useEffect, useRef, useState } from 'react'
import { validateDashboardViewName } from '../../utils/dashboardViewValidation'
import { useActionFeedback } from '../../hooks/useActionFeedback'
import AppModal from '../appModal'
import AnimatedFieldError from '../animatedFieldError'
import PurpleButton from '../purpleButton'

interface DashboardViewModalProps {
  existingNames: readonly string[]
  onCreate: (name: string) => Promise<void>
  onClose: () => void
}

export default function DashboardViewModal({ existingNames, onCreate, onClose }: DashboardViewModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const alive = useRef(true)
  const notify = useActionFeedback()
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  async function submit(dismiss: () => void) {
    if (savingRef.current) return
    const validation = validateDashboardViewName(name, existingNames)
    setError(validation)
    if (validation) { inputRef.current?.focus(); return }
    savingRef.current = true; setSaving(true)
    try {
      await onCreate(name.trim())
      if (alive.current) { setSaving(false); dismiss() }
    } catch (failure: unknown) {
      if (!alive.current) return
      savingRef.current = false; setSaving(false)
      if (!(failure instanceof DOMException && failure.name === 'AbortError')) notify(failure instanceof Error ? failure.message : 'Não foi possível criar a visão. Tente novamente.', 'error')
    }
  }

  return <AppModal title="Nova visão" dismissible={!saving} onClose={onClose} preservePageScroll>
    {dismiss => <form className="analytics-new-view-form" noValidate onSubmit={event => { event.preventDefault(); void submit(dismiss) }}>
      <div className="create-forms-field">
        <label htmlFor="dashboard-view-name">Nome da visão</label>
        <input id="dashboard-view-name" ref={inputRef} required maxLength={120} placeholder="Digite o nome da visão" value={name} disabled={saving} aria-invalid={!!error} aria-describedby={error ? 'dashboard-view-name-error' : undefined} onChange={event => { setName(event.target.value); setError('') }} />
        <AnimatedFieldError id="dashboard-view-name-error" message={error} />
      </div>
      <div className="astro-modal-actions">
        <button className="astro-modal-cancel" type="button" disabled={saving} onClick={dismiss}>Cancelar</button>
        <PurpleButton type="submit" disabled={saving}>Criar visão</PurpleButton>
      </div>
    </form>}
  </AppModal>
}
