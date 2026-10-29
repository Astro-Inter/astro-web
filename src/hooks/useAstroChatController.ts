import { getPopupDuration } from '../utils/popupMotion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthentication } from './useAuthentication'
import { useDragPosition } from './useDragPosition'
import { ChatApiError, endChatSession, getChatSessionMessages, listChatSessions, sendChatMessage, startChatSession } from '../services/chat'
import type { ChatMessage, ChatSessionStatus, ChatSessionSummary } from '../types/chat'
interface ChatState {
  open: boolean
  expanded: boolean
  draft: string
  pendingMessage: string
  pendingMessageId: string
  pendingReplyId: string
  messages: ChatMessage[]
  sessionId: string | null
  draftSessionId: string | null
  sessionStatus: ChatSessionStatus | null
  openingSessionId: string | null
  busy: 'idle' | 'sending' | 'loading-history' | 'ending'
  error: string
}

interface SessionListState {
  sessions: ChatSessionSummary[]
  nextCursor: string | null
  loading: boolean
  error: string
  failedCursor: string | null
  panelOpen: boolean
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
  bounds: { minLeft: number; maxLeft: number; minTop: number; maxTop: number }
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
  const viewportHeight = getViewportHeight()
  const compact = window.matchMedia('(max-width: 780px)').matches
  const expandedWidth = Math.min(25 * rem, viewportWidth - 2 * rem)
  const maxHeight = viewportHeight - (compact ? 5.5 : 2) * rem
  const expandedHeight = Math.min(expandedWidth * 1.3, maxHeight)
  const scale = expanded ? 1 : 0.8
  return { width: expandedWidth * scale, height: expandedHeight * scale }
}

function getViewportHeight(): number {
  return Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight, window.visualViewport?.height ?? window.innerHeight)
}

function keepAnchorInBounds(anchor: ChatAnchor): ChatAnchor {
  const inset = 8
  const rem = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth
  const topInset = window.matchMedia('(max-width: 780px)').matches ? 4.5 * rem + inset : inset
  const expanded = getChatSize(true)

  return {
    right: Math.max(expanded.width + inset, Math.min(anchor.right, viewportWidth - inset)),
    bottom: Math.max(expanded.height + topInset, Math.min(anchor.bottom, getViewportHeight() - inset)),
  }
}

function keepLauncherInChatBounds(position: ChatPosition, width: number, height: number): ChatPosition {
  const anchor = keepAnchorInBounds({ right: position.left + width, bottom: position.top + height })
  return { left: anchor.right - width, top: anchor.bottom - height }
}

function positionNearLauncher(anchor: ChatAnchor, width: number, height: number): ChatPosition {
  return { left: anchor.right - width, top: anchor.bottom - height }
}

function getDragBounds(width: number, height: number): ChatDrag['bounds'] {
  const min = keepAnchorInBounds({ right: 0, bottom: 0 })
  const max = keepAnchorInBounds({ right: Infinity, bottom: Infinity })
  return { minLeft: min.right - width, maxLeft: max.right - width, minTop: min.bottom - height, maxTop: max.bottom - height }
}

function getDragPosition(drag: ChatDrag, deltaX: number, deltaY: number): ChatPosition {
  return {
    left: Math.max(drag.bounds.minLeft, Math.min(drag.startLeft + deltaX, drag.bounds.maxLeft)),
    top: Math.max(drag.bounds.minTop, Math.min(drag.startTop + deltaY, drag.bounds.maxTop)),
  }
}

const suggestions = ['O que são Normas Regulamentadoras?', 'Como acesso os dashboards?']

const initialChatState: ChatState = {
  open: false,
  expanded: false,
  draft: '',
  pendingMessage: '',
  pendingMessageId: '',
  pendingReplyId: '',
  messages: [],
  sessionId: null,
  draftSessionId: null,
  sessionStatus: null,
  openingSessionId: null,
  busy: 'idle',
  error: '',
}

const initialSessionListState: SessionListState = {
  sessions: [],
  nextCursor: null,
  loading: false,
  error: '',
  failedCursor: null,
  panelOpen: false,
}

