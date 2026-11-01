import { useEffect, useState } from 'react';
import { dismissActionNotice, leaveActionNotice, pauseActionNotice, type ActionNotice } from '../../utils/actionFeedback';
import AstroIcon from '../astroIcon';

function Notice({ id, message, tone, createdAt, expiresAt, pausedAt, leavingAt }: ActionNotice) {
  const [mountedAt] = useState(Date.now)
  const leaving = leavingAt !== null
  useEffect(() => {
    if (pausedAt !== null && leavingAt === null) return
    const timer = window.setTimeout(() => {
      if (leavingAt !== null) dismissActionNotice(id)
      else leaveActionNotice(id)
    }, Math.max(0, (leavingAt !== null ? leavingAt + 180 : expiresAt) - Date.now()))
    return () => window.clearTimeout(timer)
  }, [expiresAt, id, leavingAt, pausedAt])
  useEffect(() => () => {
    pauseActionNotice(id, 'pointer', false)
    pauseActionNotice(id, 'focus', false)
  }, [id])
  return <div className="astro-action-notice astro-scale-90" data-leaving={leaving} data-tone={tone} style={{ animationDelay: `${-Math.max(0, mountedAt - (leavingAt ?? createdAt))}ms` }}
    onMouseEnter={() => pauseActionNotice(id, 'pointer', true)} onMouseLeave={() => pauseActionNotice(id, 'pointer', false)}
    onFocus={() => pauseActionNotice(id, 'focus', true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) pauseActionNotice(id, 'focus', false) }}>
    <span aria-hidden="true" className="astro-action-notice-icon"><AstroIcon name={tone === 'error' ? 'warning-circle' : 'check'} /></span>
    <p role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'} aria-atomic="true">{message}</p>
    <button aria-label="Fechar notificação" onClick={() => leaveActionNotice(id)} type="button"><AstroIcon name="close" /></button>
  </div>
}
export default Notice
