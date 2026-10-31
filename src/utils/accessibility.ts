import type { AccessibilityPreferences, ColorVision } from '../types/accessibility'

export const ACCESSIBILITY_KEY = 'astro-accessibility'
export const DEFAULT_ACCESSIBILITY: Readonly<AccessibilityPreferences> = Object.freeze({
  textSize: 100, dyslexicFont: false, theme: 'dark', highContrast: false,
  colorVision: 'default', readingGuide: false, reduceMotion: false, voiceSearch: false, libras: false, librasPosition: 'L',
})
export const COLOR_VISION_OPTIONS: readonly { value: ColorVision; label: string }[] = [
  { value: 'default', label: 'Padrão' }, { value: 'protanopia', label: 'Protanopia' },
  { value: 'deuteranopia', label: 'Deuteranopia' }, { value: 'tritanopia', label: 'Tritanopia' },
  { value: 'protanomalia', label: 'Protanomalia' }, { value: 'deuteranomalia', label: 'Deuteranomalia' },
  { value: 'tritanomalia', label: 'Tritanomalia' }, { value: 'acromatopsia', label: 'Acromatopsia' },
]

export function normalizeAccessibility(value: unknown): AccessibilityPreferences {
  const preferences = { ...DEFAULT_ACCESSIBILITY }
  if (!value || typeof value !== 'object') return preferences
  const saved = value as Record<string, unknown>
  if (typeof saved.textSize === 'number' && Number.isFinite(saved.textSize)) preferences.textSize = Math.max(90, Math.min(150, Math.round(saved.textSize / 5) * 5))
  for (const key of ['dyslexicFont', 'highContrast', 'readingGuide', 'reduceMotion', 'voiceSearch', 'libras'] as const) {
    if (typeof saved[key] === 'boolean') preferences[key] = saved[key]
  }
  if (COLOR_VISION_OPTIONS.some(option => option.value === saved.colorVision)) preferences.colorVision = saved.colorVision as ColorVision
  if (saved.librasPosition === 'L' || saved.librasPosition === 'R') preferences.librasPosition = saved.librasPosition
  return preferences
}

export function parseAccessibility(raw: string | null, accountId?: string): AccessibilityPreferences {
  try {
    const stored: unknown = raw ? JSON.parse(raw) : null
    if (accountId && (!stored || typeof stored !== 'object' || !('accountId' in stored) || stored.accountId !== accountId)) return { ...DEFAULT_ACCESSIBILITY }
    return stored && typeof stored === 'object' && '_versao' in stored && stored._versao === 1 && 'preferences' in stored
      ? normalizeAccessibility(stored.preferences) : { ...DEFAULT_ACCESSIBILITY }
  } catch { return { ...DEFAULT_ACCESSIBILITY } }
}

export function readAccessibility(accountId?: string): AccessibilityPreferences {
  try { return parseAccessibility(localStorage.getItem(ACCESSIBILITY_KEY), accountId) } catch { return { ...DEFAULT_ACCESSIBILITY } }
}

export function saveAccessibility(preferences: AccessibilityPreferences, accountId?: string): void {
  try { localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify({ _versao: 1, accountId, preferences: normalizeAccessibility(preferences) })) } catch { /* Continua em memória se o armazenamento estiver bloqueado. */ }
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target.matches('textarea:not([readonly]), select')) return true
  return target.matches('input:not([readonly]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"])')
}

export function focusMainContent(): void {
  const target = document.querySelector<HTMLElement>('dialog[open] main, main:not([inert]) h1, main:not([inert]), h1')
  if (!target) return
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1
  target.focus({ preventScroll: true })
  target.scrollIntoView({ block: 'start', behavior: 'instant' })
}

export function clearAccessibility(): void {
  try { localStorage.removeItem(ACCESSIBILITY_KEY) } catch { /* O reset em memória continua funcionando. */ }
}
