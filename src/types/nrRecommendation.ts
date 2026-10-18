export interface NrRecommendation {
  numero: number
  nome: string
  justificativa: string
  confianca: 'alta' | 'media' | 'baixa'
}

export interface PositionNrRecommendationsResponse {
  cargo_id: number
  cargo: string
  quantidade: number
  nrs_sugeridas: NrRecommendation[]
}
