import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

interface ChatMessage {
  id: string
  author: 'astro' | 'user'
  text: string
}

interface ChatState {
  open: boolean
  expanded: boolean
  draft: string
  messages: ChatMessage[]
}

interface ChatPosition {
  left: number
  top: number
}

interface ChatAnchor {
  right: number
  bottom: number
}

interface ChatSize {
  width: number
  height: number
}

interface ChatDrag {
  pointerId: number
  startX: number
  startY: number
  startLeft: number
  startTop: number
  width: number
  height: number
}

interface PanelDrag extends ChatDrag {
  moved: boolean
}

interface LauncherDrag extends ChatDrag {
  moved: boolean
}

function getChatSize(expanded: boolean): ChatSize {
  const rem = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth
  const compact = window.matchMedia('(max-width: 780px)').matches
  const width = Math.min((expanded ? 25 : 20) * rem, viewportWidth - 2 * rem)
  const maxHeight = window.innerHeight - (compact ? 5.5 : 2) * rem
  return { width, height: Math.min(width * 1.3, maxHeight) }
}

function keepAnchorInBounds(anchor: ChatAnchor): ChatAnchor {
  const inset = 8
  const rem = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth
  const topInset = window.matchMedia('(max-width: 780px)').matches ? 4.5 * rem + inset : inset
  const expanded = getChatSize(true)

  return {
    right: Math.max(expanded.width + inset, Math.min(anchor.right, viewportWidth - inset)),
    bottom: Math.max(expanded.height + topInset, Math.min(anchor.bottom, window.innerHeight - inset)),
  }
}

function keepLauncherInChatBounds(position: ChatPosition, width: number, height: number): ChatPosition {
  const anchor = keepAnchorInBounds({ right: position.left + width, bottom: position.top + height })
  return { left: anchor.right - width, top: anchor.bottom - height }
}

function positionNearLauncher(anchor: ChatAnchor, width: number, height: number): ChatPosition {
  return { left: anchor.right - width, top: anchor.bottom - height }
}

const suggestions = [
  'O que são Normas Regulamentadoras?',
  'Como acesso os dashboards?',
]

function answerFor(message: string) {
  const normalized = message.toLocaleLowerCase('pt-BR')

  if (normalized.includes('normas regulamentadoras') || normalized.includes('nrs')) {
    return 'Normas Regulamentadoras são regras de segurança e saúde no trabalho.'
  }
  if (normalized.includes('dashboard')) {
    return 'Acesse os dashboards pelo menu da plataforma. Cada área reúne seus indicadores e informações.'
  }
  if (normalized.includes('legal') || normalized.includes('obrigad')) {
    return 'É bastante mesmo! Se tiver outra dúvida, pode me perguntar.'
  }
  return 'Posso ajudar com dúvidas sobre Normas Regulamentadoras e sobre como acessar os dashboards.'
}

