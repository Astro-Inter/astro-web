import { useRef, type ReactNode } from 'react'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import AstroIcon from '../astroIcon'

interface AnalyticsFilterRowProps { children: ReactNode; number: number; onRemove: () => void }

export default function AnalyticsFilterRow({ children, number, onRemove }: AnalyticsFilterRowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { closing, requestClose } = useAnimatedClose(160)
  return <div className={`analytics-condition${closing ? ' analytics-condition--closing' : ''}`} ref={ref} inert={closing}>
    {children}
    <button type="button" className="analytics-filter-remove" disabled={closing} onClick={() => {
      const addButton = ref.current?.closest('form')?.querySelector<HTMLButtonElement>('.analytics-filter-add')
      const remove = () => { onRemove(); window.requestAnimationFrame?.(() => addButton?.focus()) }
      if (document.documentElement.dataset.astroReducedMotion === 'true') { remove(); return }
      ref.current?.style.setProperty('--analytics-filter-row-height', `${ref.current.offsetHeight}px`)
      requestClose(remove)
    }}><AstroIcon name="trash" /><span>Remover filtro {number}</span></button>
  </div>
}
