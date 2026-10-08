import { useEffect, useRef } from 'react'
import type { ChatSessionSummary } from '../../types/chat'
import { formatChatSessionDate, groupChatSessions } from '../../utils/chatSessions'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'

interface AstroChatSessionsProps {
  sessions: readonly ChatSessionSummary[]
  nextCursor: string | null
  selectedSessionId: string | null
  openingSessionId: string | null
  disabled: boolean
  loading: boolean
  error: string
  selectionError: string
  onSelect: (sessionId: string) => void
  onNewSession: () => void
  onRetry: () => void
  onLoadMore: () => void
}

function AstroChatSessions({ sessions, nextCursor, selectedSessionId, openingSessionId, disabled, loading, error, selectionError, onSelect, onNewSession, onRetry, onLoadMore }: AstroChatSessionsProps) {
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const listEndRef = useRef<HTMLDivElement>(null)
  const groups = groupChatSessions(sessions)

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
    <aside aria-labelledby="astro-chat-sessions-title" className="astro-chat-sessions" id="astro-chat-sessions">
      <div className="astro-chat-sessions-heading">
        <h2 id="astro-chat-sessions-title">Suas conversas</h2>
        <p>Retome de onde parou com o Astro.</p>
        <PurpleButton className="astro-chat-session-new" disabled={disabled} onClick={onNewSession}>
          <AstroIcon name="plus-square" /> Nova conversa
        </PurpleButton>
        {selectionError && <p className="astro-chat-sessions-alert" role="alert">{selectionError}</p>}
        {openingSessionId && <p className="astro-chat-sessions-progress" role="status"><span aria-hidden="true" className="astro-chat-sessions-spinner" />Abrindo conversa…</p>}
      </div>

      <div aria-label="Lista de conversas" className="astro-chat-sessions-scroll" ref={scrollRootRef} role="region" tabIndex={0}>
        {!loading && !error && sessions.length === 0 && (
          <div className="astro-chat-sessions-empty">
            <span className="astro-chat-sessions-empty-icon"><AstroIcon name="feedback" /></span>
            <h3>Nenhuma conversa ainda</h3>
            <p>Comece uma conversa. Ela ficará salva aqui para você consultar depois.</p>
          </div>
        )}
        {loading && sessions.length === 0 && (
          <div aria-hidden="true" className="astro-chat-sessions-skeleton">
            {[0, 1, 2].map((item) => <div key={item}><span /><span /><span /></div>)}
          </div>
        )}
        <div aria-busy={loading} className="astro-chat-session-groups">
          {groups.map((group) => (
            <section aria-label={group.label} className="astro-chat-session-group" key={group.label}>
              <h3>{group.label}</h3>
              <ul className="astro-chat-session-list">
                {group.sessions.map((session) => {
                  const selected = selectedSessionId === session.session_id
                  const opening = openingSessionId === session.session_id
                  const date = formatChatSessionDate(session.updated_at)
                  return (
                    <li key={session.session_id}>
                      <button
                        aria-busy={opening}
                        aria-current={selected ? 'true' : undefined}
                        className={`astro-chat-session-item${selected ? ' astro-chat-session-item--selected' : ''}`}
                        disabled={disabled}
                        onClick={() => onSelect(session.session_id)}
                        type="button"
                      >
                        <span className="astro-chat-session-topline">
                          <span className="astro-chat-session-title" title={session.title || 'Nova conversa'}>{session.title || 'Nova conversa'}</span>
                          {opening ? <span aria-hidden="true" className="astro-chat-sessions-spinner" /> : selected && <span className="astro-chat-session-current">Atual</span>}
                        </span>
                        <span className="astro-chat-session-preview" title={session.last_message_preview}>{session.last_message_preview || 'Sem mensagens ainda'}</span>
                        <span className="astro-chat-session-meta">
                          {date ? <time aria-label={`Última atividade: ${date.full}`} dateTime={session.updated_at} title={date.full}>{date.label}</time> : <span>Sem data</span>}
                          <span className={`astro-chat-session-status astro-chat-session-status--${session.status}`}>
                            <span aria-hidden="true" />
                            {session.status === 'ativa' ? 'Em andamento' : session.status === 'encerrando' ? 'Encerrando' : 'Encerrada'}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
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
              <PurpleButton auto className="astro-chat-session-retry" onClick={onRetry}>Tentar novamente</PurpleButton>
            </div>
          )}
          {!loading && !error && !nextCursor && sessions.length > 0 && <p className="astro-chat-sessions-end">Todas as conversas foram carregadas.</p>}
        </div>
      </div>
    </aside>
  )
}

export default AstroChatSessions
