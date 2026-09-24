import type { ReactNode } from 'react'

interface AnimatedWelcomeProps {
  title: ReactNode
  description: ReactNode
}

function AnimatedWelcome({ title, description }: AnimatedWelcomeProps) {
  return (
    <section className="login-welcome" aria-label="Boas-vindas">
      <div className="welcome-orb" aria-hidden="true">
        <div className="welcome-orb-surface" />
      </div>

      <div className="welcome-content">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </section>
  )
}

export default AnimatedWelcome