export function useAstroChatController() {
  const [chat, setChat] = useState<ChatState>(initialChatState)
  const [sessionList, setSessionList] = useState<SessionListState>(initialSessionListState)
  const [optimisticSessions, setOptimisticSessions] = useState<ChatSessionSummary[]>([])
  const { user, status } = useAuthentication()
  const authState = { ready: status === 'ready', authenticated: Boolean(user) }
  const historyVisible = authState.authenticated && sessionList.panelOpen
  const historySessions = useMemo(() => [
    ...optimisticSessions,
    ...sessionList.sessions.filter((session) => !optimisticSessions.some((optimistic) => optimistic.session_id === session.session_id)),
  ], [optimisticSessions, sessionList.sessions])
  const viewKey = !authState.ready ? 'checking-access'
    : !authState.authenticated ? 'login'
      : historyVisible ? 'history'
        : chat.messages.length === 0 && chat.busy !== 'sending' && !chat.error ? 'welcome'
          : 'conversation'
  const navigate = useNavigate()
  const [position, setPosition] = useState<ChatPosition | null>(null)
  const [launcherPosition, setLauncherPosition] = useState<ChatPosition | null>(null)
  const [dragging, setDragging] = useState(false)
  const [closing, setClosing] = useState(false)
  const { begin: beginDragMotion, move: moveDragMotion, finish: finishDragMotion } = useDragPosition()
  const launcherRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLElement>(null)
  const dragRef = useRef<PanelDrag | null>(null)
  const launcherDragRef = useRef<LauncherDrag | null>(null)
  const ignoreLauncherClickRef = useRef(false)
  const launcherAnchorRef = useRef<ChatAnchor | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const sessionListRequestRef = useRef({ version: 0, pending: false })
  const historyControllerRef = useRef<AbortController | null>(null)
  const operationControllerRef = useRef<AbortController | null>(null)

  const loadSessions = useCallback(async (cursor?: string | null, append = false) => {
    if (!authState.authenticated) return
    if (append && (!cursor || sessionListRequestRef.current.pending)) return
    historyControllerRef.current?.abort()
    const controller = new AbortController()
    historyControllerRef.current = controller
    const requestVersion = ++sessionListRequestRef.current.version
    sessionListRequestRef.current.pending = true
    setSessionList((current) => ({ ...current, loading: true, error: '', failedCursor: null }))
    try {
      const response = await listChatSessions(cursor, controller.signal)
      if (requestVersion !== sessionListRequestRef.current.version) return
      setOptimisticSessions((current) => current.filter((session) => !response.sessions.some((saved) => saved.session_id === session.session_id)))
      setSessionList((current) => {
        const existingIds = new Set(current.sessions.map((session) => session.session_id))
        return {
          ...current,
          sessions: append ? [...current.sessions, ...response.sessions.filter((session) => !existingIds.has(session.session_id))] : response.sessions,
          nextCursor: response.next_cursor,
          loading: false,
          error: '',
          failedCursor: null,
        }
      })
    } catch (error: unknown) {
      if (requestVersion !== sessionListRequestRef.current.version) return
      setSessionList((current) => ({
        ...current,
        loading: false,
        error: error instanceof ChatApiError ? error.message : 'Não foi possível carregar suas conversas.',
        failedCursor: append ? cursor ?? null : null,
      }))
    } finally {
      if (requestVersion === sessionListRequestRef.current.version) sessionListRequestRef.current.pending = false
    }
  }, [authState.authenticated])

  const loadMoreSessions = useCallback(() => {
    void loadSessions(sessionList.nextCursor, true)
  }, [loadSessions, sessionList.nextCursor])

  const retrySessions = useCallback(() => {
    void loadSessions(sessionList.failedCursor, sessionList.failedCursor !== null)
  }, [loadSessions, sessionList.failedCursor])

  useEffect(() => () => {
    historyControllerRef.current?.abort()
    operationControllerRef.current?.abort()
    operationControllerRef.current = null
    sessionListRequestRef.current.version += 1
    sessionListRequestRef.current.pending = false
  }, [user?.uid])

  useEffect(() => {
    if (chat.open && authState.authenticated) void loadSessions()
  }, [authState.authenticated, chat.open, loadSessions])

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
    finishDragMotion()
    const anchor = launcherAnchorRef.current
    if (anchor) {
      const launcherSize = 4.5 * (Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16)
      setLauncherPosition(keepLauncherInChatBounds({
        left: anchor.right - launcherSize,
        top: anchor.bottom - launcherSize,
      }, launcherSize, launcherSize))
    }
    if ((window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.astroReducedMotion === 'true')) {
      finishClose()
    } else {
      setClosing(true)
      closeTimerRef.current = window.setTimeout(finishClose, getPopupDuration('modal'))
    }
  }, [closing, finishClose, finishDragMotion])

  useEffect(() => {
    if (chat.open && !historyVisible && chat.busy === 'idle') inputRef.current?.focus()
  }, [chat.open, historyVisible, chat.busy])

  useEffect(() => {
    if (historyVisible) return
    const body = messagesRef.current
    if (!body || (chat.messages.length === 0 && chat.busy === 'idle' && !chat.error)) return
    body.scrollTo({ top: body.scrollHeight })
    const content = body.querySelector('.astro-chat-messages')
    if (!content) return
    let followBottom = true
    const trackScroll = () => { followBottom = body.scrollHeight - body.clientHeight - body.scrollTop < 48 }
    const observer = new ResizeObserver(() => {
      if (followBottom) body.scrollTo({ top: body.scrollHeight })
    })
    observer.observe(content)
    body.addEventListener('scroll', trackScroll, { passive: true })
    return () => { observer.disconnect(); body.removeEventListener('scroll', trackScroll) }
  }, [chat.messages, chat.busy, chat.error, chat.open, historyVisible, viewKey])

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
      bounds: getDragBounds(size.width, size.height),
      moved: false,
    }
    beginDragMotion(event.currentTarget, { left: rect.left, top: rect.top }, (nextPosition) => {
      setPosition(nextPosition)
      setDragging(false)
    })
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
    const nextPosition = getDragPosition(drag, deltaX, deltaY)
    launcherAnchorRef.current = { right: nextPosition.left + drag.width, bottom: nextPosition.top + drag.height }
    moveDragMotion(nextPosition)
    event.preventDefault()
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    finishDragMotion()
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
      bounds: getDragBounds(rect.width, rect.height),
      moved: false,
    }
    beginDragMotion(event.currentTarget, { left: rect.left, top: rect.top }, setLauncherPosition)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveLauncherDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = launcherDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return
    drag.moved = true
    moveDragMotion(getDragPosition(drag, deltaX, deltaY))
    event.preventDefault()
  }

  function endLauncherDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = launcherDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    launcherDragRef.current = null
    finishDragMotion()
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
    if (authState.authenticated && !chat.sessionId && !chat.draftSessionId && chat.messages.length === 0) createDraftSession(false)
    setChat((current) => ({ ...current, open: true, error: '' }))
  }

  function toggleExpanded() {
    if (closing) return
    const anchor = launcherAnchorRef.current
    if (anchor) placePanel(anchor, !chat.expanded)
    setChat((current) => ({ ...current, expanded: !current.expanded }))
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || !authState.authenticated || chat.busy !== 'idle' || operationControllerRef.current) return
    const controller = new AbortController()
    operationControllerRef.current = controller

    const pendingMessageId = crypto.randomUUID()
    const pendingReplyId = crypto.randomUUID()
    setChat((current) => ({ ...current, busy: 'sending', pendingMessage: trimmed, pendingMessageId, pendingReplyId, error: '' }))
    try {
      if (chat.sessionId && chat.sessionStatus === 'encerrada') await startChatSession(chat.sessionId, controller.signal)
      const response = await sendChatMessage(trimmed, chat.sessionId, controller.signal)
      if (controller.signal.aborted) return
      const now = new Date().toISOString()
      setOptimisticSessions((current) => {
        const previous = current.find((session) => session.session_id === chat.draftSessionId || session.session_id === response.session_id)
          ?? sessionList.sessions.find((session) => session.session_id === response.session_id)
        const saved: ChatSessionSummary = {
          session_id: response.session_id,
          title: chat.draftSessionId || !previous?.title ? trimmed : previous.title,
          last_message_preview: response.resposta,
          created_at: previous?.created_at ?? now,
          updated_at: now,
          status: 'ativa',
        }
        return [saved, ...current.filter((session) => session.session_id !== chat.draftSessionId && session.session_id !== response.session_id)]
      })
      setChat((current) => ({
        ...current,
        draft: '',
        pendingMessage: '',
        sessionId: response.session_id,
        draftSessionId: null,
        sessionStatus: 'ativa',
        busy: 'idle',
        error: '',
        messages: [
          ...current.messages,
          { id: pendingMessageId, author: 'user', text: trimmed },
          { id: pendingReplyId, author: 'astro', text: response.resposta },
        ],
      }))
      void loadSessions()
      inputRef.current?.focus()
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      setChat((current) => ({ ...current, busy: 'idle', pendingMessage: '', error: error instanceof Error ? error.message : 'Não foi possível enviar sua mensagem.' }))
    } finally {
      if (operationControllerRef.current === controller) operationControllerRef.current = null
    }
  }

  async function selectSession(sessionId: string) {
    if (chat.busy !== 'idle' || operationControllerRef.current) return
    if (sessionId === chat.draftSessionId) {
      setSessionList((current) => ({ ...current, panelOpen: false }))
      return
    }
    const controller = new AbortController()
    operationControllerRef.current = controller
    setChat((current) => ({ ...current, busy: 'loading-history', openingSessionId: sessionId, error: '' }))
    try {
      const history = await getChatSessionMessages(sessionId, controller.signal)
      if (controller.signal.aborted) return
      setChat((current) => ({
        ...current,
        busy: 'idle',
        openingSessionId: null,
        draft: '',
        draftSessionId: null,
        sessionId,
        sessionStatus: history.status,
        messages: history.mensagens.map((message) => ({
          id: crypto.randomUUID(),
          author: message.role === 'user' ? 'user' : 'astro',
          text: message.content,
        })),
      }))
      if (chat.draftSessionId) {
        setOptimisticSessions((current) => current.filter((session) => session.session_id !== chat.draftSessionId))
      }
      setSessionList((current) => ({ ...current, panelOpen: false }))
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      setChat((current) => ({ ...current, busy: 'idle', openingSessionId: null, error: error instanceof Error ? error.message : 'Não foi possível abrir esta conversa.' }))
    } finally {
      if (operationControllerRef.current === controller) operationControllerRef.current = null
    }
  }

  async function closeSession() {
    if (!chat.sessionId || chat.busy !== 'idle' || !authState.authenticated || operationControllerRef.current) return
    const controller = new AbortController()
    operationControllerRef.current = controller
    setChat((current) => ({ ...current, busy: 'ending', error: '' }))
    try {
      const response = await endChatSession(chat.sessionId, controller.signal)
      if (controller.signal.aborted) return
      setChat((current) => ({ ...current, busy: 'idle', sessionStatus: response.status, error: '' }))
      await loadSessions()
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      setChat((current) => ({ ...current, busy: 'idle', error: error instanceof Error ? error.message : 'Não foi possível encerrar esta conversa.' }))
    } finally {
      if (operationControllerRef.current === controller) operationControllerRef.current = null
    }
  }

  function createDraftSession(resetConversation: boolean) {
    const draftSessionId = `local:${crypto.randomUUID()}`
    const now = new Date().toISOString()
    setOptimisticSessions((current) => [
      { session_id: draftSessionId, title: 'Nova conversa', last_message_preview: '', created_at: now, updated_at: now, status: 'ativa' },
      ...current.filter((session) => session.session_id !== chat.draftSessionId),
    ])
    setChat((current) => resetConversation
      ? { ...current, draft: '', messages: [], sessionId: null, draftSessionId, sessionStatus: null, error: '' }
      : { ...current, draftSessionId })
  }

  function startNewSession() {
    if (chat.busy !== 'idle') return
    createDraftSession(true)
    setSessionList((current) => ({ ...current, panelOpen: false }))
  }

  const chatSize = chat.open ? getChatSize(chat.expanded) : null
  const expandedChatSize = chat.open ? getChatSize(true) : null
  const visibleMessages: ChatMessage[] = chat.busy === 'sending'
    ? [...chat.messages,
      { id: chat.pendingMessageId, author: 'user', text: chat.pendingMessage },
      { id: chat.pendingReplyId, author: 'astro', text: '' }]
    : chat.messages

  return { chat, setChat, sessionList, setSessionList, authState, historyVisible, historySessions, viewKey, navigate, position, launcherPosition, dragging, closing, launcherRef, inputRef, messagesRef, windowRef, loadMoreSessions, retrySessions, closeChat, startDrag, moveDrag, endDrag, moveWithKeyboard, startLauncherDrag, moveLauncherDrag, endLauncherDrag, moveLauncherWithKeyboard, openChat, toggleExpanded, sendMessage, selectSession, closeSession, createDraftSession, startNewSession, chatSize, expandedChatSize, visibleMessages, suggestions }
}
