import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useVoiceInputTargets } from '../../hooks/useVoiceInputTargets'
import { useVoiceSearch } from '../../hooks/useVoiceSearch'
import type { VoiceInputElement } from '../../types/voiceInput'
import { applyVoiceInput } from '../../utils/voiceInput'
import { useActionFeedback } from '../../hooks/useActionFeedback'

function VoiceInputControls() {
  const targets = useVoiceInputTargets()
  const [active, setActive] = useState<VoiceInputElement | null>(null)
  const voice = useVoiceSearch(text => { if (active) applyVoiceInput(active, text) })
  const { stop } = voice
  const notify = useActionFeedback()
  useEffect(() => { if (voice.error) notify(voice.error, 'error') }, [notify, voice.error])
  useEffect(() => {
    if (active && !targets.some(target => target.element === active)) {
      stop()
    }
  }, [active, targets, stop])
  return <>
    {targets.map(target => createPortal(<button
      className="astro-field-voice"
      aria-label={voice.listening && active === target.element ? `Parar ditado: ${target.label}` : `Preencher por voz: ${target.label}`}
      aria-controls={target.element.id || undefined}
      aria-pressed={voice.listening && active === target.element}
      disabled={!voice.supported}
      title={voice.supported ? 'Preencher por voz' : 'Entrada por voz indisponível neste navegador'}
      popover="manual"
      ref={button => { if (button?.showPopover && !button.matches(':popover-open')) button.showPopover() }}
      style={{ left: target.left, top: target.top, zoom: target.zoom, width: target.size, height: target.size }}
      onPointerDown={event => event.preventDefault()}
      onClick={() => {
        if (active !== target.element) voice.stop()
        setActive(target.element)
        voice.toggle()
      }}
      onKeyDown={event => { if (event.key === 'Escape') { voice.stop(); target.element.focus({ preventScroll: true }) } }}
      type="button"
    ><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.32"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></svg></button>, target.host, target.key))}
    {voice.message && <span className="sr-only" role="status">{voice.message}</span>}
  </>
}

export default VoiceInputControls
