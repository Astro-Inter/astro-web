import { useEffect, useRef, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { changeManagerStatus, getManager, listManagers, promoteManager, updateManager } from '../services/managers'
import { listRoles } from '../services/roles'
import { listUnits } from '../services/units'
import type { ManagerSummary, ManagerDetails, ManagerFormValues, ManagerInviteValues } from '../types/manager'
import type { Collaborator, CollaboratorOptions as ManagerOptions } from '../types/collaborator'
import { listCollaborators } from '../services/collaborators'

interface LoadState<T> { key: string; data: T; loading: boolean; error: string }
export type ManagerMutationResult = { error: null; manager: ManagerDetails } | { error: string; manager: null }
interface ManagersResult {
  managers: ManagerSummary[]
  loading: boolean
  error: string
  saving: boolean
  details: Omit<LoadState<ManagerDetails | null>, 'key'>
  options: Omit<LoadState<ManagerOptions>, 'key'>
  candidates: Omit<LoadState<Collaborator[]>, 'key'>
  retry: () => void
  retryDetails: () => void
  retryOptions: () => void
  retryCandidates: () => void
  promote: (values: ManagerInviteValues) => Promise<ManagerMutationResult>
  save: (values: ManagerFormValues, id: string) => Promise<ManagerMutationResult>
  changeStatus: (id: string, status: 'ATIVO' | 'DESATIVADO') => Promise<ManagerMutationResult>
}
const emptyOptions: ManagerOptions = { positions: [], units: [] }
function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação. Tente novamente.'
}

export function useManagers(managerId?: string, needsOptions = false, needsCandidates = false): ManagersResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [list, setList] = useState<LoadState<ManagerSummary[]>>({ key: '', data: [], loading: true, error: '' })
  const [details, setDetails] = useState<LoadState<ManagerDetails | null>>({ key: '', data: null, loading: true, error: '' })
  const [options, setOptions] = useState<LoadState<ManagerOptions>>({ key: '', data: emptyOptions, loading: true, error: '' })
  const [candidates, setCandidates] = useState<LoadState<Collaborator[]>>({ key: '', data: [], loading: true, error: '' })
  const [retries, setRetries] = useState({ list: 0, details: 0, options: 0, candidates: 0 })
  const [mutation, setMutation] = useState({ uid: '', saving: false })
  const saving = mutation.uid === uid && mutation.saving
  const listKey = `${uid ?? ''}/${retries.list}`
  const detailsKey = `${uid ?? ''}/${managerId ?? ''}/${retries.details}`
  const optionsKey = `${uid ?? ''}/${retries.options}`
  const candidatesKey = `${uid ?? ''}/${retries.candidates}`
  const busy = useRef(false)
  const session = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    session.current = controller
    return () => controller.abort()
  }, [uid])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    listManagers(controller.signal).then((data) => {
      if (!controller.signal.aborted) setList({ key: listKey, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setList({ key: listKey, data: [], loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [uid, listKey])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid || !managerId) return () => controller.abort()
    getManager(managerId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setDetails({ key: detailsKey, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setDetails({ key: detailsKey, data: null, loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [uid, managerId, detailsKey])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid || !needsOptions) return () => controller.abort()
    Promise.all([listRoles(controller.signal), listUnits(controller.signal)]).then(([positions, units]) => {
      if (!controller.signal.aborted) setOptions({ key: optionsKey, data: { positions, units }, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setOptions({ key: optionsKey, data: emptyOptions, loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [uid, needsOptions, optionsKey])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid || !needsCandidates) return () => controller.abort()
    listCollaborators(controller.signal).then((data) => {
      if (!controller.signal.aborted) setCandidates({ key: candidatesKey, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setCandidates({ key: candidatesKey, data: [], loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [uid, needsCandidates, candidatesKey])

  async function mutate(operation: () => Promise<ManagerDetails>, id?: string): Promise<ManagerMutationResult> {
    if (!uid) return { error: 'Entre na sua conta para gerenciar os gestores.', manager: null }
    if (busy.current) return { error: 'Aguarde a operação em andamento.', manager: null }
    const currentSession = session.current
    busy.current = true
    setMutation({ uid, saving: true })
    try {
      const manager = await operation()
      if (currentSession?.signal.aborted || session.current !== currentSession) {
        return { error: 'A sessão mudou durante a operação. Recarregue os gestores.', manager: null }
      }
      if (uid) {
        setList((current) => current.key === listKey ? { ...current, data: (id
          ? current.data.map((row) => row.id === id ? manager : row)
          : [...current.data.filter((row) => row.id !== manager.id), manager])
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || Number(a.id) - Number(b.id)) } : current)
        setDetails((current) => current.key === detailsKey && managerId === manager.id ? { ...current, data: manager } : current)
        setCandidates((current) => current.key === candidatesKey ? { ...current, data: current.data.filter((row) => row.id !== manager.id) } : current)
      }
      return { error: null, manager }
    } catch (error: unknown) {
      return { error: message(error), manager: null }
    } finally {
      busy.current = false
      if (!currentSession?.signal.aborted && session.current === currentSession) setMutation({ uid, saving: false })
    }
  }

  return {
    managers: list.key === listKey ? list.data : [], loading: list.key !== listKey || list.loading,
    error: list.key === listKey ? list.error : '', saving,
    details: details.key === detailsKey ? details : { data: null, loading: true, error: '' },
    options: options.key === optionsKey ? options : { data: emptyOptions, loading: true, error: '' },
    candidates: candidates.key === candidatesKey ? { ...candidates, data: candidates.data.filter((row) => row.status === 'ATIVO' && !list.data.some((manager) => manager.id === row.id)) } : { data: [], loading: true, error: '' },
    retry: () => setRetries((current) => ({ ...current, list: current.list + 1 })),
    retryDetails: () => setRetries((current) => ({ ...current, details: current.details + 1 })),
    retryOptions: () => setRetries((current) => ({ ...current, options: current.options + 1 })),
    retryCandidates: () => setRetries((current) => ({ ...current, candidates: current.candidates + 1 })),
    promote: (values) => {
      if (candidates.key !== candidatesKey || candidates.loading || candidates.error
        || !candidates.data.some((row) => row.id === values.collaboratorId && row.status === 'ATIVO')
        || list.data.some((row) => row.id === values.collaboratorId)) {
        return Promise.resolve({ error: 'Selecione um colaborador ativo disponível.', manager: null })
      }
      return mutate(() => promoteManager(values))
    },
    save: (values, id) => mutate(() => updateManager(id, values), id),
    changeStatus: (id, status) => mutate(() => changeManagerStatus(id, status), id),
  }
}
