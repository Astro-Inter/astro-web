import { useRef, useState } from 'react'
import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const CODE_LENGTH = 6

function WorkspaceCodeForm() {
  const navigate = useNavigate()
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits((current) => current.map((item, position) => position === index ? digit : item))

    if (digit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
      updateDigit(index - 1, '')
    }

    if (event.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH - index)
    if (!pastedDigits) return

    event.preventDefault()
    setDigits((current) => {
      const next = [...current]
      for (const [offset, digit] of [...pastedDigits].entries()) next[index + offset] = digit
      return next
    })
    inputRefs.current[Math.min(index + pastedDigits.length, CODE_LENGTH - 1)]?.focus()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    navigate('/accessKeyVerified')
  }

  return (
    <>
      <header className="login-heading">
        <h1 id="create-workspace-title">Criar workspace</h1>
        <p>Insira o código para iniciar.</p>
      </header>

      <form className="workspace-code-form" onSubmit={handleSubmit}>
        <fieldset className="workspace-code-fields">
          <legend className="sr-only">Código de verificação enviado por e-mail</legend>
          {digits.map((digit, index) => (
            <div className="workspace-code-cell" key={index}>
              <label className="sr-only" htmlFor={`workspace-code-${index}`}>
                Dígito {index + 1} de {CODE_LENGTH} do código
              </label>
              <input
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                id={`workspace-code-${index}`}
                inputMode="numeric"
                maxLength={1}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onPaste={(event) => handlePaste(event, index)}
                pattern="[0-9]*"
                ref={(element) => { inputRefs.current[index] = element }}
                type="text"
                value={digit}
              />
            </div>
          ))}
        </fieldset>

        <button type="submit">Verificar código</button>
      </form>

      <p className="workspace-link">
        Já tem uma conta? <Link to="/">Fazer login</Link>
      </p>
    </>
  )
}

export default WorkspaceCodeForm
