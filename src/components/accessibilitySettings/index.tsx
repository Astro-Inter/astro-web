import { useId, useState, type CSSProperties } from 'react'
import { useAccessibility } from '../../hooks/useAccessibility'
import { useAccessibilityRuntime } from '../../hooks/useAccessibilityRuntime'
import type { AccessibilityPreferences } from '../../types/accessibility'
import { COLOR_VISION_OPTIONS } from '../../utils/accessibility'
import ToolbarSelect from '../toolbarSelect'
import ToggleSwitch from '../toggleSwitch'

interface AccessibilitySettingsProps { onDone?: () => void }

function AccessibilitySettings({ onDone }: AccessibilitySettingsProps) {
  const { preferences, update, reset } = useAccessibility()
  const { face, libras } = useAccessibilityRuntime()
  const idPrefix = useId()
  const [message, setMessage] = useState('')
  const toggle = (key: keyof Pick<AccessibilityPreferences, 'dyslexicFont' | 'highContrast' | 'readingGuide' | 'reduceMotion' | 'libras'>, label: string, description?: string) =>
    <div className="a11y-option">
      <span>{label}{description && <small>{description}</small>}</span>
      <ToggleSwitch label={label} checked={preferences[key]} onChange={checked => update({ [key]: checked })} />
    </div>

  return <div className="a11y-settings">
      <p className="a11y-intro">Ajuste a experiência da sua conta enquanto estiver conectado. Ao sair, as preferências voltam ao padrão Astro.</p>
      <section className="a11y-fieldset" aria-labelledby={`${idPrefix}-reading-title`}>
        <h3 className="a11y-section-title" id={`${idPrefix}-reading-title`}>Leitura</h3>
        <div className="a11y-fields">
        <div className="create-forms-field">
        <label className="a11y-slider-label" htmlFor={`${idPrefix}-text-size`}>Tamanho do texto <output htmlFor={`${idPrefix}-text-size`}>{preferences.textSize}%</output></label>
        <div className="a11y-text-size-control">
        <button className="a11y-text-size-button" type="button" aria-label="Diminuir tamanho do texto" disabled={preferences.textSize <= 90} onClick={() => update({ textSize: preferences.textSize - 5 })}><svg viewBox="4 4 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg></button>
        <input id={`${idPrefix}-text-size`} type="range" min="90" max="150" step="5" aria-valuetext={`${preferences.textSize}%`} value={preferences.textSize} style={{ '--a11y-text-progress': `${(preferences.textSize - 90) / 60 * 100}%` } as CSSProperties} onChange={event => update({ textSize: Number(event.target.value) })} />
        <button className="a11y-text-size-button" type="button" aria-label="Aumentar tamanho do texto" disabled={preferences.textSize >= 150} onClick={() => update({ textSize: preferences.textSize + 5 })}><svg viewBox="4 4 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg></button>
        </div>
        </div>
        {toggle('dyslexicFont', 'Fonte alternativa', 'Usar OpenDyslexic para leitura.')}
        {toggle('readingGuide', 'Guia de leitura', 'Acompanha o ponteiro e o foco do teclado.')}
        {toggle('reduceMotion', 'Reduzir animações')}
        </div>
      </section>
      <section className="a11y-fieldset" aria-labelledby={`${idPrefix}-colors-title`}>
        <h3 className="a11y-section-title" id={`${idPrefix}-colors-title`}>Cores e contraste</h3>
        <div className="a11y-fields">
{toggle('highContrast', 'Alto contraste')}
        <div className="create-forms-field a11y-select-field">
        <label htmlFor={`${idPrefix}-color-vision`} id={`${idPrefix}-color-vision-label`}>Adaptação de cores</label>
        <ToolbarSelect id={`${idPrefix}-color-vision`} labelledBy={`${idPrefix}-color-vision-label`} className="create-forms-select" label="Adaptação de cores" searchable={false} value={preferences.colorVision} options={COLOR_VISION_OPTIONS} onValueChange={value => {
          const option = COLOR_VISION_OPTIONS.find(item => item.value === value)
          if (option) update({ colorVision: option.value })
        }} />
        </div>
        </div>
      </section>
      <section className="a11y-fieldset" aria-labelledby={`${idPrefix}-libras-title`}>
        <h3 className="a11y-section-title" id={`${idPrefix}-libras-title`}>Libras</h3>
        <div className="a11y-fields">
        {toggle('libras', 'Tradutor VLibras', 'Tradução automática fornecida pelo VLibras. Ao ativar, o serviço externo pode receber o conteúdo selecionado para tradução.')}
        <div className="a11y-disclosure" data-open={preferences.libras} aria-hidden={!preferences.libras} inert={!preferences.libras}>
        <div><div className="a11y-fields">
          <div className="create-forms-field a11y-select-field">
          <label htmlFor={`${idPrefix}-libras-position`} id={`${idPrefix}-libras-position-label`}>Posição do tradutor</label>
          <ToolbarSelect id={`${idPrefix}-libras-position`} labelledBy={`${idPrefix}-libras-position-label`} className="create-forms-select" label="Posição do tradutor" searchable={false} value={preferences.librasPosition} options={[{value:'L',label:'Esquerda'},{value:'R',label:'Direita'}]} onValueChange={position => {
            if (position === 'L' || position === 'R') update({ librasPosition: position })
          }} />
          </div>
          <p className="a11y-hint">Ctrl + seta para esquerda ou direita muda a posição, fora dos campos de texto.</p>
        </div></div></div>
        {preferences.libras && libras.loading && <p className="a11y-loading-state" role="status"><span className="a11y-loading-spinner" aria-hidden="true" />Carregando VLibras<span className="loading-planet-dots" aria-hidden="true" /></p>}
        {libras.error && <p className="a11y-error" role="alert">{libras.error}</p>}
        </div>
      </section>
      <section className="a11y-fieldset" aria-labelledby={`${idPrefix}-face-title`}>
        <h3 className="a11y-section-title" id={`${idPrefix}-face-title`}>Navegação facial</h3>
        <div className="a11y-fields">
        <p className="a11y-hint">Autorize a câmera e olhe para o centro durante a calibração. Mova o rosto para guiar a mira e mantenha a mira parada sobre um controle por 1,4 segundo para clicar. Alt + P pausa ou retoma os cliques; Escape desliga a câmera. A imagem é processada neste dispositivo.</p>
        <button className="astro-action a11y-camera-button" onClick={() => { if (face.status !== 'idle' && face.status !== 'error') face.stop(); else { onDone?.(); void face.start() } }} type="button">{face.status !== 'idle' && face.status !== 'error' ? 'Parar câmera' : 'Ativar câmera e navegar'}</button>
        {face.error && <p className="a11y-error" role="alert">{face.error}</p>}
        </div>
      </section>
      <div className="a11y-notes">
        <p className="a11y-hint">As buscas têm um botão de microfone quando o navegador oferece reconhecimento de voz. O áudio pode ser processado pelo serviço do navegador.</p>
        <p className="a11y-hint">Atalho: Alt + A abre este painel. Tab navega pelos controles e Escape fecha o painel.</p>
      </div>
      {message && <p role="status">{message}</p>}
      <div className="a11y-actions">
        <button className="astro-modal-cancel" onClick={() => { face.stop(); reset(); setMessage('Preferências restauradas para o padrão Astro.') }} type="button">Restaurar padrão</button>
        {onDone && <button className="astro-action" onClick={onDone} type="button">Concluir</button>}
      </div>
  </div>
}

export default AccessibilitySettings
