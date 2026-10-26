import ActionLoading from '../actionLoading'

interface WorkspaceQueryFeedbackProps {
  loading: boolean
  error: string
  onRetry: () => void
}

function WorkspaceQueryFeedback({ loading, error, onRetry }: WorkspaceQueryFeedbackProps) {
  return <><ActionLoading active={loading} />
    {error && <div><p className="login-field-error" role="alert">{error}</p><button type="button" onClick={onRetry}>Tentar novamente</button></div>}</>
}

export default WorkspaceQueryFeedback
