import { firebaseAuth } from './firebase'
import type {
  ChatApiResponse,
  ChatSessionEndResponse,
  ChatSessionListResponse,
  ChatSessionMessagesResponse,
} from '../types/chat'

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')

export class ChatApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ChatApiError'
  }
}

async function getFirebaseIdToken(): Promise<string> {
  const user = firebaseAuth.currentUser
  if (!user) throw new ChatApiError('Entre na sua conta Astro para conversar com a IA.')
  return user.getIdToken()
}

async function requestChatApi<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) throw new ChatApiError('A URL da API de IA não está configurada.')

  try {
    const token = await getFirebaseIdToken()
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })

    const body: unknown = response.status === 204 ? null : await response.json()
    if (!response.ok) {
      const detail = typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string'
        ? body.detail
        : 'Não foi possível concluir a solicitação ao chatbot.'
      throw new ChatApiError(detail)
    }
    return body as T
  } catch (error: unknown) {
    if (error instanceof ChatApiError) throw error
    throw new ChatApiError('Não foi possível conectar à IA. Verifique sua conexão e tente novamente.', { cause: error })
  }
}

export async function sendChatMessage(message: string, sessionId: string | null): Promise<ChatApiResponse> {
  try {
    return await requestChatApi<ChatApiResponse>('/chat/messages?markdown=false', {
      method: 'POST',
      body: JSON.stringify({ message, ...(sessionId ? { session_id: sessionId } : {}) }),
    })
  } catch (error: unknown) {
    if (error instanceof ChatApiError) throw error
    throw new ChatApiError('Não foi possível enviar sua mensagem.', { cause: error })
  }
}

export async function listChatSessions(cursor?: string | null): Promise<ChatSessionListResponse> {
  try {
    const query = new URLSearchParams({ limit: '20' })
    if (cursor) query.set('cursor', cursor)
    return await requestChatApi<ChatSessionListResponse>(`/sessions?${query.toString()}`)
  } catch (error: unknown) {
    if (error instanceof ChatApiError) throw error
    throw new ChatApiError('Não foi possível carregar suas conversas.', { cause: error })
  }
}

export async function getChatSessionMessages(sessionId: string): Promise<ChatSessionMessagesResponse> {
  try {
    return await requestChatApi<ChatSessionMessagesResponse>(`/sessions/${encodeURIComponent(sessionId)}/messages`)
  } catch (error: unknown) {
    if (error instanceof ChatApiError) throw error
    throw new ChatApiError('Não foi possível abrir esta conversa.', { cause: error })
  }
}

export async function startChatSession(sessionId: string): Promise<void> {
  try {
    await requestChatApi<unknown>(`/sessions/${encodeURIComponent(sessionId)}/iniciar`, { method: 'POST' })
  } catch (error: unknown) {
    if (error instanceof ChatApiError) throw error
    throw new ChatApiError('Não foi possível retomar esta conversa.', { cause: error })
  }
}

export async function endChatSession(sessionId: string): Promise<ChatSessionEndResponse> {
  try {
    return await requestChatApi<ChatSessionEndResponse>(`/sessions/${encodeURIComponent(sessionId)}/encerrar`, { method: 'POST' })
  } catch (error: unknown) {
    if (error instanceof ChatApiError) throw error
    throw new ChatApiError('Não foi possível encerrar esta conversa.', { cause: error })
  }
}
