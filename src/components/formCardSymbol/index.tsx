import type { FormCardAppearance } from '../../types/forms'
import { formCardColors } from '../../data/formCardAppearance'
import AstroIcon from '../astroIcon'

interface FormCardSymbolProps { appearance: FormCardAppearance; neutral?: boolean }
export default function FormCardSymbol({ appearance, neutral = false }: FormCardSymbolProps) {
  return <span aria-hidden="true" className={`form-card-icon form-card-icon--${appearance.color}`} style={{ backgroundColor: neutral ? 'transparent' : formCardColors.find(color => color.value === appearance.color)?.background }}><AstroIcon name={appearance.icon} /></span>
}
