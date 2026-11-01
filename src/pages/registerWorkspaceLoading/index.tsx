import { BUTTONS } from '../../gtm/buttons'
import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PurpleButton } from '../../components'
import LoadingIndicator from '../../components/loadingIndicator'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'
import { spreadsheetErrorFieldLabel } from '../../utils/registrationErrorFeedback'

function RegisterWorkspaceLoadingPage() {
  const navigate = useNavigate()
  const { draft, verifiedEmail, status, error, importErrors, submit, result, failureStatus } = useWorkspaceRegistration()
  const ready = Boolean(draft.email && verifiedEmail === draft.email.trim() && draft.password && draft.company.name && draft.file && draft.units.length)

  useEffect(() => {
    if (!ready || result || status !== 'idle') return
    void submit()
  }, [ready, result, status, submit])

  if (result) return <Navigate to="/workspaceCreated" replace />
  if (!ready) return <Navigate to="/createWorkspace" replace />

  return <main data-track-page={status === 'error' ? true : undefined} className="loading-screen-page" aria-busy={status === 'loading'}>
    <section className="registration-loading-content astro-scale-90" aria-label="Cadastro do workspace">
      {status !== 'error' ? <LoadingIndicator /> : <>
        <h1>Não foi possível concluir o cadastro</h1>
        <p role="alert">{error}</p>
        {importErrors.length > 0 && <>
          <ul aria-label="Problemas na planilha" role="alert">
            {importErrors.map(item => <li key={`${item.row}-${item.field}-${item.message}`}>
              <strong>Linha {item.row} · {spreadsheetErrorFieldLabel(item.field)}:</strong> {item.message}
            </li>)}
          </ul>
          <p>Corrija esses campos no Excel e use a opção Planilha abaixo para anexar o arquivo corrigido.</p>
        </>}
        {failureStatus === 201 ? <PurpleButton data-track-action={BUTTONS.comuns.login} onClick={() => navigate('/', { replace: true })}>Ir para o login</PurpleButton> : <>
          <PurpleButton data-track-action={BUTTONS.comuns.tentar_novamente} onClick={() => { void submit() }}>Tentar novamente</PurpleButton>
          <nav className="registration-correction-actions" aria-label="Corrigir cadastro">
            <PurpleButton data-track-action={BUTTONS.comuns.e_mail_do_gestor} variant="outline" onClick={() => navigate('/paymentMethod')}>E-mail do gestor</PurpleButton>
            <PurpleButton data-track-action={BUTTONS.comuns.senha} variant="outline" onClick={() => navigate('/createPassword')}>Senha</PurpleButton>
            <PurpleButton data-track-action={BUTTONS.comuns.dados_da_empresa} variant="outline" onClick={() => navigate('/includeCompanyInformation')}>Dados da empresa</PurpleButton>
            <PurpleButton data-track-action={BUTTONS.comuns.planilha} variant="outline" onClick={() => navigate('/attachExcelFile')}>Planilha</PurpleButton>
            <PurpleButton data-track-action={BUTTONS.comuns.unidades_e_enderecos} variant="outline" onClick={() => navigate('/setAddress')}>Unidades e endereços</PurpleButton>
          </nav>
        </>}
      </>}
    </section>
  </main>
}

export default RegisterWorkspaceLoadingPage
