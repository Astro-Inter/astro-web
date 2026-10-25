import { useEffect, useLayoutEffect, useRef } from 'react'
import { passwordResetLink } from '../utils/passwordResetLink'
import { useAuthentication } from '../hooks/useAuthentication'
import { createTrackingRuntime } from './runtime'
import { initGTM, type TrackingBrowser } from './track'

const enabled = import.meta.env.VITE_TRACKING_ENABLED !== 'false' && !passwordResetLink.active
const gtmId = import.meta.env.VITE_GTM_ID || 'GTM-NF932KMT'

export default function Tracking() {
  const { user, status } = useAuthentication()
  const uid = useRef<string | null>(null)
  const currentUid = status === 'ready' ? user?.uid ?? null : null
  useLayoutEffect(() => { uid.current = currentUid }, [currentUid])
  const runtime = useRef<ReturnType<typeof createTrackingRuntime> | null>(null)
  useEffect(() => {
    if (!enabled) return
    try { initGTM(document, window as Window & TrackingBrowser, gtmId) }
    catch (error) { console.warn('Configuração do tracking inválida:', error); return }
    runtime.current ??= createTrackingRuntime({ document, browser: window, getUid: () => uid.current })
    return runtime.current.start()
  }, [])
  return null
}
