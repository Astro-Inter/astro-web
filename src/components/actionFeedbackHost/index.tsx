import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'
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
  const observer = new window.MutationObserver(records => {
    if (records.some(record => record.type === 'attributes' && record.target instanceof window.HTMLDialogElement
      || record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].some(node => node instanceof window.Element && (node.matches('dialog') || node.querySelector('dialog'))))) listener()
  })
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
  return () => {
    observer.disconnect()
    document.removeEventListener('toggle', onDialogChange, true)
    document.removeEventListener('close', onDialogChange, true)
  }
}
function ActionFeedbackHost() {
  const { pending, notices } = useSyncExternalStore(subscribeActionFeedback, getActionFeedback, getActionFeedback)
  const ref = useRef<HTMLDivElement>(null)
  const noticeTarget = useSyncExternalStore(subscribeDialogs, getNoticeTarget, getNoticeTarget)
  useLayoutEffect(() => {
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
