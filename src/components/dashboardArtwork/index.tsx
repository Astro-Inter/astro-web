import type { DashboardArtworkId } from '../../types/dashboard'

interface DashboardArtworkProps { artwork: DashboardArtworkId }
export default function DashboardArtwork({ artwork }: DashboardArtworkProps) {
  return <svg aria-hidden="true" viewBox="0 0 128 88" fill="none" data-artwork={artwork}>
    <rect x="1" y="1" width="126" height="86" rx="12" className="dashboard-art-board" />
    <path d="M13 16H38M13 23H28" className="dashboard-art-muted" strokeWidth="3" strokeLinecap="round" />
    {artwork === 'overview' && <>
      <rect x="13" y="35" width="48" height="40" rx="5" className="dashboard-art-panel" /><rect x="68" y="35" width="47" height="40" rx="5" className="dashboard-art-panel" />
      <circle cx="37" cy="55" r="12" className="dashboard-art-ring" strokeWidth="5" /><path d="M37 43A12 12 0 0 1 49 55" className="dashboard-art-line" strokeWidth="5" strokeLinecap="round" />
      <path d="M80 66V56M91 66V50M102 66V44" className="dashboard-art-line" strokeWidth="6" strokeLinecap="round" />
    </>}
    {artwork === 'trends' && <>
      <rect x="13" y="35" width="48" height="40" rx="5" className="dashboard-art-panel" /><rect x="68" y="35" width="47" height="40" rx="5" className="dashboard-art-panel" />
      <path d="M21 64L31 56L40 59L52 44M76 64L84 60L95 48L107 52" className="dashboard-art-line" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="52" cy="44" r="3" className="dashboard-art-accent" />
    </>}
    {artwork === 'bars' && <>
      <path d="M16 74H112" className="dashboard-art-muted" strokeWidth="2" />
      {[22, 40, 58, 76, 94].map((x, i) => <rect key={x} x={x} y={[55, 41, 49, 32, 39][i]} width="11" height={[17, 31, 23, 40, 33][i]} rx="3" className={i % 2 ? 'dashboard-art-accent' : 'dashboard-art-muted-fill'} />)}
    </>}
    {artwork === 'donut' && <>
      <circle cx="44" cy="54" r="20" className="dashboard-art-ring" strokeWidth="9" /><path d="M44 34A20 20 0 1 1 24 54" className="dashboard-art-line" strokeWidth="9" strokeLinecap="round" />
      <path d="M80 41H109M80 54H101M80 67H105" className="dashboard-art-muted" strokeWidth="5" strokeLinecap="round" />
    </>}
    {artwork === 'area' && <>
      <path d="M16 70L35 59L53 63L75 42L95 47L112 31V74H16Z" className="dashboard-art-panel" />
      <path d="M16 70L35 59L53 63L75 42L95 47L112 31" className="dashboard-art-line" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </>}
    {artwork === 'progress' && <>
      {[37, 53, 69].map((y, i) => <g key={y}><rect x="16" y={y} width="96" height="7" rx="3.5" className="dashboard-art-panel" /><rect x="16" y={y} width={[72, 46, 86][i]} height="7" rx="3.5" className={i === 1 ? 'dashboard-art-muted-fill' : 'dashboard-art-accent'} /></g>)}
    </>}
    {artwork === 'comparison' && <>
      {[23, 56, 89].map((x, i) => <g key={x}><rect x={x} y={[48, 34, 42][i]} width="9" height={[26, 40, 32][i]} rx="2" className="dashboard-art-accent" /><rect x={x + 12} y={[57, 47, 35][i]} width="9" height={[17, 27, 39][i]} rx="2" className="dashboard-art-muted-fill" /></g>)}
    </>}
    {artwork === 'scatter' && <>
      <path d="M17 32V74H113" className="dashboard-art-muted" strokeWidth="2" />
      {[[29, 63], [43, 57], [51, 65], [62, 46], [77, 50], [87, 36], [104, 42]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="4" className="dashboard-art-accent" />)}
    </>}
    {artwork === 'activity' && <>
      <path d="M15 55H32L41 36L53 73L66 43L76 56H112" className="dashboard-art-line" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 75H112" className="dashboard-art-muted" strokeWidth="2" />
    </>}
    {artwork === 'metrics' && <>
      {[16, 52, 88].map((x, i) => <g key={x}><rect x={x} y="34" width="27" height="41" rx="5" className="dashboard-art-panel" /><path d={`M${x + 7} 63V${[48, 43, 52][i]}H${x + 13}V63M${x + 7} 68H${x + 20}`} className="dashboard-art-line" strokeWidth="3" strokeLinecap="round" /></g>)}
    </>}
  </svg>
}
