import { createContext } from 'react'
import type { AccessibilityContextValue } from '../types/accessibility'

export const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined)
