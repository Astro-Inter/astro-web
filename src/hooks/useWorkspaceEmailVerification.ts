import { useEffect, useRef, useState } from 'react'
import { addManagerEmail, isWorkspaceCodeAlreadySent, verifyWorkspaceKey } from '../services/workspaceEmail'
import type { WorkspaceEmailVerificationState } from '../types/workspaceRegistration'
import { getWorkspaceCodeWait, reserveWorkspaceCodeRequest } from '../utils/workspaceCodeCooldown'

export function useWorkspaceEmailVerification() {
  const [state, setState] = useState<WorkspaceEmailVerificationState>({ status: 'idle', message: '' })
  const busy = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function perform(operation: () => Promise<void>, successMessage: string, requestingCode = false): Promise<'success' | 'already-sent' | 'error'> {
    if (busy.current) return 'error'
    busy.current = true
    setState({ status: 'loading', message: '' })
    try {
      await operation()
      if (!mounted.current) return 'error'
      setState({ status: 'success', message: successMessage })
      return 'success'
    } catch (error: unknown) {
      if (requestingCode && isWorkspaceCodeAlreadySent(error)) {
        if (mounted.current) setState({ status: 'success', message: 'Já foi enviado um código para este e-mail.' })
        return mounted.current ? 'already-sent' : 'error'
      }
      if (mounted.current) setState({ status: 'error', message: error instanceof Error ? error.message : 'Não foi possível concluir a solicitação.' })
      return 'error'
    } finally {
      busy.current = false
    }
  }

  function requestCode(email: string): Promise<'success' | 'already-sent' | 'error'> {
    if (busy.current) return Promise.resolve('error')
    if (!reserveWorkspaceCodeRequest(email)) {
      setState({ status: 'error', message: `Aguarde ${getWorkspaceCodeWait(email)} segundos para reenviar o código.` })
      return Promise.resolve('error')
    }
    return perform(() => addManagerEmail(email), 'Solicitação de envio do código recebida.', true)
  }

  async function verifyCode(accessKey: string, requestedEmail = ''): Promise<string | null> {
    let verifiedEmail: string | null = null
    const result = await perform(async () => { verifiedEmail = await verifyWorkspaceKey(accessKey, requestedEmail) }, 'Chave de acesso verificada.')
    return result === 'success' ? verifiedEmail : null
  }

  function clearError() {
    if (!busy.current) setState(current => current.status === 'error' ? { status: 'idle', message: '' } : current)
  }

  return { ...state, requestCode, verifyCode, clearError }
}
