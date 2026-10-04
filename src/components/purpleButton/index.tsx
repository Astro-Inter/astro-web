import type { ButtonHTMLAttributes } from 'react'

/**
 * Botão de ação do produto. Toda a geometria (altura, largura máxima, raio,
 * fonte, peso) vem da classe .astro-action em global.css, então o tamanho
 * acompanha automaticamente a escala do contexto (.astro-scale-90 e afins).
 */
type PurpleButtonVariant = 'solid' | 'outline' | 'danger'

interface PurpleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** solid: ação primária. outline: secundária tracejada. danger: destrutiva. */
  variant?: PurpleButtonVariant
  /**
   * Largura definida pelo conteúdo, para ações inline. Só use em ação
   * secundária: a ação primária tem largura padronizada em todo o produto.
   */
  auto?: boolean
}

function PurpleButton({
  variant = 'solid',
  auto = false,
  className = '',
  type = 'button',
  ...props
}: PurpleButtonProps) {
  const classNames = ['astro-action']

  if (variant !== 'solid') classNames.push(`astro-action--${variant}`)
  if (auto) classNames.push('astro-action--auto')
  if (className) classNames.push(className)

  return <button className={classNames.join(' ')} type={type} {...props} />
}

export default PurpleButton
