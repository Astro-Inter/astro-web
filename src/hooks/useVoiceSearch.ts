import { useCallback, useEffect, useRef, useState } from 'react'
import { createVoiceRecognition, supportsVoiceSearch, voiceErrorMessage } from '../services/voiceSearch'
import type { VoiceRecognition } from '../types/speechRecognition'

export function useVoiceSearch(onResult: (text: string) => void, disabled = false) {
  const [state, setState] = useState({ listening: false, message: '', error: '' })
  const activeRef = useRef(false)
  const recognitionRef = useRef<VoiceRecognition | null>(null)
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])
  const supported = supportsVoiceSearch()
  const stop = useCallback(() => {
    const recognition = recognitionRef.current
    activeRef.current = false
    recognitionRef.current = null
    if (recognition) { recognition.onstart = null; recognition.onresult = null; recognition.onerror = null; recognition.onend = null; recognition.abort() }
    setState(current => ({ ...current, listening: false, message: '' }))
  }, [])
  useEffect(() => {
    const stopOnHide = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', stopOnHide)
    return () => {
      document.removeEventListener('visibilitychange', stopOnHide)
      activeRef.current = false
      const recognition = recognitionRef.current
      recognitionRef.current = null
      if (recognition) { recognition.onstart = null; recognition.onresult = null; recognition.onerror = null; recognition.onend = null; recognition.abort() }
    }
  }, [stop])
  useEffect(() => { if (disabled && recognitionRef.current) stop() }, [disabled, stop])

  function toggle() {
    if (disabled || !supported) return
    if (activeRef.current) { stop(); return }
    try {
      const recognition = createVoiceRecognition()
      recognitionRef.current = recognition
      activeRef.current = true
      setState({ listening: true, message: 'Ouvindo. Diga o que deseja buscar.', error: '' })
      recognition.onresult = event => {
        if (!activeRef.current || recognitionRef.current !== recognition) return
        const text = event.results[0]?.[0]?.transcript?.trim() ?? ''
        if (text) onResultRef.current(text)
        setState(current => ({ ...current, message: text ? `Busca reconhecida: ${text}.` : 'Nenhuma fala foi reconhecida.' }))
      }
      recognition.onerror = event => {
        if (recognitionRef.current !== recognition) return
        stop()
        setState({ listening: false, message: '', error: voiceErrorMessage(event.error) })
      }
      recognition.onend = () => { if (recognitionRef.current !== recognition) return; activeRef.current = false; recognitionRef.current = null; setState(current => ({ ...current, listening: false })) }
      recognition.start()
    } catch (error: unknown) {
      activeRef.current = false
      recognitionRef.current = null
      setState({ listening: false, message: '', error: error instanceof Error ? error.message : 'Não foi possível iniciar o microfone.' })
    }
  }
  return { ...state, supported, toggle, stop }
}
