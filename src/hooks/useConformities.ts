import { useEffect, useRef, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { listUnits } from '../services/units'
import { listUnitConformities, getUnitConformity, saveUnitConformity, changeUnitConformityApplicability } from '../services/unitConformities'
import type { Unit } from '../types/unit'
import type { ConformityType } from '../types/conformity'
import { listCollaborators } from '../services/collaborators'
import { changeConformityApplicability, createConformity, getConformity, importConformities, listConformities, listConformityNrs, updateConformity } from '../services/conformities'
import type { Collaborator } from '../types/collaborator'
import type { ConformityDetails, ConformityFormValues, ConformityImportResult, ConformityNrOption } from '../types/conformity'

interface LoadState<T> { key: string; data: T; loading: boolean; error: string }
interface ConformityOptions { employees: Collaborator[]; units: Unit[]; nrs: ConformityNrOption[] }
type MutationResult<T> = { error: null; data: T } | { error: string; data: null }
interface ConformitiesResult {
  conformities: ConformityDetails[]
  loading: boolean
  error: string
  saving: boolean
  details: Omit<LoadState<ConformityDetails | null>, 'key'>
  options: Omit<LoadState<ConformityOptions>, 'key'>
  retry: () => void
  retryDetails: () => void
  retryOptions: () => void
  save: (values: ConformityFormValues, id?: string) => Promise<MutationResult<ConformityDetails>>
  changeApplicability: (id: string, applicable: boolean) => Promise<MutationResult<ConformityDetails>>
  importFile: (file: File) => Promise<MutationResult<ConformityImportResult>>
}
const emptyOptions: ConformityOptions = { employees: [], units: [], nrs: [] }
function message(error: unknown): string { return error instanceof Error ? error.message : 'Não foi possível concluir a operação. Tente novamente.' }

export function useConformities(conformityId?: string, needsOptions = false, needsEmployees = false, type: ConformityType = 'COLABORADOR'): ConformitiesResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [list, setList] = useState<LoadState<ConformityDetails[]>>({ key: '', data: [], loading: true, error: '' })
  const [details, setDetails] = useState<LoadState<ConformityDetails | null>>({ key: '', data: null, loading: true, error: '' })
  const [options, setOptions] = useState<LoadState<ConformityOptions>>({ key: '', data: emptyOptions, loading: true, error: '' })
  const [retries, setRetries] = useState({ list: 0, details: 0, options: 0 })
  const [mutation, setMutation] = useState({ uid: '', saving: false })
  const mutationController = useRef<AbortController | null>(null)
  const session = useRef<string | undefined>(undefined)
  const listKey = `${type}/${uid ?? ''}/${retries.list}`
  const detailsKey = `${type}/${uid ?? ''}/${conformityId ?? ''}/${retries.details}`
  const optionsKey = `${type}/${uid ?? ''}/${needsEmployees}/${retries.options}`

  useEffect(() => {
    session.current = uid
    return () => {
      session.current = undefined
      mutationController.current?.abort()
      mutationController.current = null
    }
  }, [uid])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    const load = type === 'UNIDADE' ? listUnitConformities : listConformities
    load(controller.signal).then(data => {
      if (!controller.signal.aborted) setList({ key: listKey, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setList({ key: listKey, data: [], loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [uid, listKey, type])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid || !conformityId) return () => controller.abort()
    const load = type === 'UNIDADE' ? getUnitConformity : getConformity
    load(conformityId, controller.signal).then(data => {
      if (!controller.signal.aborted) setDetails({ key: detailsKey, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setDetails({ key: detailsKey, data: null, loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [uid, conformityId, detailsKey, type])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid || !needsOptions) return () => controller.abort()
    Promise.all([listConformityNrs(controller.signal), needsEmployees && type === 'COLABORADOR' ? listCollaborators(controller.signal) : Promise.resolve([]), needsEmployees && type === 'UNIDADE' ? listUnits(controller.signal) : Promise.resolve([])]).then(([nrs, employees, units]) => {
      if (!controller.signal.aborted) setOptions({ key: optionsKey, data: { nrs, units: units.filter(unit => unit.active), employees: employees.filter(employee => employee.status === 'ATIVO') }, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setOptions({ key: optionsKey, data: emptyOptions, loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [uid, needsOptions, needsEmployees, optionsKey, type])

  async function mutate<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<MutationResult<T>> {
    if (!uid) return { error: 'Entre na sua conta para gerenciar as conformidades.', data: null }
    if (mutationController.current) return { error: 'Aguarde a operação em andamento.', data: null }
    const controller = new AbortController()
    mutationController.current = controller
    setMutation({ uid, saving: true })
    try {
      const data = await operation(controller.signal)
      if (controller.signal.aborted || session.current !== uid) return { error: 'A sessão mudou. Consulte a lista antes de tentar novamente.', data: null }
      // A view pode passar a representar outro registro do histórico após qualquer escrita.
      setRetries(current => ({ ...current, list: current.list + 1 }))
      return { error: null, data }
    } catch (error: unknown) {
      return { error: message(error), data: null }
    } finally {
      if (mutationController.current === controller) mutationController.current = null
      if (!controller.signal.aborted && session.current === uid) setMutation({ uid, saving: false })
    }
  }

  return {
    conformities: list.key === listKey ? list.data : [], loading: list.key !== listKey || list.loading,
    error: list.key === listKey ? list.error : '', saving: mutation.uid === uid && mutation.saving,
    details: details.key === detailsKey ? details : { data: null, loading: true, error: '' },
    options: options.key === optionsKey ? options : { data: emptyOptions, loading: true, error: '' },
    retry: () => setRetries(current => ({ ...current, list: current.list + 1 })),
    retryDetails: () => setRetries(current => ({ ...current, details: current.details + 1 })),
    retryOptions: () => setRetries(current => ({ ...current, options: current.options + 1 })),
    save: (values, id) => mutate(signal => type === 'UNIDADE' ? saveUnitConformity(values, id, signal) : id ? updateConformity(id, values, signal) : createConformity(values, signal)),
    changeApplicability: (id, applicable) => mutate(signal => type === 'UNIDADE' ? changeUnitConformityApplicability(id, applicable, signal) : changeConformityApplicability(id, applicable, signal)),
    importFile: file => mutate(signal => importConformities(file, signal)),
  }
}
