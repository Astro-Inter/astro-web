import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AstroBrand, AstroIcon, CompactPurpleButton, ConfirmationModal, FormField, HelpLink } from '../../components'
import AccountDetailsModal from '../../components/accountDetailsModal'
import AccountProfileHeader from '../../components/accountProfileHeader'
import AccountProfileSkeleton from '../../components/accountProfileSkeleton'
import PasswordConfirmationModal from '../../components/passwordConfirmationModal'
import SettingsTabs from '../../components/settingsTabs'
import WorkspaceManagerTransferModal from '../../components/workspaceManagerTransferModal'
import { BUTTONS } from '../../gtm/buttons'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { useAccountProfile } from '../../hooks/useAccountProfile'
import { useAuthentication } from '../../hooks/useAuthentication'
import { useLogout } from '../../hooks/useLogout'
import type { WorkspaceSettingsNavigationState } from '../../types/workspaceSettings'
import { canAccessPage, hasWorkspaceAccess } from '../../utils/accessControl'

type AccountPopup = 'view-password' | 'view' | 'edit-password' | 'edit' | 'replace' | 'logout' | null
const managerSupportEmail = `mailto:app.4str0@gmail.com?subject=${encodeURIComponent('Gestor do workspace inativo ou inacessível')}&body=${encodeURIComponent('Olá, equipe Astro.\n\nO gestor do workspace não está mais ativo ou está inacessível. Solicito a análise da situação e da substituição do responsável.\n\nNome do workspace:\nNome ou e-mail do gestor atual:\nCPF ou e-mail do novo gestor:\nMotivo da solicitação:\n\nAnexarei as evidências que justificam esta solicitação.')}`

function AccountScreen() {
  const { pending: logoutPending, submit: submitLogout } = useLogout()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthentication()
  const { data: profile, loading, error: profileError, retry, photoUpdate, uploadPhoto, refreshPhoto, applyProfile } = useAccountProfile()
  const [popup, setPopup] = useState<AccountPopup>(null)
  const isWorkspaceManager = hasWorkspaceAccess(user?.accountType)
  const triggerIdRef = useRef('')
  const from = (location.state as WorkspaceSettingsNavigationState | null)?.from
  const returnPath = from && !['/mainAccountScreen', '/mainWorkspaceSettingsScreen'].includes(from)
    && canAccessPage(user?.accountType, from) ? from : '/mainHomeScreen'

  useLayoutEffect(() => {
    if (!popup && triggerIdRef.current) document.getElementById(triggerIdRef.current)?.focus({ preventScroll: true })
  }, [popup])

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
      <button data-track-action={BUTTONS.comuns.voltar} aria-label="Voltar" className="payment-back-button workspace-settings-back" onClick={() => navigate(returnPath)} type="button"><AstroIcon name="back" /></button>
      <header className="create-password-header create-forms-header"><AstroBrand /></header>
      <main data-track-page={true} aria-labelledby="account-settings-title" className="create-forms-main workspace-settings-content">
        <SettingsTabs active="account" from={returnPath} />
        <div className="settings-tab-content">
        <h1 id="account-settings-title">Configurações de conta</h1>
        <section aria-busy={loading} aria-labelledby="account-information-title" className="create-forms-card account-information-card">
          <h2 id="account-information-title">Informações da conta</h2>
          {loading && !profile && <AccountProfileSkeleton />}
          {profileError && <div className="account-profile-error"><p role="alert">{profileError}</p><CompactPurpleButton onClick={retry}>Tentar novamente</CompactPurpleButton></div>}
          {profile && <div className="api-content-ready">
            <AccountProfileHeader onPhotoSelected={file => { void uploadPhoto(file) }} onRefreshPhoto={() => { void refreshPhoto() }} photoUpdate={photoUpdate} profile={profile} />
            <div className="account-main-fields">
              <FormField id="account-name" label="Nome" readOnly value={profile.name} />
              <FormField id="account-email" label="Email" readOnly value={profile.email} />
            </div>
            <div className="account-main-actions">
              <CompactPurpleButton data-track-action={BUTTONS.comuns.ver_tudo} aria-haspopup="dialog" id="account-view-action" onClick={event => openPopup('view-password', event.currentTarget)}>Ver tudo</CompactPurpleButton>
              <CompactPurpleButton aria-haspopup="dialog" data-track-action={BUTTONS.comuns.editar} disabled={photoUpdate?.pending} id="account-edit-action" onClick={event => openPopup('edit-password', event.currentTarget)}>Editar</CompactPurpleButton>
            </div>
          </div>}
        </section>
        <section aria-labelledby="account-transfer-title" className="create-forms-card account-transfer-card">
          <h2 id="account-transfer-title">Transferência de cargo do gestor do workspace.</h2>
          <p>{isWorkspaceManager
            ? 'Ao transferir a responsabilidade, você continuará como gestor e perderá apenas as permissões exclusivas de responsável pelo workspace. O novo responsável assumirá o gerenciamento de acessos e das configurações do workspace. Para transferir novamente, será necessária uma nova ação do responsável atual.'
            : 'Caso o gestor do workspace precise ser substituído ou esteja inacessível, clique no botão abaixo para nos enviar um e-mail. Para que a equipe Astro possa analisar o caso, certifique-se de informar o CPF ou o e-mail do novo gestor e anexar as evidências que justificam a solicitação.'}</p>
          <div className="account-transfer-actions">
            {isWorkspaceManager ? <CompactPurpleButton data-track-action={BUTTONS.comuns.substituir} aria-haspopup="dialog" id="account-transfer-action" onClick={event => openPopup('replace', event.currentTarget)} variant="danger">Substituir</CompactPurpleButton> : <a className="astro-action astro-action--compact" data-track-action={BUTTONS.comuns.enviar_email} href={managerSupportEmail} id="account-transfer-action">Enviar email</a>}
          </div>
        </section>
        <div className="account-logout-action"><CompactPurpleButton data-track-action={BUTTONS.comuns.sair} aria-haspopup="dialog" aria-busy={logoutPending} disabled={logoutPending} id="account-logout-action" onClick={event => openPopup('logout', event.currentTarget)} variant="danger">Sair da conta</CompactPurpleButton></div>
        </div>
      </main>
      <HelpLink />
      {popup === 'view-password' && <PasswordConfirmationModal className="account-view-password-modal" onCancel={closePopup} onContinue={() => setPopup('view')} />}
      {popup === 'edit-password' && <PasswordConfirmationModal className="textPasswotdAccount1ModalWeb" onCancel={closePopup} onContinue={() => setPopup('edit')} />}
      {(popup === 'view' || popup === 'edit') && profile && <AccountDetailsModal canChangeLinks={isWorkspaceManager} editable={popup === 'edit'} onCancel={closePopup} onPhotoSelected={file => { void uploadPhoto(file) }} onRefreshPhoto={() => { void refreshPhoto() }} onSaved={applyProfile} photoUpdate={photoUpdate} profile={profile} />}
      {popup === 'replace' && isWorkspaceManager && <WorkspaceManagerTransferModal onClose={closePopup} />}
      {popup === 'logout' && <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_logout} backdrop="dimmed" className="position-deactivation-modal logoutManagerAccountModalWeb" confirmLabel="Sair" progressLabel="" icon={warningIcon} onCancel={closePopup} onConfirm={() => null} onConfirmed={() => { closePopup(); void submitLogout() }} preservePageScroll title="Tem certeza que deseja sair da conta?" tone="danger" />}
    </div>
  )
}
export default AccountScreen
