import { BUTTONS } from '../../gtm/buttons'
import { useRef, useState } from 'react'
import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import PageHeading from '../pageHeading'
import PurpleButton from '../purpleButton'
import { validateWorkspaceAccessKey } from '../../utils/workspaceRegistration'
import type { WorkspaceRegistrationStatus } from '../../types/workspaceRegistration'

const CODE_LENGTH = 6
const CODE_POSITIONS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'] as const

interface WorkspaceCodeFormProps {
  onVerify: (accessKey: string) => Promise<void>
  status: WorkspaceRegistrationStatus
  message: string
}

function WorkspaceCodeForm({ onVerify, status, message }: WorkspaceCodeFormProps) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const [submittedCode, setSubmittedCode] = useState('')
  const [error, setError] = useState('')
  const pending = status === 'loading' || status === 'success'

  function updateDigit(index: number, value: string) {
    setError('')
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
    setError('')
    setDigits((current) => {
      const next = [...current]
      for (const [offset, digit] of [...pastedDigits].entries()) next[index + offset] = digit
      return next
    })
    inputRefs.current[Math.min(index + pastedDigits.length, CODE_LENGTH - 1)]?.focus()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const code = digits.join('')
    const validationError = validateWorkspaceAccessKey(code)
    setError(validationError)
    if (!validationError) { setSubmittedCode(code); void onVerify(code) }
  }

  const apiError = status === 'error' && submittedCode === digits.join('') ? message : ''

  return (
    <>
      <PageHeading description="Insira o código enviado por e-mail." title="Criar workspace" titleId="create-workspace-title" />

      <form data-track-submit={BUTTONS.comuns.validar_codigo} className="workspace-code-form" aria-busy={pending} noValidate onSubmit={handleSubmit}>
        <div className="workspace-code-control">
        <fieldset className="workspace-code-fields">
          <legend className="sr-only">Código de verificação enviado por e-mail</legend>
          {CODE_POSITIONS.map((position, index) => (
            <div className="workspace-code-cell" key={position}>
              <label className="sr-only" htmlFor={`workspace-code-${index}`}>
                Dígito {index + 1} de {CODE_LENGTH} do código
              </label>
              <input
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                disabled={pending}
                aria-invalid={Boolean(error || apiError)}
                aria-describedby={error || apiError ? 'workspace-code-error' : undefined}
                id={`workspace-code-${index}`}
                inputMode="numeric"
                maxLength={1}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onPaste={(event) => handlePaste(event, index)}
                pattern="[0-9]*"
                ref={(element) => { inputRefs.current[index] = element }}
                type="text"
                value={digits[index]}
              />
            </div>
          ))}
        </fieldset>

        {(error || apiError) && <p className="login-field-error" id="workspace-code-error" role="alert">{error || apiError}</p>}
        </div>
        <PurpleButton data-track-action={BUTTONS.comuns.validar_codigo} className="astro-form-action" disabled={pending} type="submit">Verificar código</PurpleButton>
      </form>

      <p className="workspace-link">
        Já tem uma conta? <Link data-track-action={BUTTONS.comuns.login} to="/">Fazer login</Link>
      </p>
    </>
  )
}

export default WorkspaceCodeForm
