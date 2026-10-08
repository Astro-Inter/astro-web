import { useEffect, useRef } from 'react'
import type { ChatSessionSummary } from '../../types/chat'

interface AstroChatSessionsProps {
  sessions: readonly ChatSessionSummary[]
  nextCursor: string | null
  selectedSessionId: string | null
  loading: boolean
  error: string
  onSelect: (sessionId: string) => void
  onNewSession: () => void
  onRetry: () => void
  onLoadMore: () => void
}

function formatSessionDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
}

function AstroChatSessions({ sessions, nextCursor, selectedSessionId, loading, error, onSelect, onNewSession, onRetry, onLoadMore }: AstroChatSessionsProps) {
  const scrollRootRef = useRef<HTMLElement>(null)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = scrollRootRef.current
    const listEnd = listEndRef.current
    if (!root || !listEnd || !nextCursor || loading || error) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      observer.disconnect()
      onLoadMore()
    }, { root, rootMargin: '0px 0px 64px 0px' })

    observer.observe(listEnd)
    return () => observer.disconnect()
  }, [nextCursor, loading, error, onLoadMore])

  return (
    <aside aria-label="Conversas anteriores" className="astro-chat-sessions" ref={scrollRootRef}>
      <div className="astro-chat-sessions-heading">
        <h2>Suas conversas</h2>
        <button className="astro-chat-session-new" onClick={onNewSession} type="button">Nova conversa</button>
      </div>

      {!loading && !error && sessions.length === 0 && (
        <p className="astro-chat-sessions-message">Suas conversas anteriores aparecerão aqui.</p>
      )}
      {sessions.length > 0 && (
        <ul aria-busy={loading} className="astro-chat-session-list">
          {sessions.map((session) => (
            <li key={session.session_id}>
              <button
                aria-current={selectedSessionId === session.session_id ? 'true' : undefined}
                className={`astro-chat-session-item${selectedSessionId === session.session_id ? ' astro-chat-session-item--selected' : ''}`}
                onClick={() => onSelect(session.session_id)}
                type="button"
              >
                <span className="astro-chat-session-title">{session.title || 'Nova conversa'}</span>
                <span className="astro-chat-session-preview">{session.last_message_preview || 'Sem mensagens'}</span>
                <span className="astro-chat-session-meta">
                  <span>{formatSessionDate(session.updated_at)}</span>
                  <span>{session.status === 'ativa' ? 'Em andamento' : session.status === 'encerrando' ? 'Encerrando' : 'Encerrada'}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="astro-chat-sessions-footer" ref={listEndRef}>
        {loading && (
          <p className="astro-chat-sessions-progress" role="status">
            <span aria-hidden="true" className="astro-chat-sessions-spinner" />
            {sessions.length > 0 ? 'Carregando mais conversas…' : 'Carregando conversas…'}
          </p>
        )}
        {error && (
          <div className="astro-chat-sessions-message" role="alert">
            <p>{error}</p>
            <button className="astro-chat-session-retry" onClick={onRetry} type="button">Tentar novamente</button>
          </div>
        )}
        {!loading && !error && !nextCursor && sessions.length > 0 && (
          <p className="astro-chat-sessions-end">Você chegou ao fim das conversas.</p>
        )}
      </div>
    </aside>
  )
}

export default AstroChatSessions
