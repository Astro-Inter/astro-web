import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AstroBrand, AstroIcon, CompactPurpleButton, ConfirmationModal, FormField, HelpLink } from '../../components'
import AccountDetailsModal from '../../components/AccountDetailsModal'
import AccountProfileHeader from '../../components/AccountProfileHeader'
import PasswordConfirmationModal from '../../components/PasswordConfirmationModal'
import SettingsTabs from '../../components/SettingsTabs'
import ReplaceAccountFlowModal from '../../components/ReplaceAccountFlowModal'
import { mockEventCollaborators } from '../../data/eventCreation'
import { mockAccount } from '../../types/account'
import type { WorkspaceSettingsNavigationState } from '../../types/workspaceSettings'

type AccountPopup = 'view-password' | 'view' | 'edit-password' | 'edit' | 'replace' | 'logout' | null

const replacementCandidates = mockEventCollaborators.filter(person => person.id !== 'kirk')

function MainAccountScreenPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(mockAccount)
  const [popup, setPopup] = useState<AccountPopup>(null)
  const [isWorkspaceManager, setIsWorkspaceManager] = useState(searchParams.get('role') !== 'manager')
  const [savedVersion, setSavedVersion] = useState(0)
  const [emailPreview, setEmailPreview] = useState(false)
  const triggerIdRef = useRef('')
  const from = (location.state as WorkspaceSettingsNavigationState | null)?.from
  const returnPath = from && ['/mainPositionScreen', '/mainFormScreen', '/mainEventScreen'].includes(from) ? from : '/mainEventScreen'

  useEffect(() => () => {
    if (profile.photoUrl?.startsWith('blob:')) URL.revokeObjectURL(profile.photoUrl)
  }, [profile.photoUrl])

  useLayoutEffect(() => {
    if (!popup && triggerIdRef.current) document.getElementById(triggerIdRef.current)?.focus({ preventScroll: true })
  }, [popup, savedVersion])

  function openPopup(next: AccountPopup, trigger: HTMLButtonElement) {
    triggerIdRef.current = trigger.id
    setPopup(next)
  }

  function closePopup() {
    setPopup(null)
  }

  const warningIcon = <span className="position-deactivation-icon"><AstroIcon name="warning" /></span>

  return (
    <div className="create-forms-page astro-scale-90 workspace-settings-page account-settings-page">
      <button aria-label="Voltar" className="payment-back-button workspace-settings-back" onClick={() => navigate(returnPath)} type="button"><AstroIcon name="back" /></button>
      <header className="create-password-header create-forms-header"><AstroBrand /></header>
      <main aria-labelledby="account-settings-title" className="create-forms-main workspace-settings-content">
        <SettingsTabs active="account" from={returnPath} />
        <div className="settings-tab-content">
        <h1 id="account-settings-title">Configurações de conta</h1>
        <section aria-labelledby="account-information-title" className={`create-forms-card account-information-card${savedVersion ? ' account-information-card--saved' : ''}`} key={savedVersion}>
          <h2 id="account-information-title">Informações da conta</h2>
          <AccountProfileHeader profile={profile} />
          <div className="account-main-fields">
            <FormField id="account-name" label="Nome" readOnly value={profile.name} />
            <FormField id="account-email" label="Email" readOnly value={profile.email} />
          </div>
          <div className="account-main-actions">
            <CompactPurpleButton aria-haspopup="dialog" id="account-view-action" onClick={event => openPopup('view-password', event.currentTarget)}>Ver tudo</CompactPurpleButton>
            <CompactPurpleButton aria-haspopup="dialog" id="account-edit-action" onClick={event => openPopup('edit-password', event.currentTarget)}>Editar</CompactPurpleButton>
          </div>
        </section>
        <section aria-labelledby="account-transfer-title" className="create-forms-card account-transfer-card">
          <h2 id="account-transfer-title">Transferência de cargo do gestor do workspace.</h2>
          <p>{isWorkspaceManager
            ? 'Ao substituir o gestor, você deixará de ser responsável pela gestão deste workspace e perderá as permissões e funcionalidades exclusivas de gestor. O novo gestor assumirá a responsabilidade pelo workspace, incluindo gerenciamento de acessos, configurações e demais recursos administrativos. Após a confirmação, essa alteração não poderá ser desfeita.'
            : 'Caso o gestor do workspace precise ser substituído ou esteja inacessível, clique no botão abaixo para nos enviar um e-mail. Para que a equipe Astro possa analisar o caso, certifique-se de informar o CPF ou o e-mail do novo gestor e anexar as evidências que justificam a solicitação.'}</p>
          <div className="account-transfer-actions">
            {isWorkspaceManager ? <CompactPurpleButton aria-haspopup="dialog" id="account-transfer-action" onClick={event => openPopup('replace', event.currentTarget)} variant="danger">Substituir</CompactPurpleButton> : <CompactPurpleButton id="account-transfer-action" onClick={() => setEmailPreview(true)}>Enviar email</CompactPurpleButton>}
          </div>
          {emailPreview && <p className="account-email-preview" role="status">Informe o CPF ou o e-mail do novo gestor e as evidências da solicitação.</p>}
        </section>
        <div className="account-logout-action"><CompactPurpleButton aria-haspopup="dialog" id="account-logout-action" onClick={event => openPopup('logout', event.currentTarget)} variant="danger">Sair da conta</CompactPurpleButton></div>
        </div>
      </main>
      <HelpLink />
      {popup === 'view-password' && <PasswordConfirmationModal className="account-view-password-modal" onCancel={closePopup} onContinue={() => setPopup('view')} />}
      {popup === 'view' && <AccountDetailsModal mode="view" onCancel={closePopup} onSave={() => closePopup()} profile={profile} />}
      {popup === 'edit-password' && <PasswordConfirmationModal className="textPasswotdAccount1ModalWeb" onCancel={closePopup} onContinue={() => setPopup('edit')} />}
      {popup === 'edit' && <AccountDetailsModal mode="edit" onCancel={closePopup} onSave={nextProfile => { setProfile(nextProfile); setSavedVersion(current => current + 1); closePopup() }} profile={profile} />}
      {popup === 'replace' && <ReplaceAccountFlowModal collaborators={replacementCandidates} onCancel={closePopup} onReplaced={() => { setIsWorkspaceManager(false); closePopup() }} />}
      {popup === 'logout' && <ConfirmationModal backdrop="dimmed" className="position-deactivation-modal logoutManagerAccountModalWeb" confirmLabel="Sair" icon={warningIcon} onCancel={closePopup} onConfirm={() => { navigate('/'); return null }} onConfirmed={() => {}} preservePageScroll title="Tem certeza que deseja sair da conta?" tone="danger" />}
    </div>
  )
}

export default MainAccountScreenPage
