import { useId } from 'react'
import { BUTTONS } from '../../gtm/buttons'
import { iconAsset } from '../../utils/iconAsset'
interface EventCheckboxProps {
  checked: boolean
  label: string
  onChange: () => void
  disabled?: boolean
}

function EventCheckbox({ checked, label, onChange, disabled = false }: EventCheckboxProps) {
  const id = useId()
  return <label htmlFor={id} className="event-create-checkbox">
    <input id={id} data-track-action={BUTTONS.comuns.selecionar_colaborador} disabled={disabled} aria-label={label} checked={checked} onChange={onChange} type="checkbox" />
    <span aria-hidden="true" className="event-create-checkbox-box">
      <img alt="" draggable={false} src={iconAsset('check.svg')} />
    </span>
  </label>
}

export default EventCheckbox
