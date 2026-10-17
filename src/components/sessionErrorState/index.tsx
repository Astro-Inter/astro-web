import { useEffect, useRef } from 'react'
import { useSessionRecovery } from '../../hooks/useSessionRecovery'
import AstroBrand from '../astroBrand'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'

interface SessionErrorStateProps {
  error: string
}

function SessionErrorState({ error }: SessionErrorStateProps) {
  const recovery = useSessionRecovery()
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }) }, [])

  return (
    <main className="loading-screen-page session-error-page" aria-labelledby="session-error-title">
      <div className="session-error-content astro-scale-90">
        <header className="session-error-brand"><AstroBrand /></header>
        <section className="session-error-card" aria-describedby="session-error-description" aria-busy={recovery.pending}>
          <span className="session-error-symbol" aria-hidden="true"><AstroIcon name="warning-circle" /></span>
          <h1 id="session-error-title" ref={headingRef} tabIndex={-1}>Não foi possível acessar sua conta</h1>
          <p className="session-error-description" id="session-error-description" role="alert">{error}</p>
          <div className="session-error-actions">
            <PurpleButton disabled={recovery.pending} onClick={recovery.retry}><AstroIcon name="reload" />Tentar novamente</PurpleButton>
            <PurpleButton className="session-error-login" disabled={recovery.pending} onClick={() => { void recovery.returnToLogin() }}>Voltar ao login</PurpleButton>
          </div>
          {recovery.pending && <p className="session-error-feedback" role="status">Voltando ao login…</p>}
          {recovery.error && <p className="session-error-feedback" role="alert">{recovery.error}</p>}
        </section>
      </div>
    </main>
  )
}

export default SessionErrorState
