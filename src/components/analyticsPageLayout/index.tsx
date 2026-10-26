import type { MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AstroBrand from '../astroBrand'
import AstroIcon from '../astroIcon'
import HelpLink from '../helpLink'

interface AnalyticsPageLayoutProps { children: ReactNode; onBack?: MouseEventHandler<HTMLAnchorElement> }

export default function AnalyticsPageLayout({ children, onBack }: AnalyticsPageLayoutProps) {
  return <div className="create-forms-page analytics-page astro-scale-90">
    <Link className="payment-back-button" to="/mainHomeScreen" aria-label="Voltar para a Home" title="Voltar para a Home" onClick={onBack}><AstroIcon name="back" /></Link>
    <header className="create-password-header create-forms-header"><AstroBrand /></header>
    <main className="create-forms-main analytics-main analytics-content" id="conteudo-principal" data-track-page={true}>{children}</main>
    <HelpLink />
  </div>
}
