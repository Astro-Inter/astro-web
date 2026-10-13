import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LoadingPlanet, PurpleButton } from '../../components'
import { useWorkspaceRegistration } from '../../hooks/useWorkspaceRegistration'

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

  return <main className="loading-screen-page" aria-busy={status === 'loading'}>
    <section className="registration-loading-content astro-scale-90" aria-label="Cadastro do workspace">
      {status !== 'error' ? <LoadingPlanet label="Criando seu workspace" /> : <>
        <h1>Não foi possível concluir o cadastro</h1>
        <p role="alert">{error}</p>
        {importErrors.length > 0 && <ul aria-label="Problemas na planilha">
          {importErrors.map(item => <li key={`${item.row}-${item.field}-${item.message}`}>Linha {item.row}, {item.field}: {item.message}</li>)}
        </ul>}
        {failureStatus === 201 ? <PurpleButton onClick={() => navigate('/', { replace: true })}>Ir para o login</PurpleButton> : <>
          <PurpleButton onClick={() => { void submit() }}>Tentar novamente</PurpleButton>
          <nav className="registration-correction-actions" aria-label="Corrigir cadastro">
            <PurpleButton variant="outline" onClick={() => navigate('/paymentMethod')}>E-mail do gestor</PurpleButton>
            <PurpleButton variant="outline" onClick={() => navigate('/createPassword')}>Senha</PurpleButton>
            <PurpleButton variant="outline" onClick={() => navigate('/includeCompanyInformation')}>Dados da empresa</PurpleButton>
            <PurpleButton variant="outline" onClick={() => navigate('/attachExcelFile')}>Planilha</PurpleButton>
            <PurpleButton variant="outline" onClick={() => navigate('/setAddress')}>Unidades e endereços</PurpleButton>
          </nav>
        </>}
      </>}
    </section>
  </main>
}

export default RegisterWorkspaceLoadingPage
