import type { MouseEvent } from 'react'
import type { AnalyticsView, SavedDashboard } from '../../types/dashboard'
import AstroIcon from '../astroIcon'
import TruncatedText from '../truncatedText'
import DashboardArtwork from '../dashboardArtwork'

export interface DashboardGalleryItem {
  id: string
  name: string
  description: string
  widgetCount: number
  view: AnalyticsView | null
  saved: SavedDashboard | null
}
interface DashboardCardProps {
  item: DashboardGalleryItem
  menuOpen: boolean
  onOpen: (event: MouseEvent<HTMLButtonElement>) => void
  onOpenMenu: (event: MouseEvent<HTMLButtonElement>) => void
}
export default function DashboardCard({ item, menuOpen, onOpen, onOpenMenu }: DashboardCardProps) {
  return <article className="dashboard-card" aria-labelledby={`dashboard-card-${item.id}`}>
    <div className="dashboard-card-header">
      <span className="dashboard-card-art"><DashboardArtwork artwork={item.saved?.config.artwork ?? (item.view === 'eventos' ? 'trends' : 'overview')} /></span>
      <div className="dashboard-card-copy">
        <span className="dashboard-card-category">{item.view ? 'Visão padrão' : 'Sua visão'}</span>
        <h2 id={`dashboard-card-${item.id}`} className="dashboard-card-title">
          <button type="button" className="dashboard-card-open" aria-label={`Abrir visão ${item.name}`} onClick={onOpen}><TruncatedText nativeEllipsis>{item.name}</TruncatedText></button>
        </h2>
        <p className="dashboard-card-description"><TruncatedText nativeEllipsis>{item.description}</TruncatedText></p>
      </div>
    </div>
    <div className="dashboard-card-footer">
      <span>{item.widgetCount} {item.widgetCount === 1 ? 'gráfico' : 'gráficos'}</span>
      <span className="dashboard-card-link" aria-hidden="true"><span className="dashboard-card-link-label">Abrir dashboard</span><span className="dashboard-card-link-icon"><AstroIcon name="chevron-right" /></span></span>
    </div>
    <button type="button" className="dashboard-card-options" aria-label={`Opções para ${item.name}`} aria-haspopup="menu" aria-expanded={menuOpen} aria-controls={menuOpen ? 'dashboard-card-options' : undefined} onClick={onOpenMenu}><AstroIcon name="dots" /></button>
  </article>
}
