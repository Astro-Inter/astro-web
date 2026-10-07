import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import AstroBrand from '../astroBrand'
import AstroIcon from '../astroIcon'

export interface NavigationItem {
  label: string
  icon: ComponentProps<typeof AstroIcon>['name']
  strokeScale?: ComponentProps<typeof AstroIcon>['strokeScale']
  path?: string
  alignBottom?: boolean
}

const navigationItems: NavigationItem[] = [
  { label: 'Home', icon: 'home' },
  { label: 'Gestores', icon: 'managers', path: '/mainManagerScreen' },
  { label: 'Colaboradores', icon: 'collaborators', path: '/mainEmployeerScreen' },
  { label: 'Conformidade', icon: 'compliance' },
  { label: 'Unidades', icon: 'building' },
  { label: 'Cargos', icon: 'position', path: '/mainPositionScreen' },
  { label: 'Formulários', icon: 'document', path: '/mainFormScreen' },
  { label: 'Eventos', icon: 'event-calendar', path: '/mainEventScreen' },
  { label: 'Configurações', icon: 'settings', path: '/mainWorkspaceSettingsScreen', alignBottom: true },
]

interface AppSidebarProps {
  items?: readonly NavigationItem[]
}

function AppSidebar({ items = navigationItems }: AppSidebarProps) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  function closeMenu() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return

    const responsiveMenu = window.matchMedia('(max-width: 1024px)')
    if (!responsiveMenu.matches) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function closeOnResize() {
      if (!responsiveMenu.matches) setOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
      if (event.key === 'Tab') {
        const links = Array.from(sidebarRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])
        const first = triggerRef.current
        const last = links.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    responsiveMenu.addEventListener('change', closeOnResize)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      responsiveMenu.removeEventListener('change', closeOnResize)
      document.body.style.overflow = previousOverflow
    }
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

      <aside ref={sidebarRef} className={`app-sidebar astro-scale-90${open ? ' app-sidebar--open' : ''}`} id="app-navigation">
        <AstroBrand />
        <nav aria-label="Menu principal" className="app-navigation">
          <ul>
            {items.map((item) => (
              <li className={item.alignBottom ? 'app-navigation-settings' : ''} key={item.label}>
                {item.path ? (
                  <NavLink
                    className={({ isActive }) => `app-navigation-link${isActive ? ' app-navigation-link--active' : ''}`}
                    onClick={() => setOpen(false)}
                    to={item.path}
                    state={item.path === '/mainWorkspaceSettingsScreen' ? { from: location.pathname } : undefined}
                  >
                    <span className="app-navigation-icon"><AstroIcon name={item.icon} strokeScale={item.strokeScale} /></span>
                    <span className="app-navigation-label">{item.label}</span>
                  </NavLink>
                ) : (
                  <span className="app-navigation-link app-navigation-link--unavailable" title="Em breve">
                    <span className="app-navigation-icon"><AstroIcon name={item.icon} strokeScale={item.strokeScale} /></span>
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
