import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { getActionFeedback, subscribeActionFeedback } from '../../utils/actionFeedback'
import Notice from '../actionFeedbackNotice'
import LoginLoadingOverlay from '../loginLoadingOverlay'
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
