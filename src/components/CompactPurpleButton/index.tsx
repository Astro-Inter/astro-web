import type { ButtonHTMLAttributes } from 'react'
import PurpleButton from '../PurpleButton'

interface CompactPurpleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

function CompactPurpleButton({ className = '', ...props }: CompactPurpleButtonProps) {
  return <PurpleButton className={`astro-action--compact${className ? ` ${className}` : ''}`} {...props} />
}

export default CompactPurpleButton
