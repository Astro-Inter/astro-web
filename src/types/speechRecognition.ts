export interface VoiceRecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}
export interface VoiceRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: VoiceRecognitionResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}
export interface VoiceRecognitionWindow extends Window {
  SpeechRecognition?: new () => VoiceRecognition
  webkitSpeechRecognition?: new () => VoiceRecognition
}
