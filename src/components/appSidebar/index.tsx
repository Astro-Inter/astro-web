import { SHOWCASE_NAMES, SIDEBAR_ITEMS } from '../../gtm/showcases'
import { BUTTONS } from '../../gtm/buttons'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import AstroBrand from '../astroBrand'
import AstroIcon from '../astroIcon'
import { useAuthentication } from '../../hooks/useAuthentication'
import { getNavigationItems } from '../../utils/accessControl'
import type { NavigationItem } from '../../types/navigation'

interface AppSidebarProps {
  items?: readonly NavigationItem[]
}

function AppSidebar({ items }: AppSidebarProps) {
  const { user } = useAuthentication()
  const visibleItems = getNavigationItems(user?.accountType, items)
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
        <button data-track-action={open ? BUTTONS.comuns.fechar_menu : BUTTONS.comuns.abrir_menu}
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

      {open && <button data-track-action={BUTTONS.comuns.fechar_menu} aria-label="Fechar menu" className="app-sidebar-backdrop" onClick={closeMenu} tabIndex={-1} type="button" />}

      <aside ref={sidebarRef} className={`app-sidebar astro-scale-90${open ? ' app-sidebar--open' : ''}`} id="app-navigation">
        <AstroBrand />
        <nav data-track-showcase={SHOWCASE_NAMES.sidebar} aria-label="Menu principal" className="app-navigation">
          <ul>
            {visibleItems.map((item) => (
              <li className={item.alignBottom ? 'app-navigation-settings' : ''} key={item.label}>
                {item.path ? (
                  <NavLink data-track-item={SIDEBAR_ITEMS[item.path]}
                    className={({ isActive }) => `app-navigation-link${isActive ? ' app-navigation-link--active' : ''}`}
                    onClick={() => setOpen(false)}
                    to={item.path}
                    state={item.alignBottom ? { from: location.pathname } : undefined}
                  >
                    <span className="app-navigation-icon"><AstroIcon name={item.icon} strokeScale={item.strokeScale} variant="sidebar" /></span>
                    <span className="app-navigation-label">{item.label}</span>
                  </NavLink>
                ) : (
                  <span className="app-navigation-link app-navigation-link--unavailable" title="Em breve">
                    <span className="app-navigation-icon"><AstroIcon name={item.icon} strokeScale={item.strokeScale} variant="sidebar" /></span>
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
