import { approvedNrExamples, pendingNrExamples } from '../data/nrReview'
import type { NrCandidate, NrDemoScenario, NrDocument, NrReviewRepository } from '../types/nrReview'
import { validateNrDocument } from '../utils/nrReview'

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Operação cancelada', 'AbortError')) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, ms)
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
  })
}

/** Entirely in-memory demo. No API, database publication, or persistent storage. */
export function createNrReviewDemo(options: { scenario?: NrDemoScenario; delay?: number } = {}): NrReviewRepository {
  const scenario = options.scenario ?? 'normal'
  const pending = new Map<number, NrCandidate>((scenario === 'empty' ? [] : pendingNrExamples).map(document => [document._id, { document: { ...document }, revision: JSON.stringify(document) }]))
  const approved = new Map<number, NrDocument>(approvedNrExamples.map(document => [document._id, { ...document }]))
  const pause = (signal?: AbortSignal) => wait(options.delay ?? (scenario === 'slow' ? 4000 : 450), signal)
  async function read(signal?: AbortSignal): Promise<void> {
    await pause(signal)
    if (scenario === 'load-error') throw new Error('Falha simulada ao carregar as NRs. Tente novamente ou altere o cenário.')
  }
  return {
    async listPending(signal) { await read(signal); return structuredClone([...pending.values()]) },
    async getPending(id, signal) { await read(signal); return structuredClone(pending.get(id) ?? null) },
    async getApproved(id, signal) { await read(signal); return structuredClone(approved.get(id) ?? null) },
    async listApproved(signal) { await read(signal); return structuredClone([...approved.values()]) },
    async saveApproved(document, expected, signal) {
      await pause(signal)
      const errors = validateNrDocument(document)
      if (Object.keys(errors).length) throw new Error('Confira os campos da norma antes de salvar.')
      if (scenario === 'approval-error') throw new Error('Falha simulada ao salvar. As alterações não foram aplicadas.')
      const current = approved.get(document._id)
      if (!current || JSON.stringify(current) !== JSON.stringify(expected)) throw new Error('A versão atual mudou. Reabra a norma para editar novamente.')
      if (document._id !== expected._id || document.data_criacao !== expected.data_criacao) throw new Error('A identificação e a data de criação não podem ser alteradas.')
      approved.set(document._id, structuredClone(document))
      return structuredClone(document)
    },
    async approve(candidate, signal, reviewedDocument) {
      await pause(signal)
      if (scenario === 'approval-error') throw new Error('Falha simulada na aprovação. A NR continua pendente; tente o cenário padrão para simular sucesso.')
      const current = pending.get(candidate.document._id)
      if (!current || current.revision !== candidate.revision || JSON.stringify(current.document) !== JSON.stringify(candidate.document)) {
        throw new Error('O candidato mudou ou já foi aprovado. Volte à listagem e revise novamente.')
      }
      if (reviewedDocument) {
        if (reviewedDocument._id !== current.document._id || reviewedDocument.data_criacao !== current.document.data_criacao || reviewedDocument.ultima_atualizacao !== current.document.ultima_atualizacao || Object.keys(validateNrDocument(reviewedDocument)).length) {
          throw new Error('Confira os campos corrigidos. Número, data da fonte e criação devem ser preservados.')
        }
        approved.set(reviewedDocument._id, structuredClone(reviewedDocument))
      }
      // Exact snapshot check happens before changing either in-memory collection.
      pending.delete(candidate.document._id)
    },
  }
}

let session: { uid: string; repositories: Map<NrDemoScenario, NrReviewRepository> } | undefined
export function getNrReviewDemo(uid: string, scenario: NrDemoScenario): NrReviewRepository {
  if (session?.uid !== uid) session = { uid, repositories: new Map() }
  let repository = session.repositories.get(scenario)
  if (!repository) { repository = createNrReviewDemo({ scenario }); session.repositories.set(scenario, repository) }
  return repository
}
