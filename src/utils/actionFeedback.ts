export type ActionNoticeTone = 'success' | 'error'
export interface ActionNotice { id: number; message: string; tone: ActionNoticeTone; createdAt: number; expiresAt: number; pausedAt: number | null; pausedBy: readonly ('pointer' | 'focus')[]; leavingAt: number | null }
interface ActionFeedbackState { pending: number; notices: readonly ActionNotice[] }
let state: ActionFeedbackState = { pending: 0, notices: [] }
let nextId = 0
const listeners = new Set<() => void>()
function update(next: ActionFeedbackState) {
  state = next
  listeners.forEach(listener => listener())
}
export const subscribeActionFeedback = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const getActionFeedback = () => state
export function beginActionLoading(): () => void {
  update({ ...state, pending: state.pending + 1 })
  let finished = false
  return () => {
    if (finished) return
    finished = true
    update({ ...state, pending: Math.max(0, state.pending - 1) })
  }
}
export function notifyAction(message: string, tone: ActionNoticeTone = 'success'): void {
  if (!message.trim()) return
  const createdAt = Date.now()
  update({ ...state, notices: [...state.notices.filter(notice => notice.message !== message).slice(-2), { id: ++nextId, message, tone, createdAt, expiresAt: createdAt + 5000, pausedAt: null, pausedBy: [], leavingAt: null }] })
}
export function pauseActionNotice(id: number, source: 'pointer' | 'focus', paused: boolean): void {
  const notice = state.notices.find(item => item.id === id)
  if (!notice || notice.leavingAt !== null || notice.pausedBy.includes(source) === paused) return
  const pausedBy = paused ? [...notice.pausedBy, source] : notice.pausedBy.filter(item => item !== source)
  const now = Date.now()
  const next = { ...notice, pausedBy, pausedAt: pausedBy.length ? notice.pausedAt ?? now : null, expiresAt: !pausedBy.length && notice.pausedAt !== null ? notice.expiresAt + now - notice.pausedAt : notice.expiresAt }
  update({ ...state, notices: state.notices.map(item => item.id === id ? next : item) })
}
export function leaveActionNotice(id: number): void {
  const notice = state.notices.find(item => item.id === id)
  if (!notice || notice.leavingAt !== null) return
  update({ ...state, notices: state.notices.map(item => item.id === id ? { ...item, leavingAt: Date.now() } : item) })
}
export function dismissActionNotice(id: number): void {
  update({ ...state, notices: state.notices.filter(notice => notice.id !== id) })
}
