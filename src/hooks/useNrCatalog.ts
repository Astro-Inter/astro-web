import { useEffect, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { getNrReviewRepository } from '../services/nrReviewRepository'
import type { NrDemoScenario, NrDocument } from '../types/nrReview'

export function useNrCatalog(scenario: NrDemoScenario) {
  const { user } = useAuthentication()
  const repository = getNrReviewRepository(user?.uid ?? 'anonymous-demo', scenario)
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify([user?.uid, scenario, attempt])
  const [state, setState] = useState<{ key: string; rows: NrDocument[]; error: string }>({ key: '', rows: [], error: '' })
  useEffect(() => {
    const controller = new AbortController()
    void repository.listApproved(controller.signal).then(rows => {
      if (!controller.signal.aborted) setState({ key, rows, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, rows: [], error: error instanceof Error ? error.message : 'Não foi possível carregar o catálogo.' })
    })
    return () => controller.abort()
  }, [key, repository])
  return { rows: state.key === key ? state.rows : [], loading: state.key !== key, error: state.key === key ? state.error : '',
    retry: () => setAttempt(value => value + 1),
    save: async (document: NrDocument, expected: NrDocument): Promise<void> => {
      await repository.saveApproved(document, expected)
      setAttempt(value => value + 1)
    } }
}
