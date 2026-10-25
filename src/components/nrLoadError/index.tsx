import AstroIcon from '../astroIcon'

interface NrLoadErrorProps { title: string; message: string; onRetry: () => void }

export default function NrLoadError({ title, message, onRetry }: NrLoadErrorProps) {
  return <div className="nr-load-error" role="alert">
    <span className="nr-load-error-icon" aria-hidden="true"><AstroIcon name="warning-circle" /></span>
    <div className="nr-load-error-content"><h2>{title}</h2><p>{message}</p></div>
    <button className="nr-load-error-retry" type="button" onClick={onRetry}><AstroIcon name="reload" />Tentar novamente</button>
  </div>
}
