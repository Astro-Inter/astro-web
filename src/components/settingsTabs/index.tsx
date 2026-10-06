import { useNavigate } from 'react-router-dom'

interface SettingsTabsProps {
  active: 'workspace' | 'account'
  from: string
}

function SettingsTabs({ active, from }: SettingsTabsProps) {
  const navigate = useNavigate()
  return (
    <nav aria-label="Configurações" className="workspace-settings-tabs">
      <button aria-current={active === 'workspace' ? 'page' : undefined} onClick={() => {
        if (active !== 'workspace') navigate('/mainWorkspaceSettingsScreen', { state: { from } })
      }} type="button">Workspace</button>
      <button aria-current={active === 'account' ? 'page' : undefined} onClick={() => {
        if (active !== 'account') navigate('/mainAccountScreen', { state: { from } })
      }} type="button">Conta</button>
    </nav>
  )
}

export default SettingsTabs
