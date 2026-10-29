import type { MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AstroBrand from '../astroBrand'
import AstroIcon from '../astroIcon'
import HelpLink from '../helpLink'

interface AnalyticsPageLayoutProps { children: ReactNode; onBack?: MouseEventHandler<HTMLAnchorElement>; backLabel?: string; backTo?: string }

export default function AnalyticsPageLayout({ children, onBack, backLabel = 'Voltar para a Home', backTo = '/mainHomeScreen' }: AnalyticsPageLayoutProps) {
  return <div className="create-forms-page analytics-page astro-scale-90">
    <Link className="payment-back-button" to={backTo} aria-label={backLabel} title={backLabel} onClick={onBack}><AstroIcon name="back" /></Link>
    <header className="create-password-header create-forms-header"><AstroBrand /></header>
    <main className="create-forms-main analytics-main analytics-content" id="conteudo-principal" data-track-page={true}>{children}</main>
    <HelpLink />
  </div>
}
