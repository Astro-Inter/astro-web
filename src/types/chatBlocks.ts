export interface ChatPoint { categoria: string; valor: number }
export interface ChatChartBlock {
  tipo: 'grafico_barras' | 'grafico_linhas' | 'grafico_setores' | 'grafico_rosca'
  versao: 1; titulo: string; fonte: string; unidade: string; dados: ChatPoint[]
}
export interface ChatImageCell { tipo: 'imagem'; url: string | null; descricao: string }
export type ChatCell = string | number | boolean | ChatImageCell | null
export interface ChatSetSummary {
  solicitada: number; retornada: number; total: number; limitado: boolean; tem_mais: boolean
  motivo_limite: 'maximo_resultados' | 'tamanho_resposta' | null
}
interface TableData {
  titulo: string; colunas: { chave: string; titulo: string }[]; linhas: Record<string, ChatCell>[]
  pagina: number; total_paginas: number; total: number
}
export interface ChatLegacyTableBlock extends TableData { tipo: 'tabela'; versao: 1 }
export interface ChatLocalTableBlock extends TableData, ChatSetSummary { tipo: 'tabela'; versao: 2; paginacao: 'local' }
export interface ChatMatrixBlock extends TableData, ChatSetSummary {
  tipo: 'matriz_conformidade'; versao: 1; paginacao: 'local'
  chave_pessoa: 'referencia_pessoa'; chave_categoria: 'nr'; chave_situacao: 'situacao'
}
export type ChatTableBlock = ChatLegacyTableBlock | ChatLocalTableBlock | ChatMatrixBlock
export interface ChatIndicatorBlock {
  tipo: 'indicadores'; versao: 1; titulo: string; abrangencia: 'conjunto_autorizado'; universo: string
  indicadores: { chave: string; rotulo: string; valor: number | null; unidade: string; numerador: number | null; denominador: number | null; criterio: string }[]
}
export interface ChatContextBlock {
  tipo: 'contexto_dados'; versao: 1; fonte: string; referencia: string | null; inicio: string | null; fim: string | null
  escopo: string; filtros: Record<string, string | number | boolean | string[] | null>
  criterios: string[]; avisos: string[]; conjunto: ChatSetSummary & { unidade_total: string }
}
export interface ChatUserCardBlock {
  tipo: 'ficha_usuario'; versao: 1; titulo: string; nome?: string | null; email?: string | null
  cargo?: string | null; unidade?: string | null; perfil?: string | null; situacao?: string | null
  modalidade?: string | null; origem?: 'usuario_autenticado' | null; foto?: ChatImageCell | null
  conformidade?: { percentual: number | null; vigentes: number; total: number; data_referencia: string | null; criterio: string } | null
}
export interface ChatGalleryPerson { nome: string; email: string | null; url: string | null }
export interface ChatGalleryBlock { tipo: 'galeria_usuarios'; versao: 1; titulo: string; imagens: ChatGalleryPerson[] }
export interface ChatTextBlock { tipo: 'texto'; conteudo: string }
export type ChatBlock = ChatTextBlock | ChatChartBlock | ChatTableBlock | ChatGalleryBlock | ChatUserCardBlock | ChatIndicatorBlock | ChatContextBlock
export interface KeyedChatItem<T> { key: string; item: T }
