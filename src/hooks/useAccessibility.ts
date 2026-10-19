import { useContext } from 'react'
import { AccessibilityContext } from '../contexts/accessibility'

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) throw new Error('Use AccessibilityProvider para acessar as preferências de acessibilidade.')
  return context
}
