export type VoiceInputElement = HTMLInputElement | HTMLTextAreaElement

export interface VoiceInputTarget {
  key: string
  element: VoiceInputElement
  host: HTMLElement
  label: string
  left: number
  top: number
  zoom: number
  size: number
}
