import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { NavLink } from 'react-router-dom'
import AstroBrand from '../AstroBrand'
import AstroIcon from '../AstroIcon'

export interface NavigationItem {
  label: string
  icon: ComponentProps<typeof AstroIcon>['name']
  path?: string
  alignBottom?: boolean
}

const navigationItems: NavigationItem[] = [
  { label: 'Home', icon: 'home' },
  { label: 'Gestores', icon: 'managers' },
  { label: 'Colaboradores', icon: 'collaborators' },
  { label: 'Conformidade', icon: 'compliance' },
  { label: 'Unidades', icon: 'building' },
  { label: 'Cargos', icon: 'position', path: '/mainPositionScreen' },
  { label: 'Formulários', icon: 'document' },
  { label: 'Eventos', icon: 'event-calendar' },
  { label: 'Configurações', icon: 'settings', alignBottom: true },
]

interface AppSidebarProps {
  items?: readonly NavigationItem[]
}

function AppSidebar({ items = navigationItems }: AppSidebarProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  function closeMenu() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <>
      <header className="app-mobile-header">
        <button
          aria-controls="app-navigation"
          aria-expanded={open}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          className="app-menu-toggle"
          onClick={() => setOpen((current) => !current)}
          ref={triggerRef}
          type="button"
        >
          <span /><span /><span />
        </button>
        <AstroBrand />
      </header>

      {open && <button aria-label="Fechar menu" className="app-sidebar-backdrop" onClick={closeMenu} tabIndex={-1} type="button" />}

      <aside className={`app-sidebar astro-scale-90${open ? ' app-sidebar--open' : ''}`} id="app-navigation">
        <AstroBrand />
        <nav aria-label="Menu principal" className="app-navigation">
          <ul>
            {items.map((item) => (
              <li className={item.alignBottom ? 'app-navigation-settings' : ''} key={item.label}>
                {item.path ? (
                  <NavLink
                    className={({ isActive }) => `app-navigation-link${isActive ? ' app-navigation-link--active' : ''}`}
                    onClick={closeMenu}
                    to={item.path}
                  >
                    <span className="app-navigation-icon"><AstroIcon name={item.icon} /></span>
                    <span className="app-navigation-label">{item.label}</span>
                  </NavLink>
                ) : (
                  <span className="app-navigation-link app-navigation-link--unavailable" title="Em breve">
                    <span className="app-navigation-icon"><AstroIcon name={item.icon} /></span>
                    <span className="app-navigation-label">{item.label}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}

export default AppSidebar
