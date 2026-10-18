import { notifyAction } from '../utils/actionFeedback'
import { useEffect, useRef, useState } from 'react'
import { getAccountDetails, refreshAccountIdentity, sendAccountEmailVerification, updateAccountDetails } from '../services/account'
import { listRoles } from '../services/roles'
import { listUnits } from '../services/units'
import type { AccountDetails, AccountFormValues } from '../types/account'
import type { Position } from '../types/position'
import type { Unit } from '../types/unit'

interface DetailsState {
  data: AccountDetails | null
  roles: Position[]
  units: Unit[]
  loading: boolean
  error: string
}

export function useAccountDetails(editable: boolean, canChangeLinks: boolean) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<DetailsState>({ data: null, roles: [], units: [], loading: true, error: '' })
  const [submission, setSubmission] = useState({ pending: false, error: '', message: '', emailChanged: false })
  const requestRef = useRef<AbortController | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; requestRef.current?.abort() }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const data = await getAccountDetails(controller.signal)
        const [roles, units] = editable && canChangeLinks
          ? await Promise.all([listRoles(controller.signal), listUnits(controller.signal)]) : [[], []]
        if (!controller.signal.aborted) setState({ data, roles, units, loading: false, error: '' })
      } catch (error: unknown) {
        if (!controller.signal.aborted) setState({ data: null, roles: [], units: [], loading: false,
          error: error instanceof Error ? error.message : 'Não foi possível consultar os detalhes da conta.' })
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, editable, canChangeLinks])

  async function save(values: AccountFormValues): Promise<AccountDetails | null> {
    if (requestRef.current || !state.data) return null
    const controller = new AbortController()
    requestRef.current = controller
    setSubmission({ pending: true, error: '', message: '', emailChanged: false })
    try {
      const data = await updateAccountDetails(values, controller.signal)
      if (!mounted.current || controller.signal.aborted) return null
      const emailChanged = data.email.toLowerCase() !== state.data.email.toLowerCase()
      let message = 'Informações da conta atualizadas.'
      if (emailChanged) {
        message += ' Confirme seu novo e-mail.'
        try { await refreshAccountIdentity() } catch (error: unknown) { message = error instanceof Error ? error.message : message }
      }
      if (!mounted.current || controller.signal.aborted) return null
      setState(current => ({ ...current, data }))
      setSubmission({ pending: false, error: '', message, emailChanged })
      notifyAction(message)
      return data
    } catch (error: unknown) {
      if (mounted.current && !controller.signal.aborted) {
        const message = error instanceof Error ? error.message : 'Não foi possível salvar sua conta.'
        setSubmission({ pending: false, message: '', emailChanged: false, error: message })
        notifyAction(message, 'error')
      }
      return null
    } finally { if (requestRef.current === controller) requestRef.current = null }
  }

  async function verifyEmail(): Promise<void> {
    if (requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setSubmission(current => ({ ...current, pending: true, error: '' }))
    try {
      await sendAccountEmailVerification()
      if (mounted.current && !controller.signal.aborted) {
        setSubmission(current => ({ ...current, pending: false, message: 'Confirmação enviada. Confira a caixa de entrada do novo e-mail.' }))
        notifyAction('Confirmação enviada. Confira a caixa de entrada do novo e-mail.')
      }
    } catch (error: unknown) {
      if (mounted.current && !controller.signal.aborted) {
        const message = error instanceof Error ? error.message : 'Não foi possível enviar a confirmação.'
        setSubmission(current => ({ ...current, pending: false, error: message }))
        notifyAction(message, 'error')
      }
    } finally { if (requestRef.current === controller) requestRef.current = null }
  }

  return { ...state, submission, save, verifyEmail, retry: () => { setState({ data: null, roles: [], units: [], loading: true, error: '' }); setAttempt(value => value + 1) } }
}
