import { useEffect, useRef, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { changeCollaboratorStatus, createCollaborator, getCollaborator, listCollaborators, updateCollaborator } from '../services/collaborators'
import { listRoles } from '../services/roles'
import { listUnits } from '../services/units'
import type { Collaborator, CollaboratorDetails, CollaboratorFormValues, CollaboratorOptions } from '../types/collaborator'

interface LoadState<T> { key: string; data: T; loading: boolean; error: string }
export type CollaboratorMutationResult = { error: null; collaborator: CollaboratorDetails } | { error: string; collaborator: null }
interface CollaboratorsResult {
  employees: Collaborator[]
  loading: boolean
  error: string
  saving: boolean
  details: Omit<LoadState<CollaboratorDetails | null>, 'key'>
  options: Omit<LoadState<CollaboratorOptions>, 'key'>
  retry: () => void
  retryDetails: () => void
  retryOptions: () => void
  save: (values: CollaboratorFormValues, id?: string) => Promise<CollaboratorMutationResult>
  changeStatus: (id: string, status: 'ATIVO' | 'DESATIVADO') => Promise<CollaboratorMutationResult>
}
const emptyOptions: CollaboratorOptions = { positions: [], units: [] }
function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação. Tente novamente.'
}

export function useCollaborators(collaboratorId?: string, needsOptions = false): CollaboratorsResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [list, setList] = useState<LoadState<Collaborator[]>>({ key: '', data: [], loading: true, error: '' })
  const [details, setDetails] = useState<LoadState<CollaboratorDetails | null>>({ key: '', data: null, loading: true, error: '' })
  const [options, setOptions] = useState<LoadState<CollaboratorOptions>>({ key: '', data: emptyOptions, loading: true, error: '' })
  const [retries, setRetries] = useState({ list: 0, details: 0, options: 0 })
  const [mutation, setMutation] = useState({ uid: '', saving: false })
  const saving = mutation.uid === uid && mutation.saving
  const listKey = `${uid ?? ''}/${retries.list}`
  const detailsKey = `${uid ?? ''}/${collaboratorId ?? ''}/${retries.details}`
  const optionsKey = `${uid ?? ''}/${retries.options}`
  const busy = useRef(false)
  const session = useRef<string | undefined>(undefined)
  useEffect(() => {
    session.current = uid
    return () => { session.current = undefined }
  }, [uid])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    listCollaborators(controller.signal).then((data) => {
      if (!controller.signal.aborted) setList({ key: listKey, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setList({ key: listKey, data: [], loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [uid, listKey])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid || !collaboratorId) return () => controller.abort()
    getCollaborator(collaboratorId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setDetails({ key: detailsKey, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setDetails({ key: detailsKey, data: null, loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [uid, collaboratorId, detailsKey])

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

  async function mutate(operation: () => Promise<CollaboratorDetails>, id?: string): Promise<CollaboratorMutationResult> {
    if (!uid) return { error: 'Entre na sua conta para gerenciar os colaboradores.', collaborator: null }
    if (busy.current) return { error: 'Aguarde a operação em andamento.', collaborator: null }
    busy.current = true
    setMutation({ uid, saving: true })
    try {
      const collaborator = await operation()
      if (session.current === uid && uid) {
        setList((current) => current.key === listKey ? { ...current, data: (id
          ? current.data.map((row) => row.id === id ? collaborator : row)
          : [...current.data.filter((row) => row.id !== collaborator.id), collaborator])
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || Number(a.id) - Number(b.id)) } : current)
        setDetails((current) => current.key === detailsKey && collaboratorId === collaborator.id ? { ...current, data: collaborator } : current)
      }
      return { error: null, collaborator }
    } catch (error: unknown) {
      return { error: message(error), collaborator: null }
    } finally {
      busy.current = false
      if (session.current === uid) setMutation({ uid, saving: false })
    }
  }

  return {
    employees: list.key === listKey ? list.data : [], loading: list.key !== listKey || list.loading,
    error: list.key === listKey ? list.error : '', saving,
    details: details.key === detailsKey ? details : { data: null, loading: true, error: '' },
    options: options.key === optionsKey ? options : { data: emptyOptions, loading: true, error: '' },
    retry: () => setRetries((current) => ({ ...current, list: current.list + 1 })),
    retryDetails: () => setRetries((current) => ({ ...current, details: current.details + 1 })),
    retryOptions: () => setRetries((current) => ({ ...current, options: current.options + 1 })),
    save: (values, id) => mutate(() => id ? updateCollaborator(id, values) : createCollaborator(values), id),
    changeStatus: (id, status) => mutate(() => changeCollaboratorStatus(id, status), id),
  }
}
