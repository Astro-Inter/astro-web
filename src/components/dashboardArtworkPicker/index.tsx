import type { DashboardArtworkId } from '../../types/dashboard'
import { dashboardArtworks } from '../../data/dashboardArtwork'
import DashboardArtwork from '../dashboardArtwork'

interface DashboardArtworkPickerProps { value: DashboardArtworkId; onChange: (value: DashboardArtworkId) => void; disabled?: boolean }
export default function DashboardArtworkPicker({ value, onChange, disabled }: DashboardArtworkPickerProps) {
  return <fieldset className="dashboard-artwork-picker" disabled={disabled}>
    <legend>Ilustração do card</legend>
    <div className="dashboard-artwork-options">{dashboardArtworks.map(option => <label key={option.id} className="dashboard-artwork-option">
      <input type="radio" name="dashboard-artwork" value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} />
      <span className="dashboard-artwork-choice"><DashboardArtwork artwork={option.id} /><span>{option.label}</span></span>
    </label>)}</div>
  </fieldset>
}
