import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AccessibilityContext } from '../../contexts/accessibility'
import type { AccessibilityPreferences } from '../../types/accessibility'
import { ACCESSIBILITY_KEY, DEFAULT_ACCESSIBILITY, clearAccessibility, normalizeAccessibility, parseAccessibility, readAccessibility, saveAccessibility } from '../../utils/accessibility'
import { useAuthentication } from '../../hooks/useAuthentication'
import { isEditingShortcutTarget, matchesAccessibilityShortcut } from '../../utils/accessibilityShortcuts'

interface AccessibilityProviderProps { children: ReactNode }

function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const { user, status } = useAuthentication()
  const accountId = status === 'ready' ? user?.uid ?? null : null
  const [session, setSession] = useState(() => ({ accountId, preferences: accountId ? readAccessibility(accountId) : { ...DEFAULT_ACCESSIBILITY } }))
  const [panelOpen, setPanelOpen] = useState(false)
  if (session.accountId !== accountId) {
    setSession({ accountId, preferences: accountId ? readAccessibility(accountId) : { ...DEFAULT_ACCESSIBILITY } })
    if (panelOpen) setPanelOpen(false)
  }
  const preferences = session.accountId === accountId ? session.preferences : DEFAULT_ACCESSIBILITY
  const triggerRef = useRef<HTMLElement | null>(null)
  const openPanel = useCallback(() => { if (!accountId) return; triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setPanelOpen(true) }, [accountId])
  const closePanel = useCallback(() => {
    setPanelOpen(false)
    requestAnimationFrame(() => {
      const target = triggerRef.current?.isConnected ? triggerRef.current : document.querySelector<HTMLElement>('#workspace-accessibility-title')
      target?.focus({ preventScroll: true })
    })
  }, [])
  const update = useCallback((changes: Partial<AccessibilityPreferences>) => {
    if (accountId) setSession(current => current.accountId === accountId ? { accountId, preferences: normalizeAccessibility({ ...current.preferences, ...changes }) } : current)
  }, [accountId])
  const reset = useCallback(() => setSession({ accountId, preferences: { ...DEFAULT_ACCESSIBILITY } }), [accountId])

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

  useEffect(() => {
    if (accountId) saveAccessibility(preferences, accountId)
    else if (status !== 'loading' && status !== 'authenticating') clearAccessibility()
  }, [accountId, preferences, status])
  useEffect(() => {
    if (!accountId) return
    const handleStorage = (event: StorageEvent) => { if (event.key === ACCESSIBILITY_KEY || event.key === null) setSession({ accountId, preferences: parseAccessibility(event.newValue, accountId) }) }
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
  }, [accountId, openPanel, preferences.libras, update])

  return <AccessibilityContext.Provider value={{ preferences, update, reset, panelOpen, openPanel, closePanel }}>{children}</AccessibilityContext.Provider>
}

export default AccessibilityProvider
