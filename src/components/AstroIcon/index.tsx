type AstroIconName =
  | 'back'
  | 'card'
  | 'calendar'
  | 'document'
  | 'expiry'
  | 'eye'
  | 'eye-off'
  | 'help'
  | 'active'
  | 'mapping'
  | 'pix'
  | 'receipt'
  | 'report'
  | 'security'

interface AstroIconProps {
  className?: string
  name: AstroIconName
}

const strokeWidth = 1.5

function AstroIcon({ className, name }: AstroIconProps) {
  const commonProps = {
    'aria-hidden': true,
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth,
  }

  if (name === 'back') {
    return <svg {...commonProps} viewBox="0 0 24 24"><path d="m14.5 5-7 7 7 7" /></svg>
  }

  if (name === 'eye') {
    return <svg {...commonProps} viewBox="0 0 24 24"><path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>
  }

  if (name === 'eye-off') {
    return <svg {...commonProps} viewBox="0 0 24 24"><path d="M3 3l18 18M9.7 6.8a10.7 10.7 0 0 1 2.3-.3c6 0 9.5 5.5 9.5 5.5a14 14 0 0 1-3.4 3.8M6.2 8.1A14 14 0 0 0 2.5 12s3.5 5.5 9.5 5.5a10.7 10.7 0 0 0 2.2-.2M10.3 10.3a2.5 2.5 0 0 0 3.4 3.4" /></svg>
  }

  if (name === 'document') {
    return <svg {...commonProps} viewBox="0 0 24 24"><path d="M6 2.5h8l4 4V21H6z" /><path d="M14 2.5V7h4M9 11h6M9 14h6M9 17h4" /></svg>
  }

  if (name === 'active') {
    return <svg {...commonProps} viewBox="0 0 24 24"><circle cx="10" cy="7" r="3" /><path d="M4 19v-2a6 6 0 0 1 9-5.2M14 17l2.2 2.2L21 14.5" /></svg>
  }

  if (name === 'calendar') {
    return <svg {...commonProps} viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h8" /></svg>
  }

  if (name === 'receipt') {
    return <svg {...commonProps} viewBox="0 0 24 24"><path d="M5 2.5h14v19l-2.3-1.5-2.4 1.5-2.3-1.5-2.3 1.5-2.4-1.5L5 21.5z" /><path d="M8 8h8M8 11h8M8 14h8M8 17h5" /></svg>
  }

  if (name === 'card') {
    return <svg {...commonProps} viewBox="0 0 16 12"><rect height="10" rx="1" width="14" x="1" y="1" /><path d="M2 4h12" /></svg>
  }

  if (name === 'expiry') {
    return <svg {...commonProps} viewBox="0 0 16 16"><path d="M5 2h6M5 14h6M5 2c0 2.7 1.1 3.3 3 5-1.9 1.7-3 2.3-3 5m6-10c0 2.7-1.1 3.3-3 5 1.9 1.7 3 2.3 3 5" /></svg>
  }

  if (name === 'mapping') {
    return <svg {...commonProps} viewBox="0 0 16 16"><path d="M4 1.5h5l3 3V14H4z" /><path d="M9 1.5V5h3M6.2 8.3l1.1 1.1 2.5-2.6" /></svg>
  }

  if (name === 'report') {
    return <svg {...commonProps} viewBox="0 0 16 16"><rect height="12" rx="1" width="11" x="2.5" y="2" /><path d="M5 5h6M5 8h6M5 11h4" /></svg>
  }

  if (name === 'security') {
    return <svg {...commonProps} viewBox="0 0 16 12"><rect height="9" rx="1" width="13" x="1.5" y="1.5" /><circle cx="10.8" cy="6" r="1.5" /></svg>
  }

  if (name === 'pix') {
    return <svg aria-hidden="true" className={className} viewBox="0 0 18 18"><path d="m9 1.5 3.6 3.6L9 8.7 5.4 5.1zM1.5 9l3.6-3.6L8.7 9l-3.6 3.6zM9.3 9l3.6-3.6L16.5 9l-3.6 3.6zM9 9.3l3.6 3.6L9 16.5l-3.6-3.6z" fill="currentColor" stroke="none" /></svg>
  }

  return <svg {...commonProps} viewBox="0 0 27 27"><path d="M7.1 18.6a6.6 6.6 0 1 1 4.1 2.1l-3.7 1.1.9-3.2a6.6 6.6 0 0 1-1.3-0Z" /><path d="M15.9 8.4a6.3 6.3 0 0 1 4.8 10.2l.8 2.6-3.2-1a6.3 6.3 0 0 1-3.2.8" /></svg>
}

export default AstroIcon
