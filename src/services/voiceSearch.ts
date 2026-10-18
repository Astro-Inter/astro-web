import type { VoiceRecognition, VoiceRecognitionWindow } from '../types/speechRecognition'

export function supportsVoiceSearch(): boolean {
  if (typeof window === 'undefined') return false
  const browser = window as VoiceRecognitionWindow
  return Boolean(browser.SpeechRecognition ?? browser.webkitSpeechRecognition)
}

export function createVoiceRecognition(): VoiceRecognition {
  const browser = window as VoiceRecognitionWindow
  const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition
  if (!Recognition) throw new Error('A pesquisa por voz não está disponível neste navegador.')
  const recognition = new Recognition()
  recognition.lang = 'pt-BR'
  recognition.continuous = false
  recognition.interimResults = false
  return recognition
}

export function voiceErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'not-allowed': 'Permita o acesso ao microfone para pesquisar por voz.',
    'service-not-allowed': 'A pesquisa por voz foi bloqueada pelo navegador.',
    'audio-capture': 'Nenhum microfone disponível foi encontrado.',
    'no-speech': 'Nenhuma fala foi detectada. Tente novamente.',
    network: 'Falha de conexão na pesquisa por voz. Tente novamente.',
    aborted: 'Pesquisa por voz cancelada.',
  }
  return messages[code] ?? 'Não foi possível reconhecer sua voz. Tente novamente.'
}
