import AstroIcon from '../astroIcon'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { dismissActionNotice, getActionFeedback, subscribeActionFeedback, type ActionNoticeTone } from '../../utils/actionFeedback'
import LoginLoadingOverlay from '../loginLoadingOverlay'

interface NoticeProps { id: number; message: string; tone: ActionNoticeTone }
function Notice({ id, message, tone }: NoticeProps) {
  const [paused, setPaused] = useState(false)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (paused && !leaving) return
    const timer = window.setTimeout(() => {
      if (leaving) dismissActionNotice(id)
      else setLeaving(true)
    }, leaving ? 180 : 5000)
    return () => window.clearTimeout(timer)
  }, [id, leaving, paused])
  return <div className="astro-action-notice astro-scale-90" data-leaving={leaving} data-tone={tone}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
    <span aria-hidden="true" className="astro-action-notice-icon"><AstroIcon name={tone === 'error' ? 'warning-circle' : 'check'} /></span>
    <p role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'} aria-atomic="true">{message}</p>
    <button aria-label="Fechar notificação" onClick={() => setLeaving(true)} type="button"><AstroIcon name="close" /></button>
  </div>
}
function getNoticeTarget(): HTMLElement {
  return Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]:not(.login-loading-overlay)')).at(-1) ?? document.body
}
function subscribeDialogs(listener: () => void): () => void {
  const onDialogChange = (event: Event) => { if (event.target instanceof window.HTMLDialogElement) listener() }
  document.addEventListener('toggle', onDialogChange, true)
  document.addEventListener('close', onDialogChange, true)
  return () => {
    document.removeEventListener('toggle', onDialogChange, true)
    document.removeEventListener('close', onDialogChange, true)
  }
}
function ActionFeedbackHost() {
  const { pending, notices } = useSyncExternalStore(subscribeActionFeedback, getActionFeedback, getActionFeedback)
  const ref = useRef<HTMLDivElement>(null)
  const noticeTarget = useSyncExternalStore(subscribeDialogs, getNoticeTarget, getNoticeTarget)
  useEffect(() => {
    const element = ref.current
    if (!element?.showPopover) return
    if (notices.length > 0 && !element.matches(':popover-open')) element.showPopover()
    else if (notices.length === 0 && element.matches(':popover-open')) element.hidePopover()
  }, [notices.length, noticeTarget])
  return <>
    {pending > 0 && <LoginLoadingOverlay />}
    {createPortal(<div className="astro-action-notices" data-in-dialog={noticeTarget !== document.body} popover="manual" ref={ref}>{notices.map(notice => <Notice key={notice.id} {...notice} />)}</div>, noticeTarget)}
  </>
}
export default ActionFeedbackHost
