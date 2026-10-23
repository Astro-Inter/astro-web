import { useEffect, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { listEventCandidates, listEventNrs } from '../services/events'
import { candidateForEvent } from '../utils/eventApi'
import type { EventCollaborator } from '../types/eventCreation'
import type { EventNrOption } from '../types/events'

interface CandidatesState { key: string; collaborators: EventCollaborator[]; nrs: EventNrOption[]; loading: boolean; error: string }
interface EventCandidatesResult extends Omit<CandidatesState, 'key'> { retry: () => void }
export function useEventCandidates(nr: string): EventCandidatesResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [attempt, setAttempt] = useState(0)
  const key = `${uid ?? ''}/${nr}/${attempt}`
  const [state, setState] = useState<CandidatesState>({ key: '', collaborators: [], nrs: [], loading: true, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    Promise.all([listEventCandidates(nr || undefined, controller.signal), listEventNrs(controller.signal)]).then(([people, nrs]) => {
      if (!controller.signal.aborted) setState({ key, collaborators: people.map(candidateForEvent), nrs, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, collaborators: [], nrs: [], loading: false, error: error instanceof Error ? error.message : 'Não foi possível carregar os participantes.' })
    })
    return () => controller.abort()
  }, [uid, nr, key])
  return { ...(state.key === key ? state : { collaborators: [], nrs: state.nrs, loading: true, error: '' }), retry: () => setAttempt(current => current + 1) }
}
