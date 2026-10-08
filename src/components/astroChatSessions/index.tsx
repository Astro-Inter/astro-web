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
  return (
    <aside aria-label="Conversas anteriores" className="astro-chat-sessions">
      <div className="astro-chat-sessions-heading">
        <h2>Suas conversas</h2>
        <button className="astro-chat-session-new" onClick={onNewSession} type="button">Nova conversa</button>
      </div>

      {loading ? (
        <p aria-live="polite" className="astro-chat-sessions-message">Carregando conversas…</p>
      ) : error ? (
        <div className="astro-chat-sessions-message" role="alert">
          <p>{error}</p>
          <button className="astro-chat-session-retry" onClick={onRetry} type="button">Tentar novamente</button>
        </div>
      ) : sessions.length === 0 ? (
        <p className="astro-chat-sessions-message">Suas conversas anteriores aparecerão aqui.</p>
      ) : (
        <ul className="astro-chat-session-list">
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
      {!loading && !error && nextCursor && (
        <button className="astro-chat-session-retry" disabled={loading} onClick={onLoadMore} type="button">Carregar mais conversas</button>
      )}
    </aside>
  )
}

export default AstroChatSessions
