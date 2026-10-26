import { useEffect, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { listEventCandidates, listEventNrs } from '../services/events'
import { candidateForEvent } from '../utils/eventApi'
import type { EventCollaborator } from '../types/eventCreation'
import type { EventNrOption } from '../types/events'

interface CandidatesState { key: string; collaborators: EventCollaborator[]; error: string }
interface NrsState { key: string; nrs: EventNrOption[]; error: string }
interface EventCandidatesResult {
  collaborators: EventCollaborator[]
  nrs: EventNrOption[]
  loading: boolean
  nrsLoading: boolean
  error: string
  retry: () => void
}
export function useEventCandidates(nr: string): EventCandidatesResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [attempt, setAttempt] = useState(0)
  const key = `${uid ?? ''}/${nr}/${attempt}`
  const nrsKey = `${uid ?? ''}/${attempt}`
  const [state, setState] = useState<CandidatesState>({ key: '', collaborators: [], error: '' })
  const [catalog, setCatalog] = useState<NrsState>({ key: '', nrs: [], error: '' })
  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    listEventNrs(controller.signal).then(nrs => {
      if (!controller.signal.aborted) setCatalog({ key: nrsKey, nrs, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setCatalog({ key: nrsKey, nrs: [], error: error instanceof Error ? error.message : 'Não foi possível carregar as NRs.' })
    })
    return () => controller.abort()
  }, [uid, nrsKey])
  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    listEventCandidates(nr || undefined, controller.signal).then(people => {
      if (!controller.signal.aborted) setState({ key, collaborators: people.map(candidateForEvent), error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, collaborators: [], error: error instanceof Error ? error.message : 'Não foi possível carregar os participantes.' })
    })
    return () => controller.abort()
  }, [uid, nr, key])
  const nrsLoading = catalog.key !== nrsKey
  return {
    collaborators: state.key === key ? state.collaborators : [],
    nrs: nrsLoading ? [] : catalog.nrs,
    loading: nrsLoading || state.key !== key,
    nrsLoading,
    error: (nrsLoading ? '' : catalog.error) || (state.key === key ? state.error : ''),
    retry: () => setAttempt(current => current + 1),
  }
}
