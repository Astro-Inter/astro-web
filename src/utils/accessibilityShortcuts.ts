import { isEditableTarget } from './accessibility'

type ShortcutEvent = Pick<KeyboardEvent, 'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'repeat' | 'isComposing'> & Partial<Pick<KeyboardEvent, 'getModifierState'>>

export function matchesAccessibilityShortcut(event: ShortcutEvent, modifier: 'alt' | 'ctrl', key: string): boolean {
  if (event.repeat || event.isComposing || event.shiftKey || event.metaKey || event.getModifierState?.('AltGraph')) return false
  if (modifier === 'alt' ? !event.altKey || event.ctrlKey : !event.ctrlKey || event.altKey) return false
  const code = key.length === 1 ? `Key${key.toUpperCase()}` : key
  return event.key.toLowerCase() === key.toLowerCase() || event.code === code
}

export function isEditingShortcutTarget(event: KeyboardEvent): boolean {
  // O target de eventos do Shadow DOM é a raiz, não o campo que tem foco.
  return (event.composedPath?.() ?? [event.target]).some(isEditableTarget)
}
