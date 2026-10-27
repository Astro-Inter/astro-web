import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import type { HomeResponse, LegacyHomeResponse, LegacyHomeStatisticsResponse, WorkspaceHome } from '../types/home'

export class HomeApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'HomeApiError'
  }
}

function homeProfilePhotoUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? value.trim() : null
  } catch { return null }
}

function toWorkspaceHome(value: unknown): WorkspaceHome {
  const data = value as Partial<HomeResponse & LegacyHomeResponse> | null
  const userName = data?.userName ?? data?.nome_usuario
  const stats = data?.statistics ? {
    quantidade_unidades: data.statistics.unitCount,
    quantidade_colaboradores: data.statistics.collaboratorCount,
    quantidade_requisitos: data.statistics.requirementCount,
    quantidade_conformes: data.statistics.compliantCount,
    quantidade_proximos_vencimento: data.statistics.expiringSoonCount,
    quantidade_vencidos: data.statistics.expiredCount,
    quantidade_pendentes: data.statistics.pendingCount,
    percentual_conformidade_geral: data.statistics.overallCompliancePercentage,
    data_referencia: data.statistics.referenceDate,
  } : data?.estatisticas
  const counts: (keyof LegacyHomeStatisticsResponse)[] = ['quantidade_unidades', 'quantidade_colaboradores', 'quantidade_requisitos',
    'quantidade_conformes', 'quantidade_proximos_vencimento', 'quantidade_vencidos', 'quantidade_pendentes']
  if (!data || typeof userName !== 'string' || !userName.trim() || !stats
    || counts.some((key) => !Number.isSafeInteger(stats[key]) || Number(stats[key]) < 0)
    || !Number.isFinite(stats.percentual_conformidade_geral) || stats.percentual_conformidade_geral < 0 || stats.percentual_conformidade_geral > 100
    || typeof stats.data_referencia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(stats.data_referencia)) {
    throw new HomeApiError('A API retornou dados inválidos para a Home.')
  }
  const percentage = (count: number): number => stats.quantidade_requisitos === 0 ? 0 : count / stats.quantidade_requisitos * 100
  return {
    userName: userName.trim(), profilePhotoUrl: homeProfilePhotoUrl(data.profilePhotoUrl), referenceDate: stats.data_referencia,
    complianceOverview: {
      overallPercentage: stats.percentual_conformidade_geral,
      totalRequirements: stats.quantidade_requisitos,
      slices: [
        { status: 'compliant', label: 'Conformes', percentage: percentage(stats.quantidade_conformes) },
        { status: 'expiring', label: 'Próximos do vencimento', percentage: percentage(stats.quantidade_proximos_vencimento) },
        { status: 'expired', label: 'Vencidos', percentage: percentage(stats.quantidade_vencidos) },
        { status: 'pending', label: 'Pendentes', percentage: percentage(stats.quantidade_pendentes) },
      ],
    },
    summaryStats: [
      { id: 'units', label: 'Unidades', value: stats.quantidade_unidades, icon: 'building', path: '/mainUnitScreen' },
      { id: 'collaborators', label: 'Colaboradores', value: stats.quantidade_colaboradores, icon: 'collaborators', path: '/mainEmployeerScreen' },
    ],
  }
}

export async function loadWorkspaceHome(signal?: AbortSignal): Promise<WorkspaceHome> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new HomeApiError('Entre na sua conta para consultar a Home.')
    const token = await user.getIdToken()
    const response = await fetch(`${getSystemApiBaseUrl()}/home/workspace`, {
      signal, headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    const text = await response.text()
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* Erros HTTP podem não conter JSON. */ }
    const result = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null
    if (!response.ok || result?.success === false) {
      if (response.status === 500) {
        throw new HomeApiError('O servidor não conseguiu carregar os indicadores do workspace (erro 500). Tente novamente em instantes. Se persistir, entre em contato com o suporte.')
      }
      const details = Array.isArray(result?.errors) ? result.errors.filter((item): item is string => typeof item === 'string').join(' ') : ''
      throw new HomeApiError(details || (typeof result?.message === 'string' && result.message) ||
        (response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : response.status === 403 ? 'Você não tem permissão para consultar este workspace.' : 'Não foi possível carregar a Home. Tente novamente.'))
    }
    if (result?.success !== true) throw new HomeApiError('A API retornou uma resposta inválida para a Home.')
    return toWorkspaceHome(result.data)
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof HomeApiError) throw error
    throw new HomeApiError('Não foi possível conectar à API da Home. Tente novamente.', { cause: error })
  }
}
