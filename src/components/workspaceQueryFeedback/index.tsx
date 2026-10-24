interface WorkspaceQueryFeedbackProps {
  loading: boolean
  error: string
  onRetry: () => void
}

function WorkspaceQueryFeedback({ loading, error, onRetry }: WorkspaceQueryFeedbackProps) {
  return <>{loading && <p role="status">Carregando informações do workspace…</p>}
    {error && <div><p className="login-field-error" role="alert">{error}</p><button type="button" onClick={onRetry}>Tentar novamente</button></div>}</>
}

export default WorkspaceQueryFeedback
