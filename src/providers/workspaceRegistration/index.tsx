import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { WorkspaceRegistrationContext } from '../../contexts/workspaceRegistration'
import { registerWorkspace, WorkspaceRegistrationError } from '../../services/workspaceRegistration'
import type { WorkspaceRegistrationDraft, WorkspaceRegistrationProviderProps } from '../../types/workspaceRegistration'
import { initialRegistrationState, registrationReducer } from '../../utils/workspaceRegistrationReducer'
import { readWorkspaceCodeEmail, saveWorkspaceCodeEmail } from '../../utils/workspaceCodeSession'
import { readRegistrationSession, saveRegistrationSession } from '../../utils/workspaceRegistrationSession'
import InitialLoadingState from '../../components/initialLoadingState'
import { keepRegistrationLoginCredentials } from '../../utils/workspaceRegistration'

function emptyDraft(): WorkspaceRegistrationDraft {
  return { email: readWorkspaceCodeEmail(), password: '', company: { name: '', cnpj: '' }, units: [], file: null }
}

function WorkspaceRegistrationProvider({ children }: WorkspaceRegistrationProviderProps) {
  const [draft, setDraft] = useState(emptyDraft)
  const draftRef = useRef(draft)
  const [verifiedEmail, setVerifiedEmail] = useState('')
  const [restoring, setRestoring] = useState(true)
  const [state, dispatch] = useReducer(registrationReducer, initialRegistrationState)
  const pending = useRef<Promise<boolean> | null>(null)
  const completed = useRef(false)
  const confirmedWithoutResult = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    let active = true
    void readRegistrationSession().then(saved => {
      if (!active) return
      if (saved) {
        draftRef.current = saved.draft
        setDraft(saved.draft)
        setVerifiedEmail(saved.verifiedEmail)
        completed.current = saved.state.status === 'success'
        confirmedWithoutResult.current = saved.state.failureStatus === 201
        dispatch({ type: 'restored', state: saved.state })
      }
      setRestoring(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (restoring) return
    const hasDraft = Boolean(draft.email || draft.password || draft.company.name || draft.company.cnpj || draft.file || draft.units.length || state.result)
    void saveRegistrationSession(hasDraft ? { draft, verifiedEmail, state } : null)
  }, [draft, verifiedEmail, state, restoring])

  const updateDraft = useCallback((changes: Partial<WorkspaceRegistrationDraft>) => {
    if (pending.current || completed.current) return
    if (changes.email !== undefined && changes.email.trim() !== draftRef.current.email.trim()) setVerifiedEmail('')
    if (changes.email !== undefined) saveWorkspaceCodeEmail(changes.email)
    draftRef.current = { ...draftRef.current, ...changes }
    setDraft(draftRef.current)
  }, [])

  const markEmailVerified = useCallback((email: string) => {
    if (email.trim() === draftRef.current.email.trim()) setVerifiedEmail(email.trim())
  }, [])

  const reset = useCallback(() => {
    if (pending.current) return
    saveWorkspaceCodeEmail('')
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
        saveWorkspaceCodeEmail('')
        draftRef.current = keepRegistrationLoginCredentials(draftRef.current)
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

  if (restoring) return <InitialLoadingState />
  return <WorkspaceRegistrationContext.Provider value={{ draft, verifiedEmail, markEmailVerified, ...state, updateDraft, submit, reset }}>{children}</WorkspaceRegistrationContext.Provider>
}

export default WorkspaceRegistrationProvider
