import { createPortal } from 'react-dom'

function LoginLoadingOverlay() {
  return createPortal(
    <div className="login-loading-overlay astro-scale-90" role="status" aria-live="polite">
      <div className="loading-planet">
        <span className="login-loading-spinner" aria-hidden="true" />
        <p className="login-loading-label">Carregando<span className="loading-planet-dots" aria-hidden="true" /></p>
      </div>
    </div>,
    document.body,
  )
}

export default LoginLoadingOverlay
