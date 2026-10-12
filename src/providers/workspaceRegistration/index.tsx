import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { WorkspaceRegistrationContext } from '../../contexts/workspaceRegistration'
import { registerWorkspace, WorkspaceRegistrationError } from '../../services/workspaceRegistration'
import type { WorkspaceRegistrationDraft, WorkspaceRegistrationProviderProps } from '../../types/workspaceRegistration'
import { initialRegistrationState, registrationReducer } from '../../utils/workspaceRegistrationReducer'

function emptyDraft(): WorkspaceRegistrationDraft {
  return { email: '', password: '', company: { name: '', cnpj: '' }, units: [], file: null }
}

function WorkspaceRegistrationProvider({ children }: WorkspaceRegistrationProviderProps) {
  const [draft, setDraft] = useState(emptyDraft)
  const draftRef = useRef(draft)
  const [verifiedEmail, setVerifiedEmail] = useState('')
  const [state, dispatch] = useReducer(registrationReducer, initialRegistrationState)
  const pending = useRef<Promise<boolean> | null>(null)
  const completed = useRef(false)
  const confirmedWithoutResult = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const updateDraft = useCallback((changes: Partial<WorkspaceRegistrationDraft>) => {
    if (pending.current || completed.current) return
    if (changes.email !== undefined && changes.email.trim() !== draftRef.current.email.trim()) setVerifiedEmail('')
    draftRef.current = { ...draftRef.current, ...changes }
    setDraft(draftRef.current)
  }, [])

  const markEmailVerified = useCallback((email: string) => {
    if (email.trim() === draftRef.current.email.trim()) setVerifiedEmail(email.trim())
  }, [])

  const reset = useCallback(() => {
    if (pending.current) return
    draftRef.current = emptyDraft()
    completed.current = false
    confirmedWithoutResult.current = false
    setDraft(draftRef.current)
    setVerifiedEmail('')
    dispatch({ type: 'reset' })
  }, [])

  const submit = useCallback((): Promise<boolean> => {
    if (completed.current) return Promise.resolve(true)
    if (confirmedWithoutResult.current) return Promise.resolve(false)
    if (pending.current) return pending.current
    dispatch({ type: 'started' })
    // Mantém a mesma promessa entre remontagens/StrictMode. Cancelar um POST
    // já enviado não garante que o backend tenha cancelado a criação.
    pending.current = (async () => {
      try {
        const result = await registerWorkspace(draftRef.current)
        completed.current = true
        draftRef.current = emptyDraft()
        if (mounted.current) {
          setDraft(draftRef.current)
          setVerifiedEmail('')
          dispatch({ type: 'succeeded', result })
        }
        return true
      } catch (error: unknown) {
        if (error instanceof WorkspaceRegistrationError && error.status === 201) confirmedWithoutResult.current = true
        if (mounted.current) dispatch({
          type: 'failed',
          failureStatus: error instanceof WorkspaceRegistrationError ? error.status : 0,
          error: error instanceof Error ? error.message : 'Não foi possível concluir o cadastro.',
          importErrors: error instanceof WorkspaceRegistrationError ? error.importErrors : [],
        })
        return false
      } finally {
        pending.current = null
      }
    })()
    return pending.current
  }, [])

  return <WorkspaceRegistrationContext.Provider value={{ draft, verifiedEmail, markEmailVerified, ...state, updateDraft, submit, reset }}>{children}</WorkspaceRegistrationContext.Provider>
}

export default WorkspaceRegistrationProvider
