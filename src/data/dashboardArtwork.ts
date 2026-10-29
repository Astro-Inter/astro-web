import type { DashboardArtworkId } from '../types/dashboard'

// A ordem das ilustrações compõe o marcador ac1 salvo nos títulos.
export const dashboardArtworks: readonly { id: DashboardArtworkId; label: string }[] = [
  { id: 'overview', label: 'Visão geral' }, { id: 'trends', label: 'Tendências' },
  { id: 'bars', label: 'Barras' }, { id: 'donut', label: 'Distribuição' },
  { id: 'area', label: 'Evolução' }, { id: 'progress', label: 'Progresso' },
  { id: 'comparison', label: 'Comparação' }, { id: 'scatter', label: 'Dispersão' },
  { id: 'activity', label: 'Atividade' }, { id: 'metrics', label: 'Indicadores' },
]
export function isDashboardArtwork(value: unknown): value is DashboardArtworkId {
  return dashboardArtworks.some(option => option.id === value)
}
