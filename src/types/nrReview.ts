export interface NrDocument {
  _id: number
  nome: string
  aplicabilidade: string
  descricao: string
  objetivo: string
  revogada: boolean
  tempo_reciclagem_meses: number
  ultima_atualizacao: string
  usabilidade: 'Colaborador' | 'Empresa'
  data_criacao: string
}

export interface NrCandidate {
  document: NrDocument
  /** Adapter metadata, never a MongoDB field. Must identify the exact reviewed snapshot. */
  revision: string
  approvedRevision?: string
}
export interface NrReviewRepository {
  listPending(signal?: AbortSignal): Promise<NrCandidate[]>
  getPending(id: number, signal?: AbortSignal): Promise<NrCandidate | null>
  getApproved(id: number, signal?: AbortSignal): Promise<NrDocument | null>
  listApproved(signal?: AbortSignal): Promise<NrDocument[]>
  saveApproved(document: NrDocument, expected: NrDocument, signal?: AbortSignal): Promise<NrDocument>
  approve(candidate: NrCandidate, signal?: AbortSignal, reviewedDocument?: NrDocument): Promise<{ sqlSynchronized: boolean } | void>
}
export type NrDemoScenario = 'normal' | 'empty' | 'load-error' | 'approval-error' | 'slow'
export interface NrReviewFilters { search: string; usability: string; revoked: string; page: number }
