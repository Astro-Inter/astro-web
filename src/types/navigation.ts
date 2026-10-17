import type { ComponentProps } from 'react'
import type AstroIcon from '../components/astroIcon'

export interface NavigationItem {
  label: string
  icon: ComponentProps<typeof AstroIcon>['name']
  strokeScale?: ComponentProps<typeof AstroIcon>['strokeScale']
  path?: string
  alignBottom?: boolean
}
