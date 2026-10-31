export type AccessibilityTheme = 'dark'
export type ColorVision = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'protanomalia' | 'deuteranomalia' | 'tritanomalia' | 'acromatopsia'
export type LibrasPosition = 'L' | 'R'

export interface AccessibilityPreferences {
  textSize: number
  dyslexicFont: boolean
  theme: AccessibilityTheme
  highContrast: boolean
  colorVision: ColorVision
  readingGuide: boolean
  reduceMotion: boolean
  voiceSearch: boolean
  libras: boolean
  librasPosition: LibrasPosition
}

export interface AccessibilityContextValue {
  preferences: AccessibilityPreferences
  update: (changes: Partial<AccessibilityPreferences>) => void
  reset: () => void
  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void
}
export interface LibrasWidgetSnapshot extends Record<string, unknown> {
  _versao: 1
  state: Record<string, unknown> & { isOpen: boolean }
}
