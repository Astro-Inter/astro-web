import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AstroBrand from '../astroBrand'
import AstroIcon from '../astroIcon'
import HelpLink from '../helpLink'
import LoginLoadingOverlay from '../loginLoadingOverlay'

interface PasswordRecoveryLayoutProps {
  children: ReactNode
  titleId: string
  pending: boolean
  backTo?: string
}

function PasswordRecoveryLayout({ children, titleId, pending, backTo }: PasswordRecoveryLayoutProps) {
  return <>
    <main data-track-page={true} className="create-password-page" inert={pending} aria-busy={pending}>
      {backTo && <Link className="payment-back-button" aria-label="Voltar" to={backTo}><AstroIcon name="back" /></Link>}
      <header className="create-password-header"><AstroBrand /></header>
      <section className="login-card create-password-card astro-scale-90" aria-labelledby={titleId}>{children}</section>
      <HelpLink />
    </main>
    {pending && <LoginLoadingOverlay />}
  </>
}

export default PasswordRecoveryLayout
