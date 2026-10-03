import AstroBrand from '../AstroBrand'
import PurpleButton from '../PurpleButton'

interface StatusScreenLayoutProps {
  titleId: string
  title: string
  description: string
  illustration: string
  illustrationWidth: number
  illustrationHeight: number
  illustrationBounds: { left: number; top: number; right: number; bottom: number }
  actionLabel?: string
  onAction?: () => void
}

function StatusScreenLayout({ titleId, title, description, illustration, illustrationWidth, illustrationHeight, illustrationBounds, actionLabel, onAction }: StatusScreenLayoutProps) {
  // Área visível de AccessKeyVerified: (53, 60)–(437, 290), numa imagem 509×339.
  // Desconsidera pixels quase transparentes (alpha < 16), preservando a proporção do desenho.
  const imageScale = 230 / (illustrationBounds.bottom - illustrationBounds.top)
  const imageLeft = 245 - (illustrationBounds.left + illustrationBounds.right) / 2 * imageScale
  const imageTop = 60 - illustrationBounds.top * imageScale
  return (
    <div className="access-verified-page status-screen-page">
      <main aria-labelledby={titleId} className="access-verified-content astro-scale-90">
        <header><AstroBrand /></header>
        <div className="access-verified-illustration status-screen-illustration">
          <img alt="" height={illustrationHeight} src={import.meta.env.BASE_URL + illustration} style={{ left: `${imageLeft / 509 * 100}%`, top: `${imageTop / 339 * 100}%`, width: `${illustrationWidth * imageScale / 509 * 100}%` }} width={illustrationWidth} />
        </div>
        <header className="login-heading">
          <h1 id={titleId}>{title}</h1>
          <p>{description}</p>
        </header>
        {actionLabel && <PurpleButton className="access-verified-button" onClick={onAction}>{actionLabel}</PurpleButton>}
      </main>
      <button className="help-link" type="button"><span aria-hidden="true" className="help-icon" /><span>Precisa de ajuda</span></button>
    </div>
  )
}

export default StatusScreenLayout
