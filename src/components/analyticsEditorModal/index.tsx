import { useEffect, useRef, useState, type ComponentProps } from 'react'
import type { AnalyticsWidget } from '../../types/dashboard'
import { useActionFeedback } from '../../hooks/useActionFeedback'
import AppModal from '../appModal'
import AstroIcon from '../astroIcon'
import AnalyticsEditor from '../analyticsEditor'

interface AnalyticsEditorModalProps extends Omit<ComponentProps<typeof AnalyticsEditor>, 'onSave' | 'onCancel' | 'hideHeading'> {
  onClose: () => void
  onSave: (widget: AnalyticsWidget) => Promise<void>
}

export default function AnalyticsEditorModal({ onClose, onSave, ...props }: AnalyticsEditorModalProps) {
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const alive = useRef(true)
  const notify = useActionFeedback()
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  function confirm(widget: AnalyticsWidget, dismiss: () => void) {
    if (savingRef.current) return
    savingRef.current = true; setSaving(true)
    void (async () => {
      try {
        await onSave(widget)
        if (!alive.current) return
        setSaving(false)
        dismiss()
      } catch (failure: unknown) {
        if (!alive.current) return
        savingRef.current = false; setSaving(false)
        if (!(failure instanceof DOMException && failure.name === 'AbortError')) notify(failure instanceof Error ? failure.message : 'Não foi possível salvar o gráfico. Tente novamente.', 'error')
      }
    })()
  }

  return <AppModal className="analytics-editor-modal" title={props.widget ? 'Editar gráfico' : 'Adicionar gráfico'} dismissible={!saving} onClose={onClose} preservePageScroll>
    {dismiss => <>
      <div className="create-forms-question-actions analytics-modal-close"><button type="button" aria-label="Fechar editor" disabled={saving} onClick={dismiss}><AstroIcon name="close" /></button></div>
      <fieldset className="analytics-modal-fields" disabled={saving} aria-busy={saving}>
        <AnalyticsEditor {...props} hideHeading onCancel={dismiss} onSave={widget => confirm(widget, dismiss)} />
      </fieldset>
    </>}
  </AppModal>
}
