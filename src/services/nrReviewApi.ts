import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import type { NrCandidate, NrDocument, NrReviewRepository } from '../types/nrReview'
import { validateNrDocument } from '../utils/nrReview'

interface NrSnapshot extends NrCandidate { approvedRevision: string }

function content(document: NrDocument) {
  const { nome, descricao, objetivo, aplicabilidade, usabilidade, revogada, tempo_reciclagem_meses } = document
  return { nome, descricao, objetivo, aplicabilidade, usabilidade, revogada, tempo_reciclagem_meses }
}

export function createNrReviewApi(): NrReviewRepository {
  const revisions = new Map<string, string>()
  async function request(path: string, method = 'GET', payload?: object, signal?: AbortSignal, nullable = false): Promise<unknown> {
    const user = firebaseAuth.currentUser
    if (!user) throw new Error('Entre na sua conta para revisar as NRs.')
    const token = await user.getIdToken().catch((error: unknown) => {
      throw new Error('Não conseguimos verificar sua sessão. Confira sua conexão e entre novamente se o problema continuar.', { cause: error })
    })
    signal?.throwIfAborted()
    const response = await fetch(`${getSystemApiBaseUrl()}/admin/nrs${path}`, {
      method, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    }).catch((error: unknown) => {
      if (signal?.aborted) throw error
      throw new Error(error instanceof Error && error.name === 'TimeoutError'
        ? 'A consulta demorou mais que o esperado. Aguarde alguns instantes e tente novamente.'
        : 'Não conseguimos conectar ao serviço de normas. Confira sua conexão e tente novamente.', { cause: error })
    })
    if (nullable && response.status === 404) return null
    const body: unknown = await response.json().catch(() => null)
    const result = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null
    if (!response.ok || result?.success !== true) {
      throw new Error(response.status === 401 ? 'Sua sessão expirou. Entre novamente.'
        : response.status === 403 ? 'A revisão de NRs é permitida somente para administradores.'
        : response.status === 409 ? 'A versão da NR mudou. Feche e reabra a revisão para conferir os dados atuais.'
        : response.status === 429 ? 'Recebemos muitas solicitações em pouco tempo. Aguarde um momento antes de tentar novamente.'
        : response.status === 404 ? 'Este recurso de normas ainda não está disponível. Tente novamente mais tarde.'
        : response.status >= 500 ? 'O serviço de normas está temporariamente indisponível. Aguarde alguns instantes e tente novamente.'
        : response.status === 400 ? (typeof result?.message === 'string' ? result.message : 'Confira os campos da norma antes de continuar.')
        : 'Não foi possível concluir esta operação. Tente novamente em instantes.')
    }
    return result.data
  }
  function snapshot(value: unknown): NrSnapshot {
    if (!value || typeof value !== 'object') throw new Error('A API retornou uma NR inválida.')
    const item = value as Partial<NrSnapshot>
    if (!item.document || !Number.isSafeInteger(item.document._id) || item.document._id <= 0
      || !(['nome', 'descricao', 'objetivo', 'aplicabilidade', 'ultima_atualizacao', 'data_criacao'] as const).every(field => typeof item.document?.[field] === 'string')
      || typeof item.document.revogada !== 'boolean'
      || Object.keys(validateNrDocument(item.document)).length || typeof item.revision !== 'string'
      || !/^[a-f0-9]{64}$/.test(item.revision) || typeof item.approvedRevision !== 'string'
      || !/^([a-f0-9]{64}|absent)$/.test(item.approvedRevision)) throw new Error('A API retornou uma NR inválida.')
    revisions.set(JSON.stringify(item.document), item.revision)
    return item as NrSnapshot
  }
  async function list(path: string, signal?: AbortSignal): Promise<NrSnapshot[]> {
    const data = await request(path, 'GET', undefined, signal)
    if (!Array.isArray(data)) throw new Error('A API retornou uma listagem de NRs inválida.')
    return data.map(snapshot)
  }
  return {
    listPending: signal => list('/pendentes', signal),
    async getPending(id, signal) { const data = await request(`/pendentes/${id}`, 'GET', undefined, signal, true); return data === null ? null : snapshot(data) },
    async listApproved(signal) { return (await list('/catalogo', signal)).map(item => item.document) },
    async getApproved(id, signal) { const data = await request(`/catalogo/${id}`, 'GET', undefined, signal, true); return data === null ? null : snapshot(data).document },
    async saveApproved(document, expected, signal) {
      const revision = revisions.get(JSON.stringify(expected))
      if (!revision) throw new Error('Reabra a norma antes de salvar as alterações.')
      return snapshot(await request(`/catalogo/${document._id}`, 'PUT', { revision, content: content(document) }, signal)).document
    },
    async approve(candidate, signal, reviewedDocument) {
      if (!candidate.approvedRevision) throw new Error('Reabra a revisão para conferir a versão aprovada.')
      const result = await request(`/pendentes/${candidate.document._id}/aprovar`, 'POST', {
        revision: candidate.revision, approvedRevision: candidate.approvedRevision,
        ...(reviewedDocument ? { corrections: content(reviewedDocument) } : {}),
      }, signal)
      return { sqlSynchronized: typeof result === 'object' && result !== null && 'sqlSynchronized' in result && result.sqlSynchronized === true }
    },
  }
}
