import { useRef, useState } from 'react'
import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import PageHeading from '../PageHeading'
import PurpleButton from '../PurpleButton'

const CODE_LENGTH = 6
const CODE_POSITIONS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'] as const

interface WorkspaceCodeFormProps {
  onVerified: () => void
}

function WorkspaceCodeForm({ onVerified }: WorkspaceCodeFormProps) {
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

    onVerified()
  }

  return (
    <>
      <PageHeading description="Insira o código para iniciar." title="Criar workspace" titleId="create-workspace-title" />

      <form className="workspace-code-form" onSubmit={handleSubmit}>
        <fieldset className="workspace-code-fields">
          <legend className="sr-only">Código de verificação enviado por e-mail</legend>
          {CODE_POSITIONS.map((position, index) => (
            <div className="workspace-code-cell" key={position}>
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
                value={digits[index]}
              />
            </div>
          ))}
        </fieldset>

        <PurpleButton className="astro-form-action" type="submit">Verificar código</PurpleButton>
      </form>

      <p className="workspace-link">
        Já tem uma conta? <Link to="/">Fazer login</Link>
      </p>
    </>
  )
}

export default WorkspaceCodeForm
