import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AstroBrand, AstroIcon, CompactPurpleButton, HelpLink } from '../../components'
import WorkspaceSettingsPasswordModal from '../../components/workspaceSettingsPasswordModal'
import SettingsTabs from '../../components/settingsTabs'
import type { WorkspaceSettingsNavigationState, WorkspaceSettingsSection } from '../../types/workspaceSettings'

interface WorkspaceSettingsAction {
  id: WorkspaceSettingsSection
  title: string
  description: string
  action: string
  path: string
}

const sections: readonly WorkspaceSettingsAction[] = [
  { id: 'company', title: 'Informações da empresa', description: 'Alterar informações da empresa.', action: 'Alterar informações', path: '/includeCompanyInformation' },
  { id: 'spreadsheet', title: 'Planilha empresarial', description: 'Adicionar planilha atual.', action: 'Adicionar planilha', path: '/attachExcelFile' },
  { id: 'addresses', title: 'Endereço das unidades', description: 'Alterar informações de unidades.', action: 'Alterar unidades', path: '/setAddress' },
  { id: 'payments', title: 'Pagamentos', description: 'Alterar informações de pagamento.', action: 'Alterar pagamentos', path: '/paymentMethod' },
]

function MainWorkspaceSettingsScreenPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [section, setSection] = useState<WorkspaceSettingsSection | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const navigationState = location.state as WorkspaceSettingsNavigationState | null
  const from = navigationState?.from
  const returnPath = from && ['/mainHomeScreen', '/mainManagerScreen', '/mainPositionScreen', '/mainFormScreen', '/mainEventScreen'].includes(from) ? from : '/mainEventScreen'

  function closePassword() {
    setSection(null)
    triggerRef.current?.focus()
  }

  function continueToSection() {
    const target = sections.find(item => item.id === section)
    if (target) navigate(`${target.path}?context=settings`, { state: { from: returnPath } })
  }

  return (
    <div className="create-forms-page astro-scale-90 workspace-settings-page">
      <button aria-label="Voltar" className="payment-back-button workspace-settings-back" onClick={() => navigate(returnPath)} type="button">
        <AstroIcon name="back" />
      </button>
      <header className="create-password-header create-forms-header"><AstroBrand /></header>

      <main className="create-forms-main workspace-settings-content" aria-labelledby="workspace-settings-title">
        <SettingsTabs active="workspace" from={returnPath} />

        <div className="settings-tab-content">
        <h1 id="workspace-settings-title">Configurações de workspace</h1>
        <section className="create-forms-card workspace-settings-card" aria-labelledby="workspace-settings-edit-title">
          <h2 id="workspace-settings-edit-title">Editar informações</h2>
          <div className="workspace-settings-rows">
            {sections.map(item => (
              <div className={`workspace-settings-row${navigationState?.savedSection === item.id ? ' workspace-settings-row--saved' : ''}`} key={item.id}>
                <div><h3>{item.title}</h3><p>{item.description}</p></div>
                <CompactPurpleButton aria-haspopup="dialog" onClick={event => {
                  triggerRef.current = event.currentTarget
                  setSection(item.id)
                }} type="button">{item.action}</CompactPurpleButton>
              </div>
            ))}
          </div>
        </section>
        </div>
      </main>

      <HelpLink />
      {section && <WorkspaceSettingsPasswordModal onCancel={closePassword} onContinue={continueToSection} section={section} />}
    </div>
  )
}

export default MainWorkspaceSettingsScreenPage
