import { AnimatedWelcome, AstroBrand, HelpLink, WorkspaceCodeForm } from '../../components'

function CreateWorkspacePage() {
  return (
    <main className="login-page create-workspace-page">
      <AnimatedWelcome
        title={<>Crie seu workspace<br />no Astro!</>}
        description={<>Insira o código enviado por e-mail<br />para criar seu workspace.</>}
      />

      <section className="login-panel" aria-labelledby="create-workspace-title">
        <div className="login-card">
          <AstroBrand />
          <WorkspaceCodeForm />
        </div>

        <HelpLink />
      </section>
    </main>
  )
}

export default CreateWorkspacePage
