function LoadingIndicator() {
  return <div className="login-loading-indicator" role="status" aria-live="polite">
    <span className="login-loading-spinner" aria-hidden="true" />
    <p className="login-loading-label">Carregando<span className="loading-planet-dots" aria-hidden="true" /></p>
  </div>
}
export default LoadingIndicator
