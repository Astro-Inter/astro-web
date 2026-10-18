import { firebaseAuth } from './firebase'
import type { NrRecommendation, PositionNrRecommendationsResponse } from '../types/nrRecommendation'

export class NrRecommendationsApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'NrRecommendationsApiError'
  }
}

function isRecommendation(value: unknown): value is NrRecommendation {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return Number.isSafeInteger(row.numero) && Number(row.numero) > 0
    && typeof row.nome === 'string' && Boolean(row.nome.trim())
    && typeof row.justificativa === 'string' && Boolean(row.justificativa.trim())
    && ['alta', 'media', 'baixa'].includes(String(row.confianca))
}

export async function suggestPositionNrs(id: string, signal?: AbortSignal): Promise<NrRecommendation[]> {
  try {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new NrRecommendationsApiError('Identificador do cargo inválido.')
    const baseUrl = import.meta.env.VITE_API_IA_URL?.trim().replace(/\/+$/, '')
    if (!baseUrl) throw new NrRecommendationsApiError('A URL da API de IA não está configurada.')
    const user = firebaseAuth.currentUser
    if (!user) throw new NrRecommendationsApiError('Entre na sua conta para consultar as sugestões de IA.')
    const requestSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(90000)])
    requestSignal.throwIfAborted()
    const token = await user.getIdToken()
    requestSignal.throwIfAborted()
    const response = await fetch(`${baseUrl}/support/cargos/${id}/nrs-sugeridas`, {
      method: 'POST', signal: requestSignal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    const body: unknown = await response.json()
    if (!response.ok) {
      const detail = typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string' ? body.detail : ''
      throw new NrRecommendationsApiError(detail || (response.status === 401 ? 'Sua sessão expirou. Entre novamente.'
        : response.status === 403 ? 'Você não tem permissão para consultar sugestões deste cargo.' : 'Não foi possível carregar as sugestões de IA. Tente novamente.'))
    }
    const data = body as Partial<PositionNrRecommendationsResponse> | null
    if (!data || data.cargo_id !== Number(id) || typeof data.cargo !== 'string'
      || !Array.isArray(data.nrs_sugeridas) || data.quantidade !== data.nrs_sugeridas.length
      || !data.nrs_sugeridas.every(isRecommendation)
      || new Set(data.nrs_sugeridas.map(row => row.numero)).size !== data.nrs_sugeridas.length) {
      throw new NrRecommendationsApiError('A IA retornou sugestões inválidas para este cargo.')
    }
    return data.nrs_sugeridas
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof NrRecommendationsApiError) throw error
    if (error instanceof DOMException && error.name === 'TimeoutError') throw new NrRecommendationsApiError('A IA demorou para responder. Tente novamente.', { cause: error })
    throw new NrRecommendationsApiError('Não foi possível conectar à IA. Você pode continuar editando as NRs e tentar novamente.', { cause: error })
  }
}
