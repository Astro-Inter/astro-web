import { Link } from 'react-router-dom'

function LoginForm() {
  return (
    <>
      <header className="login-heading">
        <h1 id="login-title">Acesse sua conta</h1>
        <p>Acesse sua conta para continuar.</p>
      </header>

      <form className="login-form" onSubmit={(event) => event.preventDefault()}>
        <div className="field-group">
          <label htmlFor="email">Email</label>
          <input
            autoComplete="email"
            id="email"
            name="email"
            placeholder="example@email.com"
            type="email"
          />
        </div>

        <div className="field-group">
          <label htmlFor="password">Senha</label>
          <input
            autoComplete="current-password"
            id="password"
            name="password"
            placeholder="Inserir Senha"
            type="password"
          />
        </div>

        <a className="forgot-link" href="#forgot-password">
          Esqueceu a senha?
        </a>

        <button type="submit">Entrar</button>
      </form>

      <p className="workspace-link">
        Não tem uma conta?{' '}
        <Link to="/paymentMethod">Criar workspace</Link>
      </p>
    </>
  )
}

export default LoginForm
