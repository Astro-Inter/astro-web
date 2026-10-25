import { isNrReviewDemo } from '../data/nrReviewMode'
import type { NrDemoScenario, NrReviewRepository } from '../types/nrReview'
import { getNrReviewDemo } from './nrReview'
import { createNrReviewApi } from './nrReviewApi'

let session: { uid: string; repository: NrReviewRepository } | undefined
export function getNrReviewRepository(uid: string, scenario: NrDemoScenario): NrReviewRepository {
  if (isNrReviewDemo) return getNrReviewDemo(uid, scenario)
  if (session?.uid !== uid) session = { uid, repository: createNrReviewApi() }
  return session.repository
}