function AstroChat() {
  const [chat, setChat] = useState<ChatState>({ open: false, expanded: false, draft: '', messages: [] })
  const [position, setPosition] = useState<ChatPosition | null>(null)
  const [launcherPosition, setLauncherPosition] = useState<ChatPosition | null>(null)
  const [dragging, setDragging] = useState(false)
  const [closing, setClosing] = useState(false)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLElement>(null)
  const dragRef = useRef<PanelDrag | null>(null)
  const launcherDragRef = useRef<LauncherDrag | null>(null)
  const ignoreLauncherClickRef = useRef(false)
  const launcherAnchorRef = useRef<ChatAnchor | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  const finishClose = useCallback(() => {
    closeTimerRef.current = null
    setChat((current) => ({ ...current, open: false, expanded: false }))
    setPosition(null)
    launcherAnchorRef.current = null
    dragRef.current = null
    setDragging(false)
    setClosing(false)
    requestAnimationFrame(() => launcherRef.current?.focus())
  }, [])

  const closeChat = useCallback(() => {
    if (closing) return
    const anchor = launcherAnchorRef.current
    if (anchor) {
      const launcherSize = 4.5 * (Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16)
      setLauncherPosition(keepLauncherInChatBounds({
        left: anchor.right - launcherSize,
        top: anchor.bottom - launcherSize,
      }, launcherSize, launcherSize))
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishClose()
    } else {
      setClosing(true)
      closeTimerRef.current = window.setTimeout(finishClose, 160)
    }
  }, [closing, finishClose])

  useEffect(() => {
    if (chat.open) inputRef.current?.focus()
  }, [chat.open])

  useEffect(() => {
    if (chat.messages.length > 0) messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight })
  }, [chat.messages])

  useEffect(() => {
    if (!chat.open) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeChat()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [chat.open, closeChat])

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
  }, [])

  useEffect(() => {
    function keepChatVisible() {
      const launcherRect = launcherRef.current?.getBoundingClientRect()
      const launcherSize = 4.5 * (Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16)
      const launcherWidth = launcherRect?.width ?? launcherSize
      const launcherHeight = launcherRect?.height ?? launcherSize

      if (chat.open) {
        const anchor = launcherAnchorRef.current
        if (anchor) placePanel(anchor, chat.expanded)
      } else {
        setLauncherPosition((current) => current && keepLauncherInChatBounds(current, launcherWidth, launcherHeight))
      }
    }

    let frame: number | null = null
    function scheduleVisibilityCheck() {
      if (frame !== null) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        frame = null
        keepChatVisible()
      })
    }

    window.addEventListener('resize', scheduleVisibilityCheck)
    window.visualViewport?.addEventListener('resize', scheduleVisibilityCheck)
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', scheduleVisibilityCheck)
      window.visualViewport?.removeEventListener('resize', scheduleVisibilityCheck)
    }
  }, [chat.open, chat.expanded])

  function placePanel(anchor: ChatAnchor, expanded: boolean) {
    const bounded = keepAnchorInBounds(anchor)
    const size = getChatSize(expanded)
    launcherAnchorRef.current = bounded
    setPosition(positionNearLauncher(bounded, size.width, size.height))
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    if (closing || event.button !== 0 || !event.isPrimary || !(event.target instanceof Element)) return
    if (event.target.closest('button, input, textarea, select, a, [contenteditable="true"]')) return
    if (event.pointerType !== 'mouse' && !event.target.closest('.astro-chat-header')) return

    const rect = event.currentTarget.getBoundingClientRect()
    const size = getChatSize(chat.expanded)
    const anchor = keepAnchorInBounds({ right: rect.right, bottom: rect.bottom })
    const start = positionNearLauncher(anchor, size.width, size.height)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: start.left,
      startTop: start.top,
      width: size.width,
      height: size.height,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return
    if (!drag.moved) {
      drag.moved = true
      setDragging(true)
    }
    placePanel({
      right: drag.startLeft + deltaX + drag.width,
      bottom: drag.startTop + deltaY + drag.height,
    }, chat.expanded)
    event.preventDefault()
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (drag.moved) setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function moveWithKeyboard(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return
    const offset = event.shiftKey ? 24 : 12
    const movement: Record<string, ChatPosition> = {
      ArrowLeft: { left: -offset, top: 0 },
      ArrowRight: { left: offset, top: 0 },
      ArrowUp: { left: 0, top: -offset },
      ArrowDown: { left: 0, top: offset },
    }
    const change = movement[event.key]
    if (!change) return
    const anchor = launcherAnchorRef.current
    if (!anchor) return
    event.preventDefault()
    placePanel({ right: anchor.right + change.left, bottom: anchor.bottom + change.top }, chat.expanded)
  }

  function startLauncherDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary) return
    const rect = event.currentTarget.getBoundingClientRect()
    launcherDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveLauncherDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = launcherDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return
    drag.moved = true
    setLauncherPosition(keepLauncherInChatBounds({
      left: drag.startLeft + deltaX,
      top: drag.startTop + deltaY,
    }, drag.width, drag.height))
    event.preventDefault()
  }

  function endLauncherDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = launcherDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    launcherDragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (drag.moved) {
      ignoreLauncherClickRef.current = true
      window.setTimeout(() => { ignoreLauncherClickRef.current = false }, 0)
    }
  }

  function moveLauncherWithKeyboard(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const distance = event.shiftKey ? 24 : 12
    const movement: Record<string, ChatPosition> = {
      ArrowLeft: { left: -distance, top: 0 },
      ArrowRight: { left: distance, top: 0 },
      ArrowUp: { left: 0, top: -distance },
      ArrowDown: { left: 0, top: distance },
    }
    const change = movement[event.key]
    if (!change) return
    const rect = launcherRef.current?.getBoundingClientRect()
    if (!rect) return
    event.preventDefault()
    setLauncherPosition(keepLauncherInChatBounds({ left: rect.left + change.left, top: rect.top + change.top }, rect.width, rect.height))
  }

  function openChat() {
    if (ignoreLauncherClickRef.current) return
    const rect = launcherRef.current?.getBoundingClientRect()
    if (!rect) return
    placePanel({ right: rect.right, bottom: rect.bottom }, false)
    setChat((current) => ({ ...current, open: true }))
  }

  function toggleExpanded() {
    if (closing) return
    const anchor = launcherAnchorRef.current
    if (anchor) placePanel(anchor, !chat.expanded)
    setChat((current) => ({ ...current, expanded: !current.expanded }))
  }

  function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    setChat((current) => ({
      ...current,
      draft: '',
      messages: [
        ...current.messages,
        { id: crypto.randomUUID(), author: 'user', text: trimmed },
        { id: crypto.randomUUID(), author: 'astro', text: answerFor(trimmed) },
      ],
    }))
    inputRef.current?.focus()
  }

  const chatSize = chat.open ? getChatSize(chat.expanded) : null

  return (
    <div className="astro-chat">
      {chat.open ? (
        <section
          aria-label="Chat com o Astro"
          className={`astro-chat-window${chat.expanded ? ' astro-chat-window--expanded' : ''}${dragging ? ' astro-chat-window--dragging' : ''}${closing ? ' astro-chat-window--closing' : ''}`}
          id="astro-chat-window"
          onPointerCancel={endDrag}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          ref={windowRef}
          style={position && chatSize ? { position: 'fixed', left: position.left, top: position.top, width: chatSize.width, height: chatSize.height, right: 'auto', bottom: 'auto' } : undefined}
        >
          <header aria-label="Mover chat com as setas do teclado" className="astro-chat-header" onKeyDown={moveWithKeyboard} tabIndex={0} title="Arraste para mover o chat">
            <button
              aria-label={chat.expanded ? 'Recolher chat' : 'Ampliar chat'}
              className="astro-chat-header-button astro-chat-header-button--resize"
              onClick={toggleExpanded}
              type="button"
            >
              <img alt="" className={`astro-chat-resize-icon${chat.expanded ? '' : ' astro-chat-resize-icon--active'}`} draggable={false} height="24" src={import.meta.env.BASE_URL + "icon/expand.svg"} width="24" />
              <img alt="" className={`astro-chat-resize-icon astro-chat-resize-icon--collapse${chat.expanded ? ' astro-chat-resize-icon--active' : ''}`} draggable={false} height="24" src={import.meta.env.BASE_URL + "icon/collapse.svg"} width="24" />
            </button>
            <button aria-label="Fechar chat" className="astro-chat-header-button" onClick={closeChat} type="button">
              <img alt="" height="21" src={import.meta.env.BASE_URL + "icon/across.svg"} width="21" />
            </button>
          </header>

          <div className="astro-chat-body" ref={messagesRef}>
            {chat.messages.length === 0 ? (
              <div className="astro-chat-welcome">
                <img alt="Robô Astro em um cenário espacial" className="astro-chat-illustration" height="181" src={import.meta.env.BASE_URL + "robot2.png"} width="272" />
                <p>Olá! Estou aqui para te ajudar a entender como a plataforma Astro funciona.</p>
                <div aria-label="Perguntas sugeridas" className="astro-chat-suggestions">
                  {suggestions.map((suggestion) => (
                    <button key={suggestion} onClick={() => sendMessage(suggestion)} type="button">{suggestion}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div aria-live="polite" className="astro-chat-messages" role="log">
                <div className="astro-chat-message astro-chat-message--astro">
                  <img alt="" aria-hidden="true" height="80" src={import.meta.env.BASE_URL + "robot3.png"} width="80" />
                  <p>Olá! Estou aqui para te auxiliar na plataforma Astro.</p>
                </div>
                {chat.messages.map((message) => (
                  <div className={`astro-chat-message astro-chat-message--${message.author}`} key={message.id}>
                    {message.author === 'astro' && <img alt="" aria-hidden="true" height="80" src={import.meta.env.BASE_URL + "robot3.png"} width="80" />}
                    <p>{message.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form className="astro-chat-form" onSubmit={(event) => { event.preventDefault(); sendMessage(chat.draft) }}>
            <label className="sr-only" htmlFor="astro-chat-input">Digite sua mensagem</label>
            <input
              autoComplete="off"
              id="astro-chat-input"
              maxLength={500}
              onChange={(event) => setChat((current) => ({ ...current, draft: event.target.value }))}
              placeholder="Digite sua mensagem..."
              ref={inputRef}
              type="text"
              value={chat.draft}
            />
            <button aria-label="Enviar mensagem" disabled={!chat.draft.trim()} type="submit">
              <img alt="" height="62" src={import.meta.env.BASE_URL + "icon/enter-chat.svg"} width="62" />
            </button>
          </form>
        </section>
      ) : (
        <button
          aria-controls="astro-chat-window"
          aria-expanded="false"
          aria-label="Abrir chat do Astro"
          className="astro-chat-launcher"
          onClick={openChat}
          onKeyDown={moveLauncherWithKeyboard}
          onPointerCancel={endLauncherDrag}
          onPointerDown={startLauncherDrag}
          onPointerMove={moveLauncherDrag}
          onPointerUp={endLauncherDrag}
          ref={launcherRef}
          style={launcherPosition ? { position: 'fixed', left: launcherPosition.left, top: launcherPosition.top, right: 'auto', bottom: 'auto' } : undefined}
          type="button"
        >
          <span aria-hidden="true" className="astro-chat-hint"><span>Fale com a IA do</span><strong>Astro!</strong></span>
          <img alt="" draggable={false} height="92" src={import.meta.env.BASE_URL + "robot1.png"} width="92" />
        </button>
      )}
    </div>
  )
}

export default AstroChat
