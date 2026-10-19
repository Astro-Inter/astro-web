import { useContext } from 'react'
import { AccessibilityRuntimeContext } from '../contexts/accessibilityRuntime'

export function useAccessibilityRuntime() {
  const context = useContext(AccessibilityRuntimeContext)
  if (!context) throw new Error('Use AccessibilityRuntimeProvider para acessar as ferramentas de navegação.')
  return context
}
