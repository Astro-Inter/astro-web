import { useEffect, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { getNrReviewRepository } from '../services/nrReviewRepository'
import type { NrCandidate, NrDemoScenario, NrDocument } from '../types/nrReview'

interface NrReviewData { candidates: NrCandidate[]; approved: Record<number, NrDocument | null> }
interface NrReviewState { key: string; data: NrReviewData | null; loading: boolean; error: string }
export function useNrReview(scenario: NrDemoScenario, id?: number | null) {
  const { user } = useAuthentication()
  const repository = getNrReviewRepository(user?.uid ?? 'anonymous-demo', scenario)
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify([user?.uid, scenario, id, attempt])
  const [state, setState] = useState<NrReviewState>({ key: '', data: null, loading: true, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    async function load(): Promise<void> {
      try {
        const candidates = id === null ? [] : id === undefined ? await repository.listPending(controller.signal)
          : [await repository.getPending(id, controller.signal)].filter((item): item is NrCandidate => item !== null)
        const versions = await Promise.all(candidates.map(async item => [item.document._id, await repository.getApproved(item.document._id, controller.signal)] as const))
        if (!controller.signal.aborted) setState({ key, data: { candidates, approved: Object.fromEntries(versions) }, loading: false, error: '' })
      } catch (error: unknown) {
        if (!controller.signal.aborted) setState({ key, data: null, loading: false, error: error instanceof Error ? error.message : 'Não foi possível carregar as NRs.' })
      }
    }
    void load()
    return () => controller.abort()
  }, [key, repository, id])
  return { ...(state.key === key ? state : { data: null, loading: true, error: '' }),
    retry: () => setAttempt(value => value + 1), approve: (candidate: NrCandidate, reviewedDocument?: NrDocument) => repository.approve(candidate, undefined, reviewedDocument) }
}
