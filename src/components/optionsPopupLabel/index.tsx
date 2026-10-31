import { useExitPresence } from '../../hooks/useExitPresence';
import TruncatedText from '../truncatedText';
interface OptionLabelProps { label: string; loading?: boolean }

function OptionLabel({ label, loading = false }: OptionLabelProps) {
  const presence = useExitPresence(true, loading)
  return presence.present
    ? <span aria-hidden="true" className={`api-skeleton skeleton-copy astro-options-popup-skeleton${presence.exiting ? ' event-loading-exit' : ''}`}>{label}</span>
    : <span className="event-loading-ready"><TruncatedText focusParent nativeEllipsis>{label}</TruncatedText></span>
}


export default OptionLabel
