interface ToggleSwitchProps {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}

function ToggleSwitch({ checked, label, onChange }: ToggleSwitchProps) {
  return (
    <label className="astro-toggle-switch">
      <input
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <svg aria-hidden="true" focusable="false" viewBox="0 0 68 33">
        <rect width="68" height="33" rx="16.5" />
        <circle cx="16.5" cy="16.5" r="10.5" />
      </svg>
    </label>
  )
}

export default ToggleSwitch
