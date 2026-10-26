import { AstroBrand, HelpLink } from '../../components'
import WorkspaceSettingsBackButton from '../../components/workspaceSettingsBackButton'

function WorkspacePaymentSettingsPage() {
  return <main className="create-password-page workspace-payment-settings" data-track-page={true}>
    <WorkspaceSettingsBackButton screen="backPaymentsModalWeb" />
    <header className="create-password-header"><AstroBrand /></header>
    <section className="workspace-payment-notice" aria-labelledby="payment-settings-title">
      <h1 id="payment-settings-title">Pagamentos do workspace</h1>
      <p role="status">A consulta e a alteração do método de pagamento ainda não estão disponíveis no painel.</p>
      <p>Nenhum dado de cartão ou Pix é exibido ou salvo nesta tela. Para consultar sua assinatura ou solicitar uma alteração, entre em contato com a equipe Astro.</p>
      <a className="astro-action" href="mailto:app.4str0@gmail.com">Falar com a equipe Astro</a>
    </section>
    <HelpLink />
  </main>
}

export default WorkspacePaymentSettingsPage
