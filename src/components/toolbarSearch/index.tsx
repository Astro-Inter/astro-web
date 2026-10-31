import { BUTTONS } from '../../gtm/buttons'
import { iconAsset } from '../../utils/iconAsset'
import { useContext, useId, useRef, type InputHTMLAttributes } from 'react'
import { AccessibilityContext } from '../../contexts/accessibility'
import AstroIcon from '../astroIcon'
import { useVoiceSearch } from '../../hooks/useVoiceSearch'

interface ToolbarSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  onClear?: () => void
}

function ToolbarSearch({ id, label, className = '', onClear, value, ...inputProps }: ToolbarSearchProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const inputRef = useRef<HTMLInputElement>(null)
  const accessibility = useContext(AccessibilityContext)
  const voiceEnabled = accessibility?.preferences.voiceSearch === true
  const canClear = onClear && String(value ?? '').length > 0
  const voice = useVoiceSearch(text => {
    const input = inputRef.current
    if (!input) return
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, text.slice(0, input.maxLength > 0 ? input.maxLength : 240))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.focus({ preventScroll: true })
  }, Boolean(!voiceEnabled || inputProps.disabled || inputProps.readOnly))

  return (
    <div className={`astro-toolbar-search${voice.listening ? ' astro-toolbar-search--listening' : ''}${className ? ` ${className}` : ''}`}>
      <label className="sr-only" htmlFor={inputId}>{label}</label>
      <AstroIcon name="search" />
      <input id={inputId} ref={inputRef} maxLength={240} type="search" value={value} {...inputProps} />
      {canClear && (
        <button data-track-action={BUTTONS.comuns.limpar_busca} aria-label="Limpar busca" className="astro-toolbar-search-clear" onClick={() => { onClear(); inputRef.current?.focus() }} type="button">
          <img alt="" aria-hidden="true" height="24" src={iconAsset('close.svg')} width="24" />
        </button>
      )}
      {voiceEnabled && <button aria-label={voice.listening ? 'Parar pesquisa por voz' : `Pesquisar por voz: ${label}`} aria-pressed={voice.listening} className="astro-toolbar-search-voice" disabled={!voice.supported || inputProps.disabled || inputProps.readOnly} onClick={voice.toggle} onKeyDown={event => { if (event.key === 'Escape') voice.stop() }} title={voice.supported ? 'Pesquisar por voz (usa o microfone)' : 'Pesquisa por voz indisponível neste navegador'} type="button">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.32"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></svg>
      </button>}
      {voiceEnabled && voice.message && <span className="sr-only" role="status">{voice.message}</span>}
      {voiceEnabled && voice.error && <span className="astro-toolbar-voice-error" role="alert">{voice.error}</span>}
    </div>
  )
}

export default ToolbarSearch
