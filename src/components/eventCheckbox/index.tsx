import { iconAsset } from '../../utils/iconAsset'
interface EventCheckboxProps {
  checked: boolean
  label: string
  onChange: () => void
  disabled?: boolean
}

function EventCheckbox({ checked, label, onChange, disabled = false }: EventCheckboxProps) {
  return <label className="event-create-checkbox">
    <input disabled={disabled} aria-label={label} checked={checked} onChange={onChange} type="checkbox" />
    <span aria-hidden="true" className="event-create-checkbox-box">
      <img alt="" draggable={false} src={iconAsset('check.svg')} />
    </span>
  </label>
}

export default EventCheckbox
