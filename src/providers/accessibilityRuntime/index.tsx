import { useEffect, useRef, type ReactNode } from 'react'
import { AccessibilityRuntimeContext } from '../../contexts/accessibilityRuntime'
import { useFaceNavigation } from '../../hooks/useFaceNavigation'
import { useLibras } from '../../hooks/useLibras'
import { useAuthentication } from '../../hooks/useAuthentication'

interface AccessibilityRuntimeProviderProps { children: ReactNode }

function AccessibilityRuntimeProvider({ children }: AccessibilityRuntimeProviderProps) {
  const face = useFaceNavigation()
  const libras = useLibras()
  const { user, status } = useAuthentication()
  const accountId = status === 'ready' ? user?.uid : undefined
  const previousUid = useRef(accountId)
  const stop = face.stop
  useEffect(() => {
    if (previousUid.current !== accountId) stop()
    previousUid.current = accountId
  }, [accountId, stop])
  return <AccessibilityRuntimeContext.Provider value={{ face, libras }}>{children}</AccessibilityRuntimeContext.Provider>
}

export default AccessibilityRuntimeProvider
