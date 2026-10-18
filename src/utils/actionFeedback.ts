export type ActionNoticeTone = 'success' | 'error'
interface ActionNotice { id: number; message: string; tone: ActionNoticeTone }
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
  update({ ...state, notices: [...state.notices.filter(notice => notice.message !== message).slice(-2), { id: ++nextId, message, tone }] })
}
export function dismissActionNotice(id: number): void {
  update({ ...state, notices: state.notices.filter(notice => notice.id !== id) })
}
