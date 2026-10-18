import ActionLoading from '../actionLoading'
import { useEffect, useRef } from 'react'
import { useSessionRecovery } from '../../hooks/useSessionRecovery'
import PurpleButton from '../purpleButton'
import StatusScreenLayout from '../statusScreenLayout'

interface SessionErrorStateProps {
  error: string
}

function SessionErrorState({ error }: SessionErrorStateProps) {
  const recovery = useSessionRecovery()
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }) }, [])

  return <StatusScreenLayout className="session-error-page" titleId="session-error-title"
    title="Não foi possível acessar sua conta" description={error} descriptionRole="alert"
    headingRef={headingRef} busy={recovery.pending}
    illustration="sessionUnavailable.png" illustrationWidth={1667} illustrationHeight={944} illustrationCenterX={812}
    illustrationBounds={{ left: 185, top: 24, right: 1483, bottom: 905 }}
    actions={<>
      <PurpleButton disabled={recovery.pending} onClick={recovery.retry}>Tentar novamente</PurpleButton>
      <PurpleButton variant="outline" disabled={recovery.pending} onClick={() => { void recovery.returnToLogin() }}>Voltar ao login</PurpleButton>
    </>}
    feedback={<ActionLoading active={recovery.pending} />}
  />
}

export default SessionErrorState
