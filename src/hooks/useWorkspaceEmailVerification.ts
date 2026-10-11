import { useEffect, useRef, useState } from 'react'
import { addManagerEmail, verifyManagerEmail } from '../services/workspaceEmail'
import type { WorkspaceEmailVerificationState } from '../types/workspaceRegistration'

export function useWorkspaceEmailVerification() {
  const [state, setState] = useState<WorkspaceEmailVerificationState>({ status: 'idle', message: '' })
  const busy = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function perform(operation: () => Promise<void>, successMessage: string): Promise<boolean> {
    if (busy.current) return false
    busy.current = true
    setState({ status: 'loading', message: '' })
    try {
      await operation()
      if (!mounted.current) return false
      setState({ status: 'success', message: successMessage })
      return true
    } catch (error: unknown) {
      if (mounted.current) setState({ status: 'error', message: error instanceof Error ? error.message : 'Não foi possível concluir a solicitação.' })
      return false
    } finally {
      busy.current = false
    }
  }

  function requestCode(email: string): Promise<boolean> {
    return perform(() => addManagerEmail(email), 'Solicitação de envio do código recebida.')
  }

  function verifyCode(email: string, accessKey: string): Promise<boolean> {
    return perform(() => verifyManagerEmail(email, accessKey), 'Chave de acesso verificada.')
  }

  return { ...state, requestCode, verifyCode }
}
