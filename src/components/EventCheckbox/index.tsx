interface EventCheckboxProps {
  checked: boolean
  label: string
  onChange: () => void
}

function EventCheckbox({ checked, label, onChange }: EventCheckboxProps) {
  return <label className="event-create-checkbox">
    <input aria-label={label} checked={checked} onChange={onChange} type="checkbox" />
    <span aria-hidden="true" className="event-create-checkbox-box">
      <img alt="" draggable={false} src={`${import.meta.env.BASE_URL}icon/check.svg`} />
    </span>
  </label>
}

export default EventCheckbox
