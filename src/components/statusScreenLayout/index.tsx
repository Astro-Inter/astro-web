import { BUTTONS } from '../../gtm/buttons'
import type { ReactNode, Ref } from 'react'
import AstroBrand from '../astroBrand'
import PurpleButton from '../purpleButton'
import HelpLink from '../helpLink'

interface StatusScreenLayoutProps {
  titleId: string
  title: string
  description: string
  illustration: string
  illustrationWidth: number
  illustrationHeight: number
  illustrationCenterX?: number
  illustrationBounds: { left: number; top: number; right: number; bottom: number }
  actionLabel?: string
  onAction?: () => void
  actions?: ReactNode
  feedback?: ReactNode
  descriptionRole?: 'alert' | 'status'
  headingRef?: Ref<HTMLHeadingElement>
  busy?: boolean
  className?: string
}

function StatusScreenLayout({ titleId, title, description, illustration, illustrationWidth, illustrationHeight, illustrationCenterX, illustrationBounds, actionLabel, onAction, actions, feedback, descriptionRole, headingRef, busy = false, className = '' }: StatusScreenLayoutProps) {
  // Área visível de AccessKeyVerified: (53, 60)–(437, 290), numa imagem 509×339.
  // Desconsidera pixels quase transparentes (alpha < 16), preservando a proporção do desenho.
  const imageScale = 230 / (illustrationBounds.bottom - illustrationBounds.top)
  const imageLeft = 509 / 2 - (illustrationCenterX ?? (illustrationBounds.left + illustrationBounds.right) / 2) * imageScale
  const imageTop = 339 / 2 - (illustrationBounds.top + illustrationBounds.bottom) / 2 * imageScale
  return (
    <div className={`access-verified-page status-screen-page ${className}`}>
      <main data-track-page={true} aria-labelledby={titleId} aria-describedby={`${titleId}-description`} aria-busy={busy} className="access-verified-content astro-scale-90">
        <header><AstroBrand /></header>
        <div className="access-verified-illustration status-screen-illustration">
          <img alt="" height={illustrationHeight} src={import.meta.env.BASE_URL + illustration} style={{ left: `${imageLeft / 509 * 100}%`, top: `${imageTop / 339 * 100}%`, width: `${illustrationWidth * imageScale / 509 * 100}%` }} width={illustrationWidth} />
        </div>
        <header className="login-heading">
          <h1 id={titleId} ref={headingRef} tabIndex={headingRef ? -1 : undefined}>{title}</h1>
          <p id={`${titleId}-description`} role={descriptionRole}>{description}</p>
        </header>
        {(actionLabel || actions) && <div className="status-screen-actions">
          {actionLabel && <PurpleButton data-track-action={BUTTONS.comuns.voltar_inicio} onClick={onAction}>{actionLabel}</PurpleButton>}
          {actions}
        </div>}
        {feedback}
      </main>
      <HelpLink />
    </div>
  )
}

export default StatusScreenLayout
