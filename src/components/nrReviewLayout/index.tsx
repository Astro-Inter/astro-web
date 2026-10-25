import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import AstroIcon from '../astroIcon'
import AdminHeader from '../adminHeader'

interface NrReviewLayoutProps { title: string; description?: string; backTo?: string; children: ReactNode }
export default function NrReviewLayout({ title, description = 'Revise as análises geradas pela IA antes de publicar no catálogo.', backTo, children }: NrReviewLayoutProps) {
  return <div className={`nr-review-screen${backTo ? ' nr-review-screen--detail' : ''}`}>
    <AdminHeader />
    <main id="main-content" className="nr-review-main astro-scale-90">
      <div className="nr-review-container position-content">
      {backTo && <Link className="nr-review-back" to={backTo}><AstroIcon name="back" />Voltar à listagem</Link>}
      <header className="position-heading nr-review-heading">
        <h1 id="nr-review-title">{title}</h1>
        <p>{description}</p>
      </header>
      {!backTo && <nav className="nr-review-tabs" aria-label="Catálogo de normas">
        <NavLink to="/admin/nrs/pending">Aguardando revisão</NavLink>
        <NavLink to="/admin/nrs/catalog">Catálogo atual</NavLink>
      </nav>}
      {children}
      </div>
    </main>
  </div>
}
