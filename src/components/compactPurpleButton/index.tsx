import type { ComponentProps } from 'react'
import PurpleButton from '../purpleButton'

interface CompactPurpleButtonProps extends ComponentProps<typeof PurpleButton> {}

function CompactPurpleButton({ className = '', ...props }: CompactPurpleButtonProps) {
  return <PurpleButton className={`astro-action--compact${className ? ` ${className}` : ''}`} {...props} />
}

export default CompactPurpleButton
