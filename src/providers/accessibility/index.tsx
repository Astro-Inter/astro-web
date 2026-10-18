import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AccessibilityContext } from '../../contexts/accessibility'
import type { AccessibilityPreferences } from '../../types/accessibility'
import { ACCESSIBILITY_KEY, DEFAULT_ACCESSIBILITY, normalizeAccessibility, parseAccessibility, readAccessibility, saveAccessibility } from '../../utils/accessibility'
import { isEditingShortcutTarget, matchesAccessibilityShortcut } from '../../utils/accessibilityShortcuts'

interface AccessibilityProviderProps { children: ReactNode }

function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [preferences, setPreferences] = useState(readAccessibility)
  const [panelOpen, setPanelOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const openPanel = useCallback(() => { triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setPanelOpen(true) }, [])
  const closePanel = useCallback(() => {
    setPanelOpen(false)
    requestAnimationFrame(() => {
      const target = triggerRef.current?.isConnected ? triggerRef.current : document.querySelector<HTMLElement>('.a11y-public-link, #workspace-accessibility-title')
      target?.focus({ preventScroll: true })
    })
  }, [])
  const update = useCallback((changes: Partial<AccessibilityPreferences>) => setPreferences(current => normalizeAccessibility({ ...current, ...changes })), [])
  const reset = useCallback(() => setPreferences({ ...DEFAULT_ACCESSIBILITY }), [])

  useLayoutEffect(() => {
    const root = document.documentElement
    const theme = preferences.theme
    root.dataset.astroTheme = theme
    root.dataset.astroContrast = String(preferences.highContrast)
    root.dataset.astroVision = preferences.colorVision
    root.dataset.astroDyslexic = String(preferences.dyslexicFont)
    root.dataset.astroReducedMotion = String(preferences.reduceMotion)
    root.dataset.astroTextSize = String(preferences.textSize)
    root.style.setProperty('--astro-text-scale', String(preferences.textSize / 100))
    root.style.colorScheme = theme
  }, [preferences])

  useEffect(() => { saveAccessibility(preferences) }, [preferences])
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => { if (event.key === ACCESSIBILITY_KEY || event.key === null) setPreferences(parseAccessibility(event.newValue)) }
    const handleShortcut = (event: KeyboardEvent) => {
      if (matchesAccessibilityShortcut(event, 'alt', 'a')) {
        event.preventDefault(); event.stopPropagation(); openPanel(); return
      }
      if (!preferences.libras || isEditingShortcutTarget(event)) return
      const position = matchesAccessibilityShortcut(event, 'ctrl', 'ArrowLeft') ? 'L'
        : matchesAccessibilityShortcut(event, 'ctrl', 'ArrowRight') ? 'R' : null
      if (position) { event.preventDefault(); event.stopPropagation(); update({ librasPosition: position }) }
    }
    window.addEventListener('storage', handleStorage)
    document.addEventListener('keydown', handleShortcut, true)
    return () => { window.removeEventListener('storage', handleStorage); document.removeEventListener('keydown', handleShortcut, true) }
  }, [openPanel, preferences.libras, update])

  return <AccessibilityContext.Provider value={{ preferences, update, reset, panelOpen, openPanel, closePanel }}>{children}</AccessibilityContext.Provider>
}

export default AccessibilityProvider
