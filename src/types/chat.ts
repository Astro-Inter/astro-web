export type ChatSessionStatus = 'ativa' | 'encerrando' | 'encerrada'

export interface ChatMessage {
  id: string
  author: 'astro' | 'user'
  text: string
}

export interface ChatSessionSummary {
  session_id: string
  title: string
  last_message_preview: string
  created_at: string
  updated_at: string
  status: ChatSessionStatus
}

export interface ChatSessionListResponse {
  sessions: ChatSessionSummary[]
  next_cursor: string | null
}

export interface ChatSessionGroup {
  label: string
  sessions: ChatSessionSummary[]
}

export interface ChatSessionMessage {
  content: string
  role: 'user' | 'assistant'
}

export interface ChatSessionMessagesResponse {
  mensagens: ChatSessionMessage[]
  session_id: string
  status: ChatSessionStatus
  total: number
}

export interface ChatApiResponse {
  session_id: string
  resposta: string
  agentes_chamados: string[]
}

export interface ChatSessionEndResponse {
  resumo_indexado: boolean
  session_id: string
  status: ChatSessionStatus
}
