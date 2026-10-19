import { BUTTONS } from '../../gtm/buttons'
import { useNavigate } from 'react-router-dom'
import { useAuthentication } from '../../hooks/useAuthentication'

interface SettingsTabsProps {
  active: 'workspace' | 'account'
  from: string
}

function SettingsTabs({ active, from }: SettingsTabsProps) {
  const navigate = useNavigate()
  const { user } = useAuthentication()
  if (!user) return null
  return (
    <nav aria-label="Configurações" className="workspace-settings-tabs">
      <button data-track-action={BUTTONS.comuns.workspace} aria-current={active === 'workspace' ? 'page' : undefined} onClick={() => {
        if (active !== 'workspace') navigate('/mainWorkspaceSettingsScreen', { state: { from } })
      }} type="button">Workspace</button>
      <button data-track-action={BUTTONS.comuns.conta} aria-current={active === 'account' ? 'page' : undefined} onClick={() => {
        if (active !== 'account') navigate('/mainAccountScreen', { state: { from } })
      }} type="button">Conta</button>
    </nav>
  )
}

export default SettingsTabs
