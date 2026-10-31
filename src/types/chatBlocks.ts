export interface ChatPoint { categoria: string; valor: number }
export interface ChatChartBlock {
  tipo: 'grafico_barras' | 'grafico_linhas' | 'grafico_setores'
  versao: 1
  titulo: string
  fonte: string
  unidade: string
  dados: ChatPoint[]
}
export interface ChatTableBlock {
  tipo: 'tabela'; versao: 1; titulo: string
  colunas: { chave: string; titulo: string }[]
  linhas: Record<string, string | number | null>[]
  pagina: number; total_paginas: number; total: number
}
export interface ChatGalleryPerson { nome: string; email: string | null; url: string | null }
export interface ChatGalleryBlock { tipo: 'galeria_usuarios'; versao: 1; titulo: string; imagens: ChatGalleryPerson[] }
export interface ChatTextBlock { tipo: 'texto'; conteudo: string }
export type ChatBlock = ChatTextBlock | ChatChartBlock | ChatTableBlock | ChatGalleryBlock
export interface KeyedChatItem<T> { key: string; item: T }
