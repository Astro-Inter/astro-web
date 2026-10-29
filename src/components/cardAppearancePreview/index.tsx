import type { ReactNode } from 'react'

interface CardAppearancePreviewProps { name: string; children: ReactNode; className?: string }
export default function CardAppearancePreview({ name, children, className = '' }: CardAppearancePreviewProps) {
  return <div className={`card-appearance-preview ${className}`}>{children}<div><span>Prévia do card</span><p>{name}</p></div></div>
}
