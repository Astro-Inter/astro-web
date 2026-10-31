import { useEffect, useState } from 'react';
import { dismissActionNotice, type ActionNoticeTone } from '../../utils/actionFeedback';
import AstroIcon from '../astroIcon';

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
export default Notice
