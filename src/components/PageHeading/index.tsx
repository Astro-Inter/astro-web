import type { ReactNode } from 'react'

interface PageHeadingProps {
  title: ReactNode
  description: ReactNode
  titleId: string
  className?: string
}

function PageHeading({ title, description, titleId, className = '' }: PageHeadingProps) {
  return (
    <header className={`login-heading ${className}`.trim()}>
      <h1 id={titleId}>{title}</h1>
      <p>{description}</p>
    </header>
  )
}

export default PageHeading