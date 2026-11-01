import type { VoiceInputElement } from '../types/voiceInput'

export function canUseVoiceInput(element: Element): element is VoiceInputElement {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false
  if (element.disabled || element.readOnly || element.matches(':disabled') || element.closest('[hidden], [inert], .astro-toolbar-search')) return false
  return element instanceof HTMLTextAreaElement || !['password', 'hidden', 'checkbox', 'radio', 'file', 'range', 'color', 'submit', 'reset', 'button'].includes(element.type)
}

export function voiceInputLabel(element: VoiceInputElement): string {
  const labelledBy = element.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim()
  return element.getAttribute('aria-label') || labelledBy || [...(element.labels ?? [])].map(label => label.textContent?.trim()).join(' ') || element.placeholder || 'Campo de texto'
}

export function applyVoiceInput(element: VoiceInputElement, text: string): void {
  if (!element.isConnected || !canUseVoiceInput(element)) return
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const value = element instanceof HTMLInputElement && element.type === 'number' ? text.replace(/\s/g, '').replace(',', '.') : text
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value.slice(0, element.maxLength > 0 ? element.maxLength : 20000))
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.focus({ preventScroll: true })
}
