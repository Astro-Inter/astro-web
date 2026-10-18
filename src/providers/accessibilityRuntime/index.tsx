import { useEffect, useRef, type ReactNode } from 'react'
import { AccessibilityRuntimeContext } from '../../contexts/accessibilityRuntime'
import { useFaceNavigation } from '../../hooks/useFaceNavigation'
import { useLibras } from '../../hooks/useLibras'
import { useAuthentication } from '../../hooks/useAuthentication'

interface AccessibilityRuntimeProviderProps { children: ReactNode }

function AccessibilityRuntimeProvider({ children }: AccessibilityRuntimeProviderProps) {
  const face = useFaceNavigation()
  const libras = useLibras()
  const { user } = useAuthentication()
  const previousUid = useRef(user?.uid)
  const stop = face.stop
  useEffect(() => {
    if (previousUid.current !== user?.uid) stop()
    previousUid.current = user?.uid
  }, [user?.uid, stop])
  return <AccessibilityRuntimeContext.Provider value={{ face, libras }}>{children}</AccessibilityRuntimeContext.Provider>
}

export default AccessibilityRuntimeProvider
