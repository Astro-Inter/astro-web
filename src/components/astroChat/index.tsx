import { BUTTONS } from '../../gtm/buttons'
import { iconAsset } from '../../utils/iconAsset'
import { useAstroChatController } from '../../hooks/useAstroChatController'
import { useAuthentication } from '../../hooks/useAuthentication'
import AstroChatSessions from '../astroChatSessions'
import AstroChatLoading from '../astroChatLoading'
import AstroChatTransition from '../astroChatTransition'
import AstroChatMessages from '../astroChatMessages'

function AstroChatView() {
  const { chat, setChat, sessionList, setSessionList, authState, historyVisible, historySessions, viewKey, navigate, position, launcherPosition, dragging, closing, launcherRef, inputRef, messagesRef, windowRef, loadMoreSessions, retrySessions, closeChat, startDrag, moveDrag, endDrag, moveWithKeyboard, startLauncherDrag, moveLauncherDrag, endLauncherDrag, moveLauncherWithKeyboard, openChat, toggleExpanded, sendMessage, selectSession, closeSession, createDraftSession, startNewSession, chatSize, expandedChatSize, visibleMessages, suggestions } = useAstroChatController()
  return (
    <div className="astro-chat">
      {chat.open ? (
        <section
          aria-label="Chat com o Astro"
          className={`astro-chat-window${chat.expanded ? ' astro-chat-window--expanded' : ''}${dragging ? ' astro-chat-window--dragging' : ''}${closing ? ' astro-chat-window--closing' : ''}`}
          id="astro-chat-window"
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          ref={windowRef}
          style={position && chatSize ? { position: 'fixed', left: position.left, top: position.top, width: chatSize.width, height: chatSize.height, right: 'auto', bottom: 'auto' } : undefined}
        >
          <div className="astro-chat-surface" style={expandedChatSize ? { width: expandedChatSize.width, height: expandedChatSize.height } : undefined}>
          <header aria-label="Mover chat com as setas do teclado" className="astro-chat-header" onKeyDown={moveWithKeyboard} tabIndex={0} title="Arraste para mover o chat">
            <button data-track-action={sessionList.panelOpen ? BUTTONS.comuns.voltar_conversa : BUTTONS.comuns.historico_conversas}
              aria-expanded={sessionList.panelOpen}
              aria-label={sessionList.panelOpen ? 'Voltar à conversa' : 'Abrir histórico de conversas'}
              aria-controls={historyVisible ? 'astro-chat-sessions' : undefined}
              className="astro-chat-header-button astro-chat-history-toggle"
              disabled={!authState.ready || !authState.authenticated || chat.busy !== 'idle'}
              onClick={() => {
                if (!sessionList.panelOpen && !chat.sessionId && !chat.draftSessionId && chat.messages.length === 0) createDraftSession(false)
                setChat((current) => ({ ...current, error: '' }))
                setSessionList((current) => ({ ...current, panelOpen: !current.panelOpen }))
              }}
              title={historyVisible ? 'Voltar à conversa' : 'Histórico de conversas'}
              type="button"
            >
              {historyVisible ? (
                <img alt="" aria-hidden="true" height="24" src={iconAsset('chatBack.svg')} width="24" />
              ) : (
                <span aria-hidden="true" className="astro-chat-history-icon"><span /><span /><span /></span>
              )}
            </button>
            {!historyVisible && chat.sessionId && (chat.sessionStatus === 'ativa' || chat.sessionStatus === 'encerrando') && (
              <button data-track-action={BUTTONS.comuns.encerrar_conversa}
                aria-label={chat.sessionStatus === 'encerrando' ? 'Finalizar conversa' : 'Encerrar conversa'}
                className="astro-chat-header-button astro-chat-end-session"
                disabled={chat.busy !== 'idle'}
                onClick={closeSession}
                title={chat.sessionStatus === 'encerrando' ? 'Finalizar conversa' : 'Encerrar conversa'}
                type="button"
              >
                <img alt="" aria-hidden="true" height="24" src={iconAsset('endSession.svg')} width="24" />
              </button>
            )}
            <button data-track-action={chat.expanded ? BUTTONS.comuns.recolher_chat : BUTTONS.comuns.ampliar_chat}
              aria-label={chat.expanded ? 'Recolher chat' : 'Ampliar chat'}
              className="astro-chat-header-button astro-chat-header-button--resize"
              onClick={toggleExpanded}
              type="button"
            >
              <img alt="" className={`astro-chat-resize-icon${chat.expanded ? '' : ' astro-chat-resize-icon--active'}`} draggable={false} height="24" src={iconAsset('expand.svg')} width="24" />
              <img alt="" className={`astro-chat-resize-icon astro-chat-resize-icon--collapse${chat.expanded ? ' astro-chat-resize-icon--active' : ''}`} draggable={false} height="24" src={iconAsset('collapse.svg')} width="24" />
            </button>
            <button data-track-action={BUTTONS.comuns.fechar_chat} aria-label="Fechar chat" className="astro-chat-header-button" onClick={closeChat} type="button">
              <img alt="" height="21" src={iconAsset('close.svg')} width="21" />
            </button>
          </header>

          <div className={`astro-chat-body astro-chat-view${historyVisible ? ' astro-chat-body--history' : ''}`} key={viewKey} ref={messagesRef}>
            {!authState.ready ? (
              <div className="astro-chat-auth-message"><AstroChatLoading label="Verificando seu acesso…" /></div>
            ) : !authState.authenticated ? (
              <div className="astro-chat-auth-message">
                <h2 className="astro-chat-screen-title">Entre na sua conta Astro para conversar com a IA e acessar suas conversas.</h2>
                <button data-track-action={BUTTONS.comuns.login} className="astro-chat-login-button" onClick={() => navigate('/')} type="button">Ir para o login</button>
              </div>
            ) : sessionList.panelOpen ? (
              <AstroChatSessions
                disabled={chat.busy !== 'idle'}
                error={sessionList.error}
                loading={sessionList.loading}
                nextCursor={sessionList.nextCursor}
                onNewSession={startNewSession}
                onLoadMore={loadMoreSessions}
                onRetry={retrySessions}
                onSelect={(sessionId) => { void selectSession(sessionId) }}
                openingSessionId={chat.openingSessionId}
                selectedSessionId={chat.sessionId ?? chat.draftSessionId}
                selectionError={chat.error}
                sessions={historySessions}
              />
            ) : chat.messages.length === 0 && chat.busy !== 'sending' && !chat.error ? (
              <div className="astro-chat-welcome">
                <img alt="Robô Astro em um cenário espacial" className="astro-chat-illustration" height="181" src={import.meta.env.BASE_URL + "chatWelcomeRobot.png"} width="272" />
                <h2 className="astro-chat-screen-title">Olá! Estou aqui para te ajudar a entender como a plataforma Astro funciona.</h2>
                <div aria-label="Perguntas sugeridas" className="astro-chat-suggestions">
                  {suggestions.map((suggestion) => (
                    <button data-track-action={BUTTONS.comuns.pergunta_sugerida} key={suggestion} disabled={chat.busy !== 'idle'} onClick={() => { void sendMessage(suggestion) }} type="button">{suggestion}</button>
                  ))}
                </div>
              </div>
            ) : (
              <AstroChatMessages messages={visibleMessages} thinkingId={chat.busy === 'sending' ? chat.pendingReplyId : null} />
            )}
            {!historyVisible && <AstroChatTransition contentKey={chat.error ? `error-${chat.error}` : chat.busy}>
              {chat.error ? <p className="astro-chat-error" role="alert">{chat.error}</p>
                : chat.busy === 'loading-history' ? <AstroChatLoading className="astro-chat-loading" label="Carregando conversa…" />
                  : chat.busy === 'ending' ? <AstroChatLoading className="astro-chat-loading" label="Encerrando conversa…" /> : null}
            </AstroChatTransition>}
          </div>

          {!historyVisible && <form data-track-submit={BUTTONS.comuns.enviar_mensagem} className="astro-chat-form" onSubmit={(event) => { event.preventDefault(); sendMessage(chat.draft) }}>
            <label className="sr-only" htmlFor="astro-chat-input">Digite sua mensagem</label>
            <input
              autoComplete="off"
              id="astro-chat-input"
              disabled={!authState.ready || !authState.authenticated || chat.busy !== 'idle'}
              maxLength={4000}
              onChange={(event) => setChat((current) => ({ ...current, draft: event.target.value }))}
              placeholder="Digite sua mensagem..."
              ref={inputRef}
              type="text"
              value={chat.draft}
            />
            <button data-track-action={BUTTONS.comuns.enviar_mensagem} aria-label="Enviar mensagem" disabled={!authState.authenticated || chat.busy !== 'idle' || !chat.draft.trim()} type="submit">
              <img alt="" height="62" src={iconAsset('sendMessage.svg')} width="62" />
            </button>
          </form>}
          </div>
        </section>
      ) : (
        <button data-track-action={BUTTONS.comuns.ia}
          aria-controls="astro-chat-window"
          aria-expanded="false"
          aria-label="Abrir chat do Astro"
          className="astro-chat-launcher"
          onClick={openChat}
          onKeyDown={moveLauncherWithKeyboard}
          onPointerCancel={endLauncherDrag}
          onLostPointerCapture={endLauncherDrag}
          onPointerDown={startLauncherDrag}
          onPointerMove={moveLauncherDrag}
          onPointerUp={endLauncherDrag}
          ref={launcherRef}
          style={launcherPosition ? { position: 'fixed', left: launcherPosition.left, top: launcherPosition.top, right: 'auto', bottom: 'auto' } : undefined}
          type="button"
        >
          <span aria-hidden="true" className="astro-chat-hint"><span>Fale com a IA do</span><strong>Astro!</strong></span>
          <img alt="" draggable={false} height="92" src={import.meta.env.BASE_URL + "chatLauncherRobot.png"} width="92" />
        </button>
      )}
    </div>
  )
}

function AstroChat() {
  const { user } = useAuthentication()
  return <AstroChatView key={user?.uid ?? 'guest'} />
}

export default AstroChat
