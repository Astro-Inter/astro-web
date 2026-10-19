import { createContext } from 'react'
import type { FaceNavigationController } from '../hooks/useFaceNavigation'

export interface AccessibilityRuntimeValue {
  face: FaceNavigationController
  libras: { loading: boolean; error: string }
}

export const AccessibilityRuntimeContext = createContext<AccessibilityRuntimeValue | undefined>(undefined)
