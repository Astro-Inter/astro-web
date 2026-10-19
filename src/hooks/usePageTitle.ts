import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPageTitle } from '../utils/pageTitle'

export function usePageTitle(): void {
  const { pathname, search } = useLocation()
  useEffect(() => {
    document.title = getPageTitle(pathname, search)
  }, [pathname, search])
}
